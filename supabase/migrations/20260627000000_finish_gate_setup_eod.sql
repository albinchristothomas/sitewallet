-- ============================================================================
-- RigWise — FINAL consolidation migration.
-- Run this ONE file in the LIVE project (jxgkcvqesnbhjsmnblbq) SQL editor.
-- It is additive + idempotent and also supersedes 20260623 (the card-photo
-- function) — pasting this alone brings the database fully current.
-- NEVER re-run 20260519000000_init.sql (it drops everything).
--
-- Contents:
--   1  is_medic_account() helper (recursion-safe role check)
--   2  worker_compliance_for_site — card photos + site-local expiry day
--   3  deny_worker — record gate denials (deduped per site-local day)
--   4  daily_denials — read back a site's denials for a day
--   5  daily_roster — site-local day + per-row compliant flag (override audit)
--   6  admit_worker v2 — same-site/same-day reuse; auto-closes stale sessions
--   7  resolve_medic_id_by_email — medic-only lookup (no email enumeration)
--   8  assign_medic_to_site — safe assignment path (replaces open INSERT)
--   9  Lock account_type (one email = one role, enforced in the DB)
--  10  Sessions are append-only for workers except self-checkout
--  11  Optional credentials + EOD recipient + send log
-- ============================================================================

-- 1. Recursion-safe "is the caller a MEDIC account" check. Policies on
--    `workers` cannot subquery `workers` directly (infinite RLS recursion) —
--    this SECURITY DEFINER helper bypasses RLS for the check.
create or replace function is_medic_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workers
    where id = auth.uid() and account_type = 'MEDIC'
  );
$$;
grant execute on function is_medic_account() to authenticated;

-- Medics need to read basic worker rows (names, employer) for rosters,
-- reports, incidents and walk-ins. Workers still only see themselves.
drop policy if exists "workers select for medics" on workers;
create policy "workers select for medics"
  on workers for select to authenticated
  using (is_medic_account());

