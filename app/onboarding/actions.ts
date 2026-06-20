"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForType, type AccountType } from "@/lib/roles";

export type OnboardingPayload = {
  full_name: string;
  phone: string;
  // worker-only
  contractor_company?: string; // who they work for
  current_worksite?: string;   // the site/rig they're going to
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
  // Built directly as a Record so the worker/medic branches don't produce a
  // union type with `undefined` keys (which the prod build rejects).
  const trim = (s: string | undefined) => (s ?? "").trim() || null;

  const merged: Record<string, string | null> = {
    full_name: trim(payload.full_name),
    phone: trim(payload.phone),
  };

  if (type === "WORKER") {
    merged.contractor_company = trim(payload.contractor_company);
    merged.current_worksite = trim(payload.current_worksite);
    // Optional extras — captured later (profile or by the medic at the gate).
    merged.employee_number = trim(payload.employee_number);
    merged.drivers_license_number = trim(payload.drivers_license_number);
    merged.emergency_contact_name = trim(payload.emergency_contact_name);
    merged.emergency_contact_phone = trim(payload.emergency_contact_phone);
    merged.allergies = trim(payload.allergies);
    merged.medical_conditions = trim(payload.medical_conditions);
  } else {
    merged.medic_firm = trim(payload.medic_firm);
    merged.medic_license_number = trim(payload.medic_license_number);
  }

  // Minimal required set. Worker: name + who they work for + where they're
  // going. Phone/license/emergency are optional now (face is not required).
  const required: Record<AccountType, string[]> = {
    WORKER: ["full_name", "contractor_company", "current_worksite"],
    MEDIC: ["full_name", "medic_firm", "medic_license_number"],
  };

  for (const k of required[type]) {
    if (!merged[k]) {
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
