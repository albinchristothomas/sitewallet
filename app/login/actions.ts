"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { intentToHome, type SignupIntent } from "@/lib/roles";

type State = { error?: string; sent?: boolean; email?: string };

function isIntent(s: string): s is SignupIntent {
  return s === "worker" || s === "medic" || s === "operator";
}

export async function sendMagicLink(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const email = String(formData.get("email") ?? "").trim();
  const signupAsRaw = String(formData.get("signup_as") ?? "").trim();
  const signupAs: SignupIntent | null = isIntent(signupAsRaw) ? signupAsRaw : null;

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    `http://${headerList.get("host") ?? "localhost:3000"}`;

  // After magic-link, send the user to their role's home page.
  const next = signupAs ? intentToHome(signupAs) : "/wallet";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      // Persist signup intent into user_metadata so the auth callback can
      // set the worker's roles[] array correctly on first sign-in.
      data: signupAs ? { signup_role: signupAs } : undefined,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { sent: true, email };
}
