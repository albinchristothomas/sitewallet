-- RigWise — worker's current worksite.
--
-- Captured at onboarding (name + company + worksite is the entire worker
-- signup now). The site stays the same for a rotation (~15 days); daily
-- attendance is tracked via sessions. Free text for the MVP.

alter table workers
  add column if not exists current_worksite text;

comment on column workers.current_worksite is
  'The rig/wellsite the worker is going to this rotation. Free text. Set at onboarding, editable in profile.';
