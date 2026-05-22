-- SiteWallet — Phase 1 core schema
-- Worker-centric data model. Credentials are append-only. Sessions are check-in/check-out pairs.

-- =============================================================================
-- Enums
-- =============================================================================

create type verification_status as enum (
  'VERIFIED_BY_ISSUER',
  'MANUALLY_VERIFIED',
  'UNVERIFIED',
  'REJECTED'
);

create type company_type as enum (
  'OPERATOR',
  'SERVICE_COMPANY',
  'CONTRACTOR',
  'MEDIC_FIRM'
);

create type session_status as enum (
  'ACTIVE',
  'CLOSED',
  'AUTO_CLOSED',
  'ANOMALY',
  'VOIDED'
);

create type check_method as enum (
  'QR_SCAN',
  'MANUAL',
  'GEOFENCE',
  'BULK'
);

create type worker_role as enum (
  'WORKER',
  'MEDIC',
  'OPERATOR_ADMIN'
);

create type permit_type as enum (
  'HOT_WORK',
  'CONFINED_SPACE',
  'LOCKOUT_TAGOUT',
  'WORKING_AT_HEIGHTS',
  'EXCAVATION',
  'GENERAL'
);

-- =============================================================================
-- Tables
-- =============================================================================

-- Workers: persistent identity. 1:1 with auth.users.
create table workers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  date_of_birth date,
  government_id_hash text,
  photo_url text,
  roles worker_role[] not null default array['WORKER']::worker_role[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Companies: operators, service companies, contractors, medic firms.
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type company_type not null,
  created_at timestamptz not null default now()
);

-- Employments: many-to-many between workers and companies, time-bounded.
create table employments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  company_id uuid not null references companies(id) on delete restrict,
  role text,
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now()
);

-- Credentials: append-only. Renewals are new rows, never UPDATE.
create table credentials (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  credential_type text not null,
  issuer text,
  certificate_number text,
  validation_code text,           -- printed code on the card (e.g. ESC: R8LQ3-TVNJ7-9JXGZ-0YGQG)
  holder_name text,
  issue_date date,
  expiry_date date,
  photo_url text,                 -- photo of the card itself
  source_document_url text,
  verification_status verification_status not null default 'UNVERIFIED',
  verified_at timestamptz,
  verified_by uuid references workers(id),
  created_at timestamptz not null default now()
);

-- Requirements profiles: lists of required credential types for a project.
create table requirements_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  required_credential_types text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Projects: persistent operational thing owned by an operator.
create table projects (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references companies(id) on delete restrict,
  name text not null,
  requirements_profile_id uuid references requirements_profiles(id),
  created_at timestamptz not null default now()
);

-- Sites: transient physical locations under a project.
create table sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  rig_name text,                  -- e.g. "Precision 555"
  rig_number text,                -- e.g. "555"
  lsd_location text,              -- legal land description (e.g. "12-34-067-25 W5M")
  lat numeric(9,6),
  lng numeric(9,6),
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now()
);

