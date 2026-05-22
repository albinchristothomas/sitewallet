"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string; sent?: boolean; email?: string };

export async function inviteWorker(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    `http://${headerList.get("host") ?? "localhost:3000"}`;

  // signInWithOtp creates the user if they don't exist (default behavior)
  // and stores full_name in user_metadata which the auth callback reads.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/wallet`,
      data: fullName ? { full_name: fullName } : undefined,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { sent: true, email };
}
