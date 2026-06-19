-- RigWise — foundation for the medic-first rebuild.
--
-- Adds the minimum schema + storage needed for: medic walk-in worker minting,
-- worker selfies, walk-in face capture, and card photos. Additive + idempotent;
-- never edit 20260519000000_init.sql (re-running it drops workers and would
-- lose these columns).
--
-- NOTE: workers.photo_url and credentials.photo_url already exist in init.sql,
-- so we do NOT re-add them. workers.photo_url holds the worker's FACE (selfie
-- or medic-captured walk-in face). credentials.photo_url holds the card photo.

-- ----------------------------------------------------------------
-- 1. Columns
-- ----------------------------------------------------------------

-- Who minted this worker, if a medic created them as a walk-in (null for
-- self-registered workers). Provenance for the gate audit trail.
alter table workers
  add column if not exists created_by_medic_id uuid references workers(id);

-- Single free-text muster point per site (MVP — we do not wire the
-- muster_points 1-to-many table this week). Surfaced on the site dashboard
-- and the EOD report as the emergency assembly location.
alter table sites
  add column if not exists muster_point text;

comment on column workers.created_by_medic_id is
  'If set, the medic who created this worker as a walk-in. Null for self-registered workers.';
comment on column sites.muster_point is
  'Free-text emergency assembly point for the site. Pinned on the medic dashboard and EOD report.';

-- ----------------------------------------------------------------
-- 2. Private storage buckets
--    faces        — worker selfies + medic-captured walk-in faces
--    ticket-photos — photos of physical safety cards
-- Both PRIVATE; the app serves them via short-lived signed URLs.
-- ----------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('faces', 'faces', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('ticket-photos', 'ticket-photos', false)
on conflict (id) do nothing;

-- Policies. Any authenticated user (worker or medic) may upload to and read
-- from these buckets. Buckets are private and paths are app-controlled, so
-- this is acceptable for the test cohort. Tighten to per-owner / per-site
-- scoping when we harden post-pilot.
-- Drop-then-create keeps this migration re-runnable.

drop policy if exists "rw_faces_insert" on storage.objects;
create policy "rw_faces_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'faces');

drop policy if exists "rw_faces_select" on storage.objects;
create policy "rw_faces_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'faces');

drop policy if exists "rw_ticketphotos_insert" on storage.objects;
create policy "rw_ticketphotos_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-photos');

drop policy if exists "rw_ticketphotos_select" on storage.objects;
create policy "rw_ticketphotos_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'ticket-photos');