-- Medic-to-site assignments: who can scan workers into which site.
create table medic_assignments (
  id uuid primary key default gen_random_uuid(),
  medic_id uuid not null references workers(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (medic_id, site_id)
);

-- Sessions: gate check-in / check-out pairs.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete restrict,
  site_id uuid not null references sites(id) on delete restrict,
  employment_id uuid references employments(id),
  check_in_at timestamptz not null default now(),
  check_in_method check_method not null,
  check_in_medic_id uuid references workers(id),
  check_out_at timestamptz,
  check_out_method check_method,
  status session_status not null default 'ACTIVE',
  compliance_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Muster points: emergency assembly locations per site.
create table muster_points (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  description text,
  lat numeric(9,6),
  lng numeric(9,6),
  created_at timestamptz not null default now()
);

-- Work permits issued at site.
create table work_permits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  worker_id uuid not null references workers(id) on delete restrict,
  issued_by uuid not null references workers(id) on delete restrict,
  permit_type permit_type not null,
  description text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Audit log: immutable event stream.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references workers(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

create index credentials_worker_idx
  on credentials(worker_id, expiry_date desc);

create index credentials_worker_type_idx
  on credentials(worker_id, credential_type, issue_date desc);

create index sessions_worker_active_idx
  on sessions(worker_id, status) where status = 'ACTIVE';

create index sessions_site_active_idx
  on sessions(site_id, status) where status = 'ACTIVE';

create index sessions_site_date_idx
  on sessions(site_id, check_in_at desc);

create index employments_worker_idx
  on employments(worker_id, started_at desc);

create index audit_log_entity_idx
  on audit_log(entity_type, entity_id, created_at desc);

create index medic_assignments_medic_idx
  on medic_assignments(medic_id);

create index sites_search_idx
  on sites using gin (to_tsvector('english',
    coalesce(name,'') || ' ' || coalesce(rig_name,'') || ' ' || coalesce(rig_number,'')));

-- =============================================================================
-- Updated-at trigger
-- =============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workers_set_updated_at
  before update on workers
  for each row execute function set_updated_at();

-- =============================================================================
-- Helpers
-- =============================================================================

-- Returns true if the calling user has MEDIC role and an active assignment to site_id.
create or replace function is_medic_for_site(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from medic_assignments ma
    join workers w on w.id = ma.medic_id
    where ma.medic_id = auth.uid()
      and ma.site_id = target_site_id
      and 'MEDIC' = any(w.roles)
      and (ma.expires_at is null or ma.expires_at > now())
  );
$$;

-- =============================================================================
-- Row-Level Security
-- =============================================================================

alter table workers enable row level security;
alter table credentials enable row level security;
alter table employments enable row level security;
alter table sessions enable row level security;
alter table companies enable row level security;
alter table projects enable row level security;
alter table sites enable row level security;
alter table requirements_profiles enable row level security;
alter table audit_log enable row level security;
alter table medic_assignments enable row level security;
alter table muster_points enable row level security;
alter table work_permits enable row level security;

-- Workers: own row, plus medics can read workers they are scanning in (handled
-- via a view or RPC in practice; for Phase 1 we allow authenticated read of
-- minimal fields via a helper RPC, see below).
create policy "workers select own"
  on workers for select using (auth.uid() = id);

create policy "workers insert own"
  on workers for insert with check (auth.uid() = id);

create policy "workers update own"
  on workers for update using (auth.uid() = id);

-- Credentials: own only (for now). Medic compliance check goes through an RPC
-- with SECURITY DEFINER so the medic doesn't need direct SELECT here.
create policy "credentials select own"
  on credentials for select using (auth.uid() = worker_id);

create policy "credentials insert own"
  on credentials for insert with check (auth.uid() = worker_id);

-- Employments: own only.
create policy "employments select own"
  on employments for select using (auth.uid() = worker_id);

-- Sessions: worker reads own; medic reads sessions for sites they are assigned
-- to.
create policy "sessions select own"
  on sessions for select using (auth.uid() = worker_id);

create policy "sessions medic select assigned site"
  on sessions for select using (is_medic_for_site(site_id));

-- Worker can close their own active session.
create policy "sessions update own"
  on sessions for update using (auth.uid() = worker_id);

-- Reference tables readable to any authenticated user. Phase 2 will scope per
-- operator / per employment.
create policy "companies select all authenticated"
  on companies for select to authenticated using (true);

create policy "projects select all authenticated"
  on projects for select to authenticated using (true);

create policy "sites select all authenticated"
  on sites for select to authenticated using (true);

create policy "requirements_profiles select all authenticated"
  on requirements_profiles for select to authenticated using (true);

create policy "muster_points select all authenticated"
  on muster_points for select to authenticated using (true);

-- Phase 1: any authenticated user can create companies/projects/sites/etc. so
-- the demo flow works without a separate admin tier. Tighten in Phase 2.
create policy "companies insert authenticated"
  on companies for insert to authenticated with check (true);

create policy "projects insert authenticated"
  on projects for insert to authenticated with check (true);

create policy "sites insert authenticated"
  on sites for insert to authenticated with check (true);

create policy "requirements_profiles insert authenticated"
  on requirements_profiles for insert to authenticated with check (true);

create policy "muster_points insert authenticated"
  on muster_points for insert to authenticated with check (true);

create policy "medic_assignments insert authenticated"
  on medic_assignments for insert to authenticated with check (true);

create policy "medic_assignments select own"
  on medic_assignments for select using (auth.uid() = medic_id);

-- Work permits: worker reads own; medic at site can issue and read.
create policy "work_permits select own"
  on work_permits for select using (auth.uid() = worker_id);

create policy "work_permits medic select assigned"
  on work_permits for select using (is_medic_for_site(site_id));

create policy "work_permits medic insert assigned"
  on work_permits for insert with check (is_medic_for_site(site_id));

-- =============================================================================
-- RPCs the medic UI calls (security definer so they can read worker data
-- without granting broad SELECT).
-- =============================================================================

-- Lookup a worker's compliance against a site's requirements profile.
-- Returns a single jsonb with worker info, credentials, and pass/fail array.
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
      c.validation_code, c.holder_name, c.issue_date, c.expiry_date,
      c.verification_status
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
    'expiry_date', latest.expiry_date
  ))
    into v_compliance
  from unnest(v_required) as req_type
  left join lateral (
    select c.id, c.expiry_date
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

-- Create a session row (admit). Returns the created session id.
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

  -- If there is already an active session for this worker, return it.
  select id into v_session_id
  from sessions
  where worker_id = p_worker_id and status = 'ACTIVE'
  limit 1;

  if v_session_id is not null then
    return v_session_id;
  end if;

  insert into sessions (worker_id, site_id, check_in_method, check_in_medic_id, compliance_snapshot, status)
  values (p_worker_id, p_site_id, 'QR_SCAN', auth.uid(), p_snapshot, 'ACTIVE')
  returning id into v_session_id;

  insert into audit_log (actor_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), 'WORKER_ADMITTED', 'session', v_session_id,
          jsonb_build_object('worker_id', p_worker_id, 'site_id', p_site_id));

  return v_session_id;
