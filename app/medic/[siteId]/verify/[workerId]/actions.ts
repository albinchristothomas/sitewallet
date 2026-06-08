"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function admitWorker(
  siteId: string,
  workerId: string,
  snapshot: unknown,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc("admit_worker", {
    p_worker_id: workerId,
    p_site_id: siteId,
    p_snapshot: snapshot ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/medic/${siteId}`);
}

// Called when the medic taps "Mark verified" after checking the issuer's
// validation page in a new tab. The RPC checks the caller is a MEDIC and
// stamps the credential as MANUALLY_VERIFIED with our medic ID.
export async function markVerified(
  siteId: string,
  workerId: string,
  credentialId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc("mark_credential_verified", {
    p_credential_id: credentialId,
    p_method: "MEDIC_REVIEW",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/medic/${siteId}/verify/${workerId}`);
}
