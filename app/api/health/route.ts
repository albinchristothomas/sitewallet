import { NextResponse } from "next/server";

// Public config health-check: reports WHICH server secrets are present
// (booleans only — never values). Lets us diagnose "feature X isn't working"
// without guessing whether an env var reached the deployment.
export async function GET() {
  return NextResponse.json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    env: {
      anthropic_key: Boolean(process.env.ANTHROPIC_API_KEY),
      resend_key: Boolean(process.env.RESEND_API_KEY),
      cron_secret: Boolean(process.env.CRON_SECRET),
      supabase_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}
