-- Ticket-photo reads: also allow a worker to read any photo that is attached
-- to one of their OWN credential rows.
--
-- Why: the re-crop backfill (api/cron/recrop) uploads per-card crops with the
-- service role, so storage.objects.owner is NULL — the old owner-only clause
-- would hide a worker's own card picture from them. A photo referenced by
-- your own credential row is yours to see; credential.photo_url is only ever
-- set by the worker's own validated insert or by the backfill.
--
-- Medics keep reading everything via is_medic_account() (unchanged).

drop policy if exists "rw_ticketphotos_select" on storage.objects;
create policy "rw_ticketphotos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ticket-photos'
    and (
      owner = auth.uid()
      or is_medic_account()
      or exists (
        select 1
        from public.credentials c
        where c.worker_id = auth.uid()
          and c.photo_url = storage.objects.name
      )
    )
  );
