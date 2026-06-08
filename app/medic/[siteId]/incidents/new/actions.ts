"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string };

export async function createIncident(
  siteId: string,
  _prev: State,
  formData: FormData,
): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const type = String(formData.get("type") ?? "").trim();
  const severity = String(formData.get("severity") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const workerId = String(formData.get("worker_id") ?? "").trim() || null;
  const followUp = String(formData.get("follow_up") ?? "").trim() || null;

  if (!type || !severity || !description) {
    return { error: "Type, severity, and description are required." };
  }

  const { error } = await supabase.from("incidents").insert({
    site_id: siteId,
    reported_by: user.id,
    worker_id: workerId,
    type,
    severity,
    description,
    follow_up: followUp,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/medic/${siteId}/incidents`);
}
