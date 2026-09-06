"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Account deletion — required by Apple (App Store Review 5.1.1(v)) and Google
// Play for any app with account creation, and the right thing under PIPEDA.
//
// What goes: name, contact details, employer, face photo, every ticket row and
// card photo, and the sign-in identity. What stays: gate records (sessions,
// denials, incidents) — those are the site operator's safety records and the
// database protects them with ON DELETE RESTRICT — but they no longer carry a
// name or any contact detail. The privacy page says exactly this.

type State = { error?: string };

function storagePath(bucket: string, value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return null;
  return value.startsWith(`${bucket}/`) ? value.slice(bucket.length + 1) : value;
}

export async function deleteMyAccount(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  const admin = createAdminClient();

  // 1. Card photos + ticket rows.
  const { data: creds } = await admin
    .from("credentials")
    .select("photo_url")
    .eq("worker_id", user.id);
  const ticketPaths = (creds ?? [])
    .map((c) => storagePath("ticket-photos", c.photo_url))
    .filter((p): p is string => Boolean(p));
  if (ticketPaths.length > 0) {
    await admin.storage.from("ticket-photos").remove(ticketPaths);
  }
  const { error: credErr } = await admin
    .from("credentials")
    .delete()
    .eq("worker_id", user.id);
  if (credErr) return { error: credErr.message };

  // 2. Face photo.
  const { data: me } = await admin
    .from("workers")
    .select("photo_url")
    .eq("id", user.id)
    .maybeSingle();
  const facePath = storagePath("faces", me?.photo_url ?? null);
  if (facePath) {
    await admin.storage.from("faces").remove([facePath]);
  }

  // 3. Strip every personal field from the worker row. The service role
  //    bypasses the name/photo lock trigger (auth.uid() is null), which is
  //    exactly the "admin correction" path that trigger reserves.
  const { error: wipeErr } = await admin
    .from("workers")
    .update({
      full_name: "Deleted account",
      phone: null,
      employee_number: null,
      contractor_company: null,
      photo_url: null,
      medic_firm: null,
      medic_license_number: null,
    })
    .eq("id", user.id);
  if (wipeErr) return { error: wipeErr.message };

  // 4. Remove the sign-in. Hard delete when nothing references the worker;
  //    when gate records do (RESTRICT), tombstone the email and ban the user
  //    so the identity is gone and can never sign in again.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    const { error: banErr } = await admin.auth.admin.updateUserById(user.id, {
      email: `deleted.${user.id}@deleted.invalid`,
      email_confirm: true,
      ban_duration: "876000h", // ~100 years
      user_metadata: { deleted: true },
    });
    if (banErr) return { error: banErr.message };
  }

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
