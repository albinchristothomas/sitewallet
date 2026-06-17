import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public routes — never require auth.
  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/auth/") ||
    path.startsWith("/_next") ||
    path === "/offline";

  // Anonymous user hitting a private route → /login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Signed in: enforce onboarding before any other private route.
  if (user) {
    const isOnboardingRoute = path.startsWith("/onboarding");
    const isAuthFlow =
      path.startsWith("/auth/") || path === "/sign-out";

    if (!isOnboardingRoute && !isAuthFlow && !isPublic) {
      // Cheap single-column lookup; PK on workers.id.
      const { data: w } = await supabase
        .from("workers")
        .select("profile_completed_at")
        .eq("id", user.id)
        .maybeSingle();

      // No row yet (auth callback hasn't fired) OR row exists but profile
      // never completed → onboarding.
      if (!w || !w.profile_completed_at) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
