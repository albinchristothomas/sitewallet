"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForType, type AccountType } from "@/lib/roles";

export type OnboardingPayload = {
  full_name: string;
  phone: string;
  // worker-only
  contractor_company?: string;
  employee_number?: string;
  drivers_license_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  allergies?: string;
  medical_conditions?: string;
  // medic-only
  medic_firm?: string;
  medic_license_number?: string;
};

export async function completeOnboarding(payload: OnboardingPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: existing, error: readErr } = await supabase
    .from("workers")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr || !existing) {
    return { ok: false, error: "Could not find your account. Sign out and back in." };
  }

  const type = existing.account_type as AccountType;

  // Build a single update with role-appropriate fields. Trim every string.
  const trim = (s: string | undefined) => (s ?? "").trim() || null;

  const base = {
    full_name: trim(payload.full_name),
    phone: trim(payload.phone),
  };

  const roleFields =
    type === "WORKER"
      ? {
          contractor_company: trim(payload.contractor_company),
          employee_number: trim(payload.employee_number),
          drivers_license_number: trim(payload.drivers_license_number),
          emergency_contact_name: trim(payload.emergency_contact_name),
          emergency_contact_phone: trim(payload.emergency_contact_phone),
          allergies: trim(payload.allergies),
          medical_conditions: trim(payload.medical_conditions),
        }
      : {
          medic_firm: trim(payload.medic_firm),
          medic_license_number: trim(payload.medic_license_number),
        };

  const required: Record<AccountType, Array<keyof typeof base | string>> = {
    WORKER: [
      "full_name",
      "phone",
      "contractor_company",
      "drivers_license_number",
      "emergency_contact_name",
      "emergency_contact_phone",
    ],
    MEDIC: ["full_name", "phone", "medic_firm", "medic_license_number"],
  };

  const merged = { ...base, ...roleFields } as Record<string, string | null>;
  for (const k of required[type]) {
    if (!merged[k as string]) {
      return { ok: false, error: `Missing required field: ${k}` };
    }
  }

  const { error: updateErr } = await supabase
    .from("workers")
    .update({
      ...merged,
      profile_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  redirect(homeForType(type));
}
