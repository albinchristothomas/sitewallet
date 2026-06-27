-- ============================================================================
-- RigWise — finishing migration: gate denials, medic-by-email, optional
-- tickets, EOD recipient + send log.
-- Additive + idempotent. Run in the LIVE project (jxgkcvqesnbhjsmnblbq) SQL
-- editor. NEVER edit 20260519000000_init.sql (re-running it drops everything).
-- ============================================================================

-- 1. Record a gate DENIAL. Mirrors admit_worker's guards, but writes to the
--    existing audit_log ledger — a deny must NOT create a session row (that
--    would corrupt on-site counts, roster and crew-hours). audit_log has RLS
--    enabled with no policies, so this SECURITY DEFINER fn is the only writer.
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
  v_event_id uuid := gen_random_uuid();
begin
  if not is_medic_for_site(p_site_id) then
    raise exception 'not authorized';
  end if;
  if p_worker_id = auth.uid() then
    raise exception 'medic cannot deny themselves';
  end if;
  insert into audit_log (id, actor_id, event_type, entity_type, entity_id, payload)
  values (
    v_event_id, auth.uid(), 'WORKER_DENIED', 'worker', p_worker_id,
    jsonb_build_object('site_id', p_site_id, 'reason', p_reason)
  );
  return v_event_id;
end;
$$;
grant execute on function deny_worker(uuid, uuid, text) to authenticated;

-- 2. Read today's denials for a site (audit_log has no SELECT policy, so reads
--    go through a SECURITY DEFINER fn gated on is_medic_for_site — same pattern
--    as daily_roster).
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
    and a.created_at::date = p_day
    and is_medic_for_site(p_site_id)
  order by a.created_at desc;
$$;
grant execute on function daily_denials(uuid, date) to authenticated;

-- 3. Resolve a MEDIC account by email. Email lives on auth.users (workers has
--    no email column), so this SECURITY DEFINER fn joins auth.users without
--    granting any caller direct access to it.
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
  where lower(u.email) = lower(trim(p_email))
    and w.account_type = 'MEDIC'
  limit 1;
$$;
grant execute on function resolve_medic_id_by_email(text) to authenticated;

-- 4. Optional (nice-to-have) credentials per site, and the EOD report recipient.
alter table requirements_profiles
  add column if not exists optional_credential_types text[] not null default '{}';

alter table sites
  add column if not exists eod_recipient_email text;

-- 5. EOD send log — lets the daily cron send exactly one report per site/day.
create table if not exists eod_sent_log (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  report_day date not null,
  recipient text,
  sent_at timestamptz not null default now(),
  unique (site_id, report_day)
);
alter table eod_sent_log enable row level security;
-- No policies on purpose: only the service-role cron (which bypasses RLS)
-- reads/writes this table.