end;
$$;

-- Active sessions on a site (for medic dashboard).
create or replace function active_sessions_for_site(p_site_id uuid)
returns table (
  session_id uuid,
  worker_id uuid,
  worker_name text,
  check_in_at timestamptz,
  compliance_snapshot jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.worker_id, w.full_name, s.check_in_at, s.compliance_snapshot
  from sessions s
  join workers w on w.id = s.worker_id
  where s.site_id = p_site_id
    and s.status = 'ACTIVE'
    and is_medic_for_site(p_site_id)
  order by s.check_in_at desc;
$$;

-- Daily roster for a site.
create or replace function daily_roster(p_site_id uuid, p_day date)
returns table (
  session_id uuid,
  worker_id uuid,
  worker_name text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  duration_minutes int,
  status session_status
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
    s.status
  from sessions s
  join workers w on w.id = s.worker_id
  where s.site_id = p_site_id
    and s.check_in_at::date = p_day
    and is_medic_for_site(p_site_id)
  order by s.check_in_at desc;
$$;

grant execute on function worker_compliance_for_site(uuid, uuid) to authenticated;
grant execute on function admit_worker(uuid, uuid, jsonb) to authenticated;
grant execute on function active_sessions_for_site(uuid) to authenticated;
grant execute on function daily_roster(uuid, date) to authenticated;

-- =============================================================================
-- Storage bucket for credential photos and worker selfies.
-- Create via Supabase dashboard if not auto-created:
--   bucket: credential-photos (private)
-- =============================================================================
