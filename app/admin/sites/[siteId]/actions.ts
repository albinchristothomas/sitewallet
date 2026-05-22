"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function assignSelfAsMedic(siteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Ensure MEDIC role on the worker.
  const { data: w } = await supabase
    .from("workers")
    .select("roles")
    .eq("id", user.id)
    .single();
  const roles: string[] = w?.roles ?? ["WORKER"];
  if (!roles.includes("MEDIC")) {
    await supabase
      .from("workers")
      .update({ roles: [...roles, "MEDIC"] })
      .eq("id", user.id);
  }

  await supabase
    .from("medic_assignments")
    .insert({ medic_id: user.id, site_id: siteId })
    // ignore unique-violation if already assigned
    .select();

  revalidatePath(`/admin/sites/${siteId}`);
}

export async function assignMedicByEmail(siteId: string, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;

  const supabase = await createClient();

  // Phase 1: look up an existing worker by email via auth.users. We can't
  // directly query auth.users from anon, so we use a workers table that mirrors
  // by id. For the demo we accept that the medic must have signed in once.
  // We store nothing for now if not found — surface a friendlier flow in P2.
  const { data: existing } = await supabase
    .from("workers")
    .select("id, roles")
    .ilike("full_name", `%${email}%`);

  // Without an email column on workers (we rely on auth.users.email), we can't
  // resolve email → worker_id from a client-anon Postgres call. This action is
  // a stub that will be replaced once we add a "lookup_or_invite_medic" RPC.
  // For now, the recommended flow is: have the medic sign in once, then go to
  // this page and click "Assign myself as medic".
  void existing;

  revalidatePath(`/admin/sites/${siteId}`);
}
