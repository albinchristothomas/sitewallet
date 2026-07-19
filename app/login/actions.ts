"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { intentToType, homeForType, type SignupIntent } from "@/lib/roles";

type State = {
  error?: string;
  sent?: boolean;
  email?: string;
  signupAs?: SignupIntent | null;
};

function isIntent(s: string): s is SignupIntent {
  return s === "worker" || s === "medic";
}

// Turn raw Supabase auth errors into words a rig hand understands.
function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many") || m.includes("429")) {
    return "Too many sign-in attempts right now. Wait a minute, then try again.";
  }
  if (m.includes("expired") || m.includes("invalid") || m.includes("token")) {
    return "That code is wrong or expired. Use the newest email, or send a new code.";
  }
  return msg;
}

// First sign-in: make sure the worker has a row with the right account type.
async function ensureWorkerRow(
  supabase: SupabaseClient,
  signupAs: SignupIntent | null,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const meta = user.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
  const metaRole =
    typeof meta.signup_role === "string" && isIntent(meta.signup_role)
      ? meta.signup_role
      : null;
  const type = signupAs
    ? intentToType(signupAs)
    : metaRole
      ? intentToType(metaRole)
      : "WORKER";

  const { data: existing } = await supabase
    .from("workers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!existing) {
    await supabase.from("workers").insert({
      id: user.id,
      ...(fullName ? { full_name: fullName } : {}),
      account_type: type,
    });
  }
}

// STEP 1 — email a 6-digit sign-in code (the email also carries a tap link).
export async function sendMagicLink(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const signupAsRaw = String(formData.get("signup_as") ?? "").trim();
  const signupAs: SignupIntent | null = isIntent(signupAsRaw)
    ? signupAsRaw
    : null;

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address.", signupAs };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    `http://${headerList.get("host") ?? "localhost:3000"}`;
  const next = signupAs ? homeForType(intentToType(signupAs)) : "/wallet";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: signupAs ? { signup_role: signupAs } : undefined,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message), signupAs };
  }
  return { sent: true, email, signupAs };
}

// STEP 2 — verify the typed 6-digit code. Works on any device/browser (no PKCE
// cookie needed), so it's the reliable path for non-tech workers.
export async function verifyCode(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const signupAsRaw = String(formData.get("signup_as") ?? "").trim();
  const signupAs: SignupIntent | null = isIntent(signupAsRaw)
    ? signupAsRaw
    : null;

  if (code.length !== 6) {
    return {
      sent: true,
      email,
      signupAs,
      error: "Enter the 6-digit code from the email.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  if (error) {
    return { sent: true, email, signupAs, error: friendlyAuthError(error.message) };
  }

  await ensureWorkerRow(supabase, signupAs);
  redirect("/");
}

// ── LOCAL TESTING ONLY ─────────────────────────────────────────────────────
// One-tap sign-in for the seeded test accounts (scripts/seed-test.mjs), so
// local walkthroughs don't need any email. Hard-gated: refuses in production
// and refuses any email outside the seeded test cast.
const DEV_TEST_ACCOUNTS = [
  "albinchristothomas+medic@gmail.com",
  "albinchristothomas+pass@gmail.com",
  "albinchristothomas+fail@gmail.com",
];

export async function devTestSignIn(email: string): Promise<{ error?: string }> {
  if (process.env.NODE_ENV === "production") {
    return { error: "Not available." };
  }
  if (!DEV_TEST_ACCOUNTS.includes(email)) {
    return { error: "Not a test account." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: "rigvise-test",
  });
  if (error) {
    return {
      error: `${error.message} — run \`node scripts/seed-test.mjs\` first.`,
    };
  }
  redirect("/");
}
