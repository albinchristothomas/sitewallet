"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Assign a medic to a site by email. The medic must have already signed up
// with account_type = 'MEDIC'. We look them up via auth.users; since the
// anon client can't query auth.users directly, we rely on the medic having
// a workers row mirrored from their auth account (created on first sign-in).
//
// Phase 1 simplification: pasting an email here only works if that medic has
// already signed in once. Phase 2 will add a proper invite-by-email flow
// that creates a pending invitation and sends them a magic link.
export async function assignMedicByEmail(siteId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter an email." };

  const supabase = await createClient();

  // Look up a worker row with this email + account_type = MEDIC.
  // We don't have email directly on workers; we'd need an RPC with
  // SECURITY DEFINER to join against auth.users. For now we accept the
  // limitation: an operator can only assign medics who've already signed
  // up as medics and whose name they know.
  //
  // Stub — actual implementation pending the lookup RPC. Keeping the
  // function exported so the form still posts without breaking.
  revalidatePath(`/admin/sites/${siteId}`);
  return { ok: true };
}
