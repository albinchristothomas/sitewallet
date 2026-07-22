"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

type AddState = { error?: string };

export async function addCredential(
  _prev: AddState,
  formData: FormData,
): Promise<AddState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const credentialType = String(formData.get("credential_type") ?? "");
  const issuer = String(formData.get("issuer") ?? "").trim() || null;
  const certificateNumber =
    String(formData.get("certificate_number") ?? "").trim() || null;
  const validationCode =
    String(formData.get("validation_code") ?? "").trim() || null;
  const externalVerificationUrlRaw = String(
    formData.get("external_verification_url") ?? "",
  ).trim();
  const externalVerificationUrl =
    externalVerificationUrlRaw && /^https?:\/\//i.test(externalVerificationUrlRaw)
      ? externalVerificationUrlRaw
      : null;
  const holderName = String(formData.get("holder_name") ?? "").trim() || null;
  const issueDate = String(formData.get("issue_date") ?? "") || null;
  const expiryDate = String(formData.get("expiry_date") ?? "") || null;
  // Path into the private "ticket-photos" bucket (uploaded client-side before
  // submit). Lets the medic see the actual card at the gate.
  const cardPhotoPath =
    String(formData.get("card_photo_path") ?? "").trim() || null;

  if (!credentialType || credentialType === "OTHER") {
    return { error: "Select a credential type (or type the ticket's name)." };
  }

  if (!cardPhotoPath) {
    return { error: "Add a photo of the card before saving." };
  }

  // Reject anything but a real object path (no external URLs sneaking into
  // photo_url) and confirm the uploaded card actually exists in storage —
  // the whole point of the mandatory photo is that the medic can see it.
  if (/^https?:\/\//i.test(cardPhotoPath)) {
    return { error: "Add a photo of the card before saving." };
  }
  const { data: signed } = await supabase.storage
    .from("ticket-photos")
    .createSignedUrl(cardPhotoPath, 60);
  if (!signed) {
    return { error: "That photo didn't upload. Please retake the card photo." };
  }

  const { error } = await supabase.from("credentials").insert({
    worker_id: user.id,
    credential_type: credentialType,
    issuer,
    certificate_number: certificateNumber,
    validation_code: validationCode,
    external_verification_url: externalVerificationUrl,
    holder_name: holderName,
    issue_date: issueDate,
    expiry_date: expiryDate,
    photo_url: cardPhotoPath,
    verification_status: "UNVERIFIED",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/wallet");
  redirect(`/wallet?saved=${encodeURIComponent(credentialType)}`);
}

export type BatchTicket = {
  credential_type: string;
  issuer: string | null;
  certificate_number: string | null;
  holder_name: string | null;
  issue_date: string | null;
  expiry_date: string | null;
};

// Save several tickets detected in ONE card photo (a wallet-page shot can show
// 2-3 cards). All rows share the same photo and are UNVERIFIED — the medic
// still confirms each one at the gate.
export async function addCredentialsBatch(
  tickets: BatchTicket[],
  cardPhotoPath: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const photo = cardPhotoPath.trim();
  if (!photo || /^https?:\/\//i.test(photo) || photo.includes("..")) {
    return { error: "Add a photo of the cards before saving." };
  }

  const isoRe = /^\d{4}-\d{2}-\d{2}$/;
  const rows = tickets
    .map((t) => ({
      worker_id: user.id,
      credential_type: String(t.credential_type ?? "").trim(),
      issuer: t.issuer?.trim() || null,
      certificate_number: t.certificate_number?.trim() || null,
      holder_name: t.holder_name?.trim() || null,
      issue_date: t.issue_date && isoRe.test(t.issue_date) ? t.issue_date : null,
      expiry_date:
        t.expiry_date && isoRe.test(t.expiry_date) ? t.expiry_date : null,
      photo_url: photo,
      verification_status: "UNVERIFIED" as const,
    }))
    .filter((r) => r.credential_type && r.credential_type !== "OTHER");

  if (rows.length === 0) {
    return { error: "Nothing selected to add." };
  }
  if (rows.length > 10) {
    return { error: "Too many tickets at once — add up to 10." };
  }

  const { error } = await supabase.from("credentials").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/wallet");
  redirect(`/wallet?saved=${rows.length}+tickets`);
}
