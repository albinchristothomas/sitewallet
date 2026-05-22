"use server";

import { redirect } from "next/navigation";
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