-- 2. Compliance payload: adds each ticket's card photo (photo_url) and uses
--    the SITE-LOCAL (America/Edmonton) date for expiry — the DB runs UTC, so
--    current_date flips at ~5 pm Alberta time otherwise.
create or replace function worker_compliance_for_site(p_worker_id uuid, p_site_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_worker jsonb;
  v_required text[];
  v_credentials jsonb;
  v_compliance jsonb;
  v_now timestamptz := now();
  v_site_today date := (now() at time zone 'America/Edmonton')::date;
begin
  if not (is_medic_for_site(p_site_id) or auth.uid() = p_worker_id) then
    raise exception 'not authorized';
  end if;

  select to_jsonb(w) - 'government_id_hash'
    into v_worker
  from workers w
  where w.id = p_worker_id;

  if v_worker is null then
    raise exception 'worker not found';
  end if;

  select rp.required_credential_types
    into v_required
  from sites s
  join projects p on p.id = s.project_id
  join requirements_profiles rp on rp.id = p.requirements_profile_id
  where s.id = p_site_id;

  v_required := coalesce(v_required, '{}');

  select jsonb_agg(c order by c.expiry_date desc nulls last)
    into v_credentials
  from (
    select distinct on (c.credential_type)
      c.id, c.credential_type, c.issuer, c.certificate_number,
      c.validation_code, c.external_verification_url,
      c.holder_name, c.issue_date, c.expiry_date,
      c.verification_status, c.verification_method,
      c.verified_at, c.verified_by, c.photo_url
    from credentials c
    where c.worker_id = p_worker_id
    order by c.credential_type, c.issue_date desc nulls last
  ) c;

  v_credentials := coalesce(v_credentials, '[]'::jsonb);

  select jsonb_agg(jsonb_build_object(
    'credential_type', req_type,
    'status', case
      when latest.id is null then 'MISSING'
      when latest.expiry_date is not null and latest.expiry_date < v_site_today then 'EXPIRED'
      else 'VALID'
    end,
    'credential_id', latest.id,
    'expiry_date', latest.expiry_date,
    'verification_status', latest.verification_status,
    'external_verification_url', latest.external_verification_url,
    'photo_url', latest.photo_url
  ))
    into v_compliance
  from unnest(v_required) as req_type
  left join lateral (
    select c.id, c.expiry_date, c.verification_status,
           c.external_verification_url, c.photo_url
    from credentials c
    where c.worker_id = p_worker_id
      and c.credential_type = req_type
    order by c.issue_date desc nulls last
    limit 1
  ) latest on true;

  return jsonb_build_object(
    'worker', v_worker,
    'required', v_required,
    'credentials', v_credentials,
    'compliance', coalesce(v_compliance, '[]'::jsonb),
    'evaluated_at', v_now
  );
end;
$$;

-- 3. Record a gate DENIAL in the audit_log ledger. A deny never creates a
--    session row (that would corrupt on-site counts / roster / crew-hours).
--    Deduped: one denial per worker+site per site-local day (tapping Deny
--    twice doesn't inflate the count).
create or replace function deny_worker(
  p_worker_id uuid,
  p_site_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if not is_medic_for_site(p_site_id) then
    raise exception 'not authorized';
  end if;
  if p_worker_id = auth.uid() then
    raise exception 'medic cannot deny themselves';
  end if;

  select a.id into v_event_id
  from audit_log a
  where a.event_type = 'WORKER_DENIED'
    and a.entity_id = p_worker_id
    and (a.payload->>'site_id')::uuid = p_site_id
    and (a.created_at at time zone 'America/Edmonton')::date
        = (now() at time zone 'America/Edmonton')::date
  limit 1;
  if v_event_id is not null then
    return v_event_id;
  end if;

  v_event_id := gen_random_uuid();
  insert into audit_log (id, actor_id, event_type, entity_type, entity_id, payload)
  values (
    v_event_id, auth.uid(), 'WORKER_DENIED', 'worker', p_worker_id,
    jsonb_build_object('site_id', p_site_id, 'reason', p_reason)
  );
  return v_event_id;
end;
$$;
grant execute on function deny_worker(uuid, uuid, text) to authenticated;

-- 4. Read a site's denials for a site-local day (audit_log has no SELECT
--    policy; reads go through this gated fn — same pattern as daily_roster).
create or replace function daily_denials(p_site_id uuid, p_day date)
returns table (
  worker_id uuid,
  worker_name text,
  reason text,
  denied_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.entity_id as worker_id,
    w.full_name as worker_name,
    a.payload->>'reason' as reason,
    a.created_at as denied_at
  from audit_log a
  left join workers w on w.id = a.entity_id
  where a.event_type = 'WORKER_DENIED'
    and (a.payload->>'site_id')::uuid = p_site_id
    and (a.created_at at time zone 'America/Edmonton')::date = p_day
    and is_medic_for_site(p_site_id)
  order by a.created_at desc;
$$;
grant execute on function daily_denials(uuid, date) to authenticated;

-- 5. Daily roster: site-local day + a `compliant` flag per row so the report
--    can mark OVERRIDE admissions (admitted despite expired/missing tickets)
--    instead of stamping everyone "VALID".
drop function if exists daily_roster(uuid, date);
create or replace function daily_roster(p_site_id uuid, p_day date)
returns table (
  session_id uuid,
  worker_id uuid,
  worker_name text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  duration_minutes int,
  status session_status,
  compliant boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.worker_id,
    w.full_name,
    s.check_in_at,
    s.check_out_at,
    case
      when s.check_out_at is not null
      then extract(epoch from (s.check_out_at - s.check_in_at))::int / 60
      else null
    end as duration_minutes,
    s.status,
    not exists (
      select 1
      from jsonb_array_elements(coalesce(s.compliance_snapshot->'compliance', '[]'::jsonb)) e
      where e->>'status' <> 'VALID'
    ) as compliant
  from sessions s
  join workers w on w.id = s.worker_id
  where s.site_id = p_site_id
    and (s.check_in_at at time zone 'America/Edmonton')::date = p_day
    and is_medic_for_site(p_site_id)
  order by s.check_in_at desc;
$$;

-- 6. admit_worker v2. The original reused ANY ACTIVE session for the worker
--    (no site/day filter) — a walk-in who can never self-checkout stayed
--    ACTIVE forever, so the next day's admit silently no-opped and the worker
--    vanished from that day's roster. Now: reuse only a same-site session from
--    the same site-local day; auto-close anything else, then insert fresh.
create or replace function admit_worker(p_worker_id uuid, p_site_id uuid, p_snapshot jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if not is_medic_for_site(p_site_id) then
    raise exception 'not authorized';
  end if;
  if p_worker_id = auth.uid() then
    raise exception 'medic cannot admit themselves';
  end if;
  if not exists (
    select 1 from workers
    where id = p_worker_id and account_type = 'WORKER'
  ) then
    raise exception 'only worker accounts can be scanned in';
  end if;

  -- Same site, same site-local day → this is the same visit; return it.
  select id into v_session_id
  from sessions
  where worker_id = p_worker_id
    and site_id = p_site_id
    and status = 'ACTIVE'
    and (check_in_at at time zone 'America/Edmonton')::date
        = (now() at time zone 'America/Edmonton')::date
  limit 1;
  if v_session_id is not null then
    return v_session_id;
  end if;

  -- Stale ACTIVE sessions (other sites / previous days) get auto-closed so
  -- they stop blocking new admissions and stop inflating on-site counts.
  update sessions
     set status = 'AUTO_CLOSED',
         check_out_at = coalesce(check_out_at, now()),
         check_out_method = 'BULK'
   where worker_id = p_worker_id
     and status = 'ACTIVE';

  insert into sessions (worker_id, site_id, check_in_method, check_in_medic_id, compliance_snapshot, status)
  values (p_worker_id, p_site_id, 'QR_SCAN', auth.uid(), p_snapshot, 'ACTIVE')
  returning id into v_session_id;

  insert into audit_log (actor_id, event_type, entity_type, entity_id, payload)
  values (
    auth.uid(), 'WORKER_ADMITTED', 'session', v_session_id,
    jsonb_build_object('worker_id', p_worker_id, 'site_id', p_site_id)
  );

  return v_session_id;
end;
$$;

-- 7. Resolve a MEDIC account by email (email lives on auth.users). Gated to
--    MEDIC callers so worker accounts can't enumerate medic emails.
create or replace function resolve_medic_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select w.id
  from workers w
  join auth.users u on u.id = w.id
  where is_medic_account()
    and lower(u.email) = lower(trim(p_email))
    and w.account_type = 'MEDIC'
  limit 1;
$$;
grant execute on function resolve_medic_id_by_email(text) to authenticated;

-- 8. Safe assignment path. The Phase-1 INSERT policy was `with check (true)`
--    — ANY authenticated account could assign any medic to any site
--    (privilege escalation: read that site's rosters, admit workers). Drop it
--    and route all assignment through this guarded fn:
--      · caller must be a MEDIC account
--      · target must be a MEDIC account
--      · caller must already be a medic on the site, or the site must be
--        brand-new with no medics yet (the create-site bootstrap).
drop policy if exists "medic_assignments insert authenticated" on medic_assignments;

create or replace function assign_medic_to_site(p_medic_id uuid, p_site_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_medic_account() then
    raise exception 'not authorized';
  end if;
  if not exists (
    select 1 from workers where id = p_medic_id and account_type = 'MEDIC'
  ) then
    raise exception 'that account is not a medic';
  end if;
  if not (
    is_medic_for_site(p_site_id)
    or not exists (select 1 from medic_assignments where site_id = p_site_id)
  ) then
    raise exception 'only a medic already on this site can add others';
  end if;

  insert into medic_assignments (medic_id, site_id)
  values (p_medic_id, p_site_id)
  on conflict (medic_id, site_id) do nothing;
end;
$$;
grant execute on function assign_medic_to_site(uuid, uuid) to authenticated;

-- Medics on a site can see who else is assigned there (the admin page's
-- medic list only ever showed the viewer before).
drop policy if exists "medic_assignments select site medics" on medic_assignments;
create policy "medic_assignments select site medics"
  on medic_assignments for select to authenticated
  using (is_medic_for_site(site_id));

-- 9. One email = one role — enforced in the database, not just the proxy.
--    The `workers update own` policy would otherwise let a WORKER flip their
--    own account_type to MEDIC with a raw PostgREST call.
create or replace function rigwise_lock_account_type()
returns trigger
language plpgsql
as $$
begin
  if new.account_type is distinct from old.account_type then
    raise exception 'account role is locked';
  end if;
  return new;
end;
$$;
drop trigger if exists lock_account_type on workers;
create trigger lock_account_type
  before update on workers
  for each row execute function rigwise_lock_account_type();

-- 10. Gate records are append-only for workers. The `sessions update own`
--     policy exists so a worker can self-checkout — but as written it let
--     them rewrite check_in_at / compliance_snapshot too. This trigger
--     restricts authenticated updates to exactly the checkout transition.
--     (auth.uid() is null for service-role / cron paths — unrestricted.)
create or replace function rigwise_guard_session_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.worker_id      is distinct from old.worker_id
     or new.site_id     is distinct from old.site_id
     or new.check_in_at is distinct from old.check_in_at
     or new.check_in_method is distinct from old.check_in_method
     or new.check_in_medic_id is distinct from old.check_in_medic_id
     or new.compliance_snapshot is distinct from old.compliance_snapshot then
    raise exception 'gate records are append-only';
  end if;
  if old.status = 'ACTIVE' and new.status in ('CLOSED', 'AUTO_CLOSED') then
    return new; -- legitimate checkout
  end if;
  if new.status is distinct from old.status then
    raise exception 'invalid session transition';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_session_update on sessions;
create trigger guard_session_update
  before update on sessions
  for each row execute function rigwise_guard_session_update();

-- 11. Optional (nice-to-have) credentials per site, EOD recipient, send log.
alter table requirements_profiles
  add column if not exists optional_credential_types text[] not null default '{}';

alter table sites
  add column if not exists eod_recipient_email text;

create table if not exists eod_sent_log (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  report_day date not null,
  recipient text,
  sent_at timestamptz not null default now(),
  unique (site_id, report_day)
);
alter table eod_sent_log enable row level security;
-- No policies on purpose: only the service-role cron (bypasses RLS) uses it.
