"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string };

// Sign-in for app store reviewers only. Google and Apple reviewers cannot
// receive our emailed one-time codes, so this one pre-provisioned account
// (REVIEW_LOGIN_EMAIL, created by /api/cron/review-account) signs in with a
// password. Nothing else in the product uses passwords; any other address is
// refused before Supabase is even asked.
export async function reviewerSignIn(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const allowed = process.env.REVIEW_LOGIN_EMAIL?.trim().toLowerCase();
  if (!allowed) return { error: "Review sign-in is not enabled." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (email !== allowed || !password) {
    return { error: "That account cannot sign in here." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email or password." };

  redirect("/wallet");
}
