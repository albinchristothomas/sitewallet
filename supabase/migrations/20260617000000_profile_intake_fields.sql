-- RigWise — profile + intake fields for the forced first-run onboarding wizard.
--
-- After magic-link sign-in, a user MUST complete the onboarding wizard before
-- they can access /wallet or /medic. We track completion via the new
-- profile_completed_at column. NULL = wizard not done yet → proxy redirects
-- them to /onboarding.
--
-- Worker intake fields (driver's license, emergency contact, allergies, medical)
-- are captured during onboarding so the medic has them at admit time — partner
-- punch list item.
--
-- Idempotent: uses ADD COLUMN IF NOT EXISTS so re-running this is safe.

alter table workers
  add column if not exists profile_completed_at      timestamptz,
  add column if not exists drivers_license_number    text,
  add column if not exists emergency_contact_name    text,
  add column if not exists emergency_contact_phone   text,
  add column if not exists allergies                 text,
  add column if not exists medical_conditions        text;

-- Helpful index: any time we read a user's row on a navigation we check
-- profile_completed_at. The lookup is on auth.uid() which is the PK, so the
-- planner already uses the PK index — no extra index needed.

-- Helper: a quick boolean for "is the profile complete?"
-- The required fields depend on account_type:
--   WORKER: full_name, phone, contractor_company, drivers_license_number,
--           emergency_contact_name, emergency_contact_phone
--   MEDIC:  full_name, phone, medic_firm, medic_license_number
-- Health fields (allergies, medical_conditions) are intentionally optional —
-- some workers will refuse to share, and a forced field would block them.
create or replace function profile_is_complete(p_worker workers)
returns boolean
language sql
immutable
as $$
  select case
    when p_worker.account_type = 'WORKER' then
      p_worker.full_name is not null and length(trim(p_worker.full_name)) > 0
      and p_worker.phone is not null and length(trim(p_worker.phone)) > 0
      and p_worker.contractor_company is not null and length(trim(p_worker.contractor_company)) > 0
      and p_worker.drivers_license_number is not null and length(trim(p_worker.drivers_license_number)) > 0
      and p_worker.emergency_contact_name is not null and length(trim(p_worker.emergency_contact_name)) > 0
      and p_worker.emergency_contact_phone is not null and length(trim(p_worker.emergency_contact_phone)) > 0
    when p_worker.account_type = 'MEDIC' then
      p_worker.full_name is not null and length(trim(p_worker.full_name)) > 0
      and p_worker.phone is not null and length(trim(p_worker.phone)) > 0
      and p_worker.medic_firm is not null and length(trim(p_worker.medic_firm)) > 0
      and p_worker.medic_license_number is not null and length(trim(p_worker.medic_license_number)) > 0
    else
      false
  end;
$$;

comment on column workers.profile_completed_at is
  'Timestamp when the user finished the first-run onboarding wizard. NULL = wizard not done; proxy redirects to /onboarding.';

comment on column workers.drivers_license_number is
  'Captured at onboarding. Read by the medic at admit time.';

comment on column workers.emergency_contact_name is
  'Captured at onboarding. Surfaced to the medic on the verify-and-admit screen.';

comment on column workers.emergency_contact_phone is
  'Captured at onboarding. Surfaced to the medic on the verify-and-admit screen.';

comment on column workers.allergies is
  'Optional. Captured at onboarding so a medic at the gate has it if the worker is incapacitated.';

comment on column workers.medical_conditions is
  'Optional. Same purpose as allergies — for medical-emergency context.';
