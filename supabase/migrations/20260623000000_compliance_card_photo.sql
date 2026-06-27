-- Surface the card photo on the gate-verify screen.
--
-- A medic asked to SEE the photo of the actual safety card at the gate, not
-- just a "VALID" badge. The photo already lives in credentials.photo_url
-- (private "ticket-photos" bucket) but worker_compliance_for_site never
-- returned it, so no screen could show it.
--
-- This redefines that function to add `photo_url` to each compliance row.
-- Additive + backward-compatible: callers that ignore the new field are
-- unaffected. Everything else in the function is byte-for-byte the original
-- from 20260519000000_init.sql.
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
begin
  -- AuthZ: caller must be a medic for this site (or the worker themself).
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

  -- Latest credential of each type (by issue_date) for this worker.
  select jsonb_agg(c order by c.expiry_date desc nulls last)
    into v_credentials
  from (
    select distinct on (c.credential_type)
      c.id, c.credential_type, c.issuer, c.certificate_number,
      c.validation_code, c.external_verification_url,
      c.holder_name, c.issue_date, c.expiry_date,
      c.verification_status, c.verification_method,
      c.verified_at, c.verified_by, c.photo_url   -- NEW: card photo on each ticket
    from credentials c
    where c.worker_id = p_worker_id
    order by c.credential_type, c.issue_date desc nulls last
  ) c;

  v_credentials := coalesce(v_credentials, '[]'::jsonb);

  -- Compute compliance per required credential.
  select jsonb_agg(jsonb_build_object(
    'credential_type', req_type,
    'status', case
      when latest.id is null then 'MISSING'
      when latest.expiry_date is not null and latest.expiry_date < current_date then 'EXPIRED'
      else 'VALID'
    end,
    'credential_id', latest.id,
    'expiry_date', latest.expiry_date,
    'verification_status', latest.verification_status,
    'external_verification_url', latest.external_verification_url,
    'photo_url', latest.photo_url            -- NEW: photo of the physical card
  ))
    into v_compliance
  from unnest(v_required) as req_type
  left join lateral (
    select c.id, c.expiry_date, c.verification_status,
           c.external_verification_url, c.photo_url   -- NEW
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
