import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Provisions (or re-provisions) the single app-store review account:
// a Supabase user with a password, a completed worker profile, and a small
// sample wallet so reviewers see the product working. Auth: CRON_SECRET
// bearer. Idempotent — safe to call again after rotating the password.

export const maxDuration = 30;

function iso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const email = process.env.REVIEW_LOGIN_EMAIL?.trim().toLowerCase();
  const password = process.env.REVIEW_LOGIN_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      { error: "REVIEW_LOGIN_EMAIL / REVIEW_LOGIN_PASSWORD not set" },
      { status: 503 },
    );
  }

  const admin = createAdminClient();

  // 1. Auth user with the password (create, or reset if it already exists).
  let userId: string | null = null;
  let status = "created";
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { review_account: true },
  });
  if (created?.user) {
    userId = created.user.id;
  } else {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) {
      return NextResponse.json({ error: createErr?.message ?? "create failed" }, { status: 500 });
    }
    userId = existing.id;
    status = "updated";
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      ban_duration: "none",
    });
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 2. Completed worker profile so the proxy skips onboarding.
  const { error: wErr } = await admin.from("workers").upsert(
    {
      id: userId,
      full_name: "Review Account",
      account_type: "WORKER",
      contractor_company: "App Store Review",
      profile_completed_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

  // 3. Sample wallet: one valid, one expiring, one site orientation.
  const { count } = await admin
    .from("credentials")
    .select("id", { count: "exact", head: true })
    .eq("worker_id", userId);
  let seeded = 0;
  if (!count) {
    const rows = [
      { credential_type: "H2S_ALIVE", issuer: "Energy Safety Canada", certificate_number: "ESC-2024-118-44210", issue_date: iso(-400), expiry_date: iso(695), holder_name: "Review Account" },
      { credential_type: "FIRST_AID", issuer: "Red Cross", certificate_number: "RC-771-2210", issue_date: iso(-1075), expiry_date: iso(20), holder_name: "Review Account" },
      { credential_type: "Tourmaline Orientation", issuer: "Tourmaline Oil", certificate_number: null, issue_date: iso(-30), expiry_date: null, holder_name: "Review Account" },
    ].map((r) => ({ ...r, worker_id: userId, verification_status: "UNVERIFIED" as const }));
    const { error: cErr } = await admin.from("credentials").insert(rows);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    seeded = rows.length;
  }

  return NextResponse.json({ ok: true, status, user_id: userId, seeded });
}
