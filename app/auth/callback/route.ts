import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { intentToRole, type SignupIntent, type WorkerRole } from "@/lib/roles";

function isIntent(s: unknown): s is SignupIntent {
  return s === "worker" || s === "medic" || s === "operator";
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
    // First sign-in: create the workers row, pre-filling from user_metadata.
    // signup_role (worker/medic/operator) tells us their primary role.
    // full_name may have been set by the admin invite flow.
    const meta = user.user_metadata ?? {};
    const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
    const signupRoleRaw = meta.signup_role;
    const signupRole: WorkerRole | null = isIntent(signupRoleRaw)
      ? intentToRole(signupRoleRaw)
      : null;

    // Fetch existing roles so we don't clobber. Insert if new.
    const { data: existing } = await supabase
      .from("workers")
      .select("id, roles")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      // New user — create row with declared role (or default WORKER).
      const initialRoles: WorkerRole[] = signupRole ? [signupRole] : ["WORKER"];
      await supabase.from("workers").insert({
        id: user.id,
        ...(fullName ? { full_name: fullName } : {}),
        roles: initialRoles,
      });
    } else if (signupRole && !(existing.roles ?? []).includes(signupRole)) {
      // Existing user signing in under a new role intent — add the role.
      const merged = Array.from(new Set([...(existing.roles ?? []), signupRole]));
      await supabase.from("workers").update({ roles: merged }).eq("id", user.id);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
