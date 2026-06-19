"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type WalkInTicket = {
  credential_type: string;
  issuer: string | null;
  photo_path: string | null; // object path in the ticket-photos bucket
  expiry_date: string | null; // ISO date or null
};

export type WalkInPayload = {
  full_name: string;
  phone: string | null;
  employer: string | null;
  face_path: string | null; // object path in the faces bucket
  tickets: WalkInTicket[];
};

export type WalkInResult = { ok: false; error: string };

/**
 * A medic creates a "walk-in" worker — someone standing at the gate who does
 * not have the RigWise app. We mint a shadow auth user (no login) so the
 * existing worker-centric schema (workers.id -> auth.users.id, RLS on
 * auth.uid()) keeps working unchanged, then attach any photographed tickets,
 * then hand the medic to the verify/admit screen.
 *
 * Authorization: the caller MUST be a medic assigned to this site. We check
 * that with the anon (RLS-bound) client BEFORE touching the service-role
 * admin client.
 */
export async function createWalkIn(
  siteId: string,
  payload: WalkInPayload,
): Promise<WalkInResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const fullName = payload.full_name.trim();
  if (!fullName) return { ok: false, error: "Worker name is required." };

  // AuthZ: confirm the caller is a medic for this site. is_medic_for_site is a
  // SECURITY DEFINER helper used throughout the schema.
  const { data: isMedic, error: medicErr } = await supabase.rpc(
    "is_medic_for_site",
    { target_site_id: siteId },
  );
  if (medicErr) return { ok: false, error: medicErr.message };
  if (!isMedic) {
    return { ok: false, error: "You're not assigned to this site." };
  }

  const admin = createAdminClient();

  // 1. Mint a shadow auth user. The email is synthetic and unguessable; the
  //    worker can never sign in to it (no magic link is ever sent). If they
  //    later install the app and want to claim this record, that's a future
  //    flow — out of scope this week.
  const shadowEmail = `walkin.${crypto.randomUUID()}@walkin.rigwise.ca`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email: shadowEmail,
      email_confirm: true,
      user_metadata: { walk_in: true, created_by_medic: user.id },
    },
  );
  if (createErr || !created?.user) {
    return {
      ok: false,
      error: createErr?.message ?? "Could not create the worker record.",
    };
  }
  const workerId = created.user.id;

  // 2. Insert the worker row (service role — bypasses RLS, which is fine: we
  //    authorized the medic above). account_type WORKER so admit_worker accepts
  //    them. profile_completed_at is stamped so the proxy never traps a
  //    walk-in in onboarding (they have no login anyway).
  const { error: insertErr } = await admin.from("workers").insert({
    id: workerId,
    account_type: "WORKER",
    full_name: fullName,
    phone: payload.phone?.trim() || null,
    contractor_company: payload.employer?.trim() || null,
    photo_url: payload.face_path || null,
    created_by_medic_id: user.id,
    profile_completed_at: new Date().toISOString(),
  });
  if (insertErr) {
    // Roll back the orphaned auth user so a retry is clean.
    await admin.auth.admin.deleteUser(workerId).catch(() => {});
    return { ok: false, error: insertErr.message };
  }

  // 3. Attach any photographed tickets as UNVERIFIED credentials. The medic
  //    eyeballs the photo and marks them verified on the next screen.
  const tickets = (payload.tickets ?? []).filter((t) => t.credential_type);
  if (tickets.length > 0) {
    const rows = tickets.map((t) => ({
      worker_id: workerId,
      credential_type: t.credential_type,
      issuer: t.issuer?.trim() || null,
      holder_name: fullName,
      expiry_date: t.expiry_date || null,
      photo_url: t.photo_path || null,
      verification_status: "UNVERIFIED" as const,
    }));
    const { error: credErr } = await admin.from("credentials").insert(rows);
    if (credErr) {
      // Non-fatal: the worker exists; the medic can add tickets on verify.
      // Surface it so they know to re-add.
      return {
        ok: false,
        error: `Worker created, but tickets failed to save: ${credErr.message}`,
      };
    }
  }

  redirect(`/medic/${siteId}/verify/${workerId}`);
}
