"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AssignState = { error?: string; ok?: boolean };

// Assign a medic to a site by email. The medic must already have a RigWise
// account (account_type = 'MEDIC') — i.e. they've signed in at least once.
// Email lives on auth.users, so we resolve it through the SECURITY DEFINER
// resolve_medic_id_by_email RPC, then insert the assignment (idempotent via the
// unique(medic_id, site_id) constraint).
export async function assignMedicByEmail(
  siteId: string,
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: medicId, error: lookupErr } = await supabase.rpc(
    "resolve_medic_id_by_email",
    { p_email: email },
  );
  if (lookupErr) return { error: lookupErr.message };
  if (!medicId) {
    return {
      error:
        "No medic account found for that email. Ask them to sign in to RigWise once first, then try again.",
    };
  }

  // Guarded SECURITY DEFINER RPC: caller must be a medic already on this site
  // (or the site must have no medics yet). Idempotent on re-assign.
  const { error: insErr } = await supabase.rpc("assign_medic_to_site", {
    p_medic_id: medicId,
    p_site_id: siteId,
  });
  if (insErr) return { error: insErr.message };

  revalidatePath(`/admin/sites/${siteId}`);
  return { ok: true };
}
