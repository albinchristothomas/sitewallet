-- Security fix: worker_compliance_for_site could be called ANONYMOUSLY.
--
-- With no session, auth.uid() is NULL, so `auth.uid() = p_worker_id` is NULL
-- and `IF NOT (false OR NULL)` does not raise — the guard silently passed and
-- an unauthenticated caller holding a worker's UUID (which is exactly what
-- the QR encodes) could read their name + full ticket list.
--
-- Fix: reject anonymous callers outright, before anything else.
-- (Verified live: the other RPCs are unaffected — their guards evaluate to a
-- real boolean and raise correctly.)
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
  -- Anonymous callers are always rejected (NULL-safe guard).
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
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
