import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Ensure a workers row exists for this user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // First sign-in: create the workers row, pre-filling full_name from
    // metadata if an admin pre-supplied it (invite flow).
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? null;
    await supabase
      .from("workers")
      .upsert(
        fullName ? { id: user.id, full_name: fullName } : { id: user.id },
        { onConflict: "id", ignoreDuplicates: true },
      );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
