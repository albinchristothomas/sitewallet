import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { intentToType, type SignupIntent, type AccountType } from "@/lib/roles";

function isIntent(s: unknown): s is SignupIntent {
  return s === "worker" || s === "medic";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/wallet";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // First sign-in: create the workers row with the declared account_type.
    // signup_role is set by the magic-link request from /login.
    // full_name may have been set by an admin invite.
    // Once created, account_type is locked — same identity can't shape-shift.
    const meta = user.user_metadata ?? {};
    const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
    const signupRoleRaw = meta.signup_role;
    const signupType: AccountType | null = isIntent(signupRoleRaw)
      ? intentToType(signupRoleRaw)
      : null;

    const { data: existing } = await supabase
      .from("workers")
      .select("id, account_type")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("workers").insert({
        id: user.id,
        ...(fullName ? { full_name: fullName } : {}),
        account_type: signupType ?? "WORKER",
      });
    }
    // No "else" branch — once account_type is set, we never change it from
    // here. If a person needs a different account type, they sign up with a
    // different email.
  }

  return NextResponse.redirect(`${origin}${next}`);
}
