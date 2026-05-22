"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function checkOut(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("sessions")
    .update({
      status: "CLOSED",
      check_out_at: new Date().toISOString(),
      check_out_method: "MANUAL",
    })
    .eq("id", sessionId)
    .eq("worker_id", user.id);

  revalidatePath("/wallet/session");
  revalidatePath("/wallet");
  redirect("/wallet");
}
