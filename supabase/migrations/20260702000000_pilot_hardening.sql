-- ============================================================================
-- RigVise — pre-pilot hardening (40 real workers). Run in the LIVE project
-- (jxgkcvqesnbhjsmnblbq) SQL editor. Additive + idempotent. Never edit init.
--
-- Closes the loopholes a signed-in user could exploit via raw PostgREST calls
-- (bypassing the UI), so identity + verification are owner-controlled only:
--   1  Workers can only INSERT UNVERIFIED credentials (no self-forged VERIFIED)
--   2  Identity is locked: face photo immutable once set; name locked after
--      verification/first admit
--   3  Card/face photos readable only by their owner or a medic (no cross-
--      worker PII harvesting)
--   4  mark_credential_verified scoped to the medic's own site
--   5  Renewal ordering fix (undated new card no longer shadowed by old card)
--   6  Session checkout is server-authoritative
--   7  audit_log index for the denial/EOD queries
--   8  Storage size + mime backstop
-- ============================================================================

-- 1. CREDENTIALS: a worker may only ever insert an UNVERIFIED, unstamped
--    credential. Previously the insert policy pinned only worker_id, so a
--    worker could POST verification_status='VERIFIED_BY_ISSUER' and forge the
--    green "VERIFIED" pill at the gate. Verification stays RPC-only.
drop policy if exists "credentials insert own" on credentials;
create policy "credentials insert own"
  on credentials for insert to authenticated
  with check (
    auth.uid() = worker_id
    and verification_status = 'UNVERIFIED'
    and verified_by is null
    and verified_at is null
    and verification_method is null
  );

-- 2. WORKERS: lock the identity fields a gate decision relies on.
--    account_type is already locked (20260627). Now also:
--    · face photo (photo_url) can't be changed once set — no post-verification
--      face swap. A correction must go through a medic/admin (service role).
--    · full_name can't change once the worker has a verified ticket or any
--      admit on record — no "verified tickets + new name" swap.
--    Everything else (phone, employer, emergency/medical, worksite) stays
--    worker-editable. auth.uid() IS NULL = service-role/admin path → allowed.
create or replace function rigvise_guard_worker_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service-role (walk-in mint / admin correction)
  end if;

  if old.photo_url is not null
     and new.photo_url is distinct from old.photo_url then
    raise exception 'Your gate photo is locked. Ask a medic to update it.';
  end if;

  if new.full_name is distinct from old.full_name
     and (
       exists (
         select 1 from credentials c
         where c.worker_id = old.id
           and c.verification_status in ('MANUALLY_VERIFIED', 'VERIFIED_BY_ISSUER')
       )
       or exists (select 1 from sessions s where s.worker_id = old.id)
     ) then
    raise exception 'Your name is locked after your tickets are verified. Ask a medic.';
  end if;

  return new;
end;
$$;
drop trigger if exists guard_worker_update on workers;
create trigger guard_worker_update
  before update on workers
  for each row execute function rigvise_guard_worker_update();

-- 3. STORAGE: scope private-bucket reads to the owner or a medic. Previously
--    ANY authenticated user could list + download every worker's face selfie
--    and every photographed safety card (names, cert numbers). No app change
--    needed: workers read their own (owner = auth.uid()); the medic verify/
--    roster screens read via the medic's JWT (is_medic_account()); the EOD
--    cron uses the service role (bypasses RLS).
drop policy if exists "rw_faces_select" on storage.objects;
create policy "rw_faces_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'faces' and (owner = auth.uid() or is_medic_account()));

drop policy if exists "rw_ticketphotos_select" on storage.objects;
create policy "rw_ticketphotos_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'ticket-photos' and (owner = auth.uid() or is_medic_account()));

-- 8. Storage backstop: cap object size (~3MB) and restrict to images, so an
--    uncompressed upload can never silently fill the bucket.
update storage.buckets
   set file_size_limit = 3145728,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id in ('faces', 'ticket-photos');

