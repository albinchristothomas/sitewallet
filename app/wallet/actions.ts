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

  if (!credentialType) {
    return { error: "Select a credential type." };
  }

  if (!cardPhotoPath) {
    return { error: "Add a photo of the card before saving." };
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