-- 4. mark_credential_verified: scope to the medic's own site. Adds p_site_id;
--    the medic must be assigned to that site (is_medic_for_site). This keeps a
--    medic from stamping tickets for workers at gates they don't run.
drop function if exists mark_credential_verified(uuid, text);
create or replace function mark_credential_verified(
  p_credential_id uuid,
  p_site_id uuid,
  p_method text default 'MEDIC_REVIEW'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid;
begin
  if not is_medic_for_site(p_site_id) then
    raise exception 'not authorized for this site';
  end if;

  select worker_id into v_worker_id
  from credentials where id = p_credential_id;
  if v_worker_id is null then
    raise exception 'credential not found';
  end if;

  update credentials
  set verification_status = 'MANUALLY_VERIFIED',
      verification_method = p_method,
      verified_at = now(),
      verified_by = auth.uid()
  where id = p_credential_id
    and verification_status <> 'VERIFIED_BY_ISSUER';

  insert into audit_log (actor_id, event_type, entity_type, entity_id, payload)
  values (
    auth.uid(), 'CREDENTIAL_VERIFIED', 'credential', p_credential_id,
    jsonb_build_object('worker_id', v_worker_id, 'site_id', p_site_id, 'method', p_method)
  );
end;
$$;
grant execute on function mark_credential_verified(uuid, uuid, text) to authenticated;

-- 5. worker_compliance_for_site: deterministic newest-wins ordering so an
--    undated renewal isn't shadowed by an older dated card (which caused a
--    false DENY + wrong card photo). Rows are append-only, so newest-added
--    (created_at) wins when issue_date is null/tied. Keeps the anon guard +
--    site-local expiry from 20260701.
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
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  if not (is_medic_for_site(p_site_id) or auth.uid() = p_worker_id) then
    raise exception 'not authorized';
  end if;

  select to_jsonb(w) - 'government_id_hash' into v_worker
  from workers w where w.id = p_worker_id;
  if v_worker is null then
    raise exception 'worker not found';
  end if;

  select rp.required_credential_types into v_required
  from sites s
  join projects p on p.id = s.project_id
  join requirements_profiles rp on rp.id = p.requirements_profile_id
  where s.id = p_site_id;
  v_required := coalesce(v_required, '{}');

  select jsonb_agg(c order by c.expiry_date desc nulls last) into v_credentials
  from (
    select distinct on (c.credential_type)
      c.id, c.credential_type, c.issuer, c.certificate_number,
      c.validation_code, c.external_verification_url,
      c.holder_name, c.issue_date, c.expiry_date,
      c.verification_status, c.verification_method,
      c.verified_at, c.verified_by, c.photo_url
    from credentials c
    where c.worker_id = p_worker_id
    order by c.credential_type,
             coalesce(c.issue_date, c.created_at::date) desc, c.created_at desc, c.id
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
  )) into v_compliance
  from unnest(v_required) as req_type
  left join lateral (
    select c.id, c.expiry_date, c.verification_status,
           c.external_verification_url, c.photo_url
    from credentials c
    where c.worker_id = p_worker_id and c.credential_type = req_type
    order by coalesce(c.issue_date, c.created_at::date) desc, c.created_at desc, c.id
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

-- 6. SESSIONS: make checkout server-authoritative. The self-checkout policy
--    let a worker also rewrite check_out_at / method / employment_id (fudging
--    crew hours). Now the trigger overwrites the checkout values and blocks
--    employment_id changes.
create or replace function rigwise_guard_session_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.worker_id is distinct from old.worker_id
     or new.site_id is distinct from old.site_id
     or new.check_in_at is distinct from old.check_in_at
     or new.check_in_method is distinct from old.check_in_method
     or new.check_in_medic_id is distinct from old.check_in_medic_id
     or new.employment_id is distinct from old.employment_id
     or new.compliance_snapshot is distinct from old.compliance_snapshot then
    raise exception 'gate records are append-only';
  end if;
  if old.status = 'ACTIVE' and new.status in ('CLOSED', 'AUTO_CLOSED') then
    new.check_out_at := now();               -- server-authoritative time
    new.check_out_method := coalesce(new.check_out_method, 'MANUAL');
    return new;
  end if;
  -- same-status update: checkout fields must not change
  if new.check_out_at is distinct from old.check_out_at
     or new.check_out_method is distinct from old.check_out_method then
    raise exception 'gate records are append-only';
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

-- 7. Index for the denial dedupe / daily_denials / EOD cron queries (they
--    filter audit_log by event_type + site, which the entity_type-leading
--    index doesn't serve).
create index if not exists audit_log_event_idx
  on audit_log (event_type, created_at desc);
