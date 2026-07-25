"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string };

export async function saveWorkerProfile(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const employeeNumber =
    String(formData.get("employee_number") ?? "").trim() || null;
  const contractorCompany =
    String(formData.get("contractor_company") ?? "").trim() || null;

  if (!fullName) return { error: "Full name is required." };

  const { error } = await supabase
    .from("workers")
    .update({
      full_name: fullName,
      phone,
      employee_number: employeeNumber,
      contractor_company: contractorCompany,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/wallet");
  revalidatePath("/wallet/profile");
  redirect("/wallet/profile?saved=1");
}

// Set the profile photo ONCE. The database trigger locks photo_url after it's
// set (it anchors the medic's face check at the gate), so changes go through a
// medic — this action only fills an empty slot.
export async function setProfilePhoto(
  path: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const clean = path.trim();
  if (!clean || clean.includes("..") || /^https?:\/\//i.test(clean)) {
    return { error: "Upload failed — try again." };
  }

  const { data: me } = await supabase
    .from("workers")
    .select("photo_url")
    .eq("id", user.id)
    .single();
  if (me?.photo_url) {
    return {
      error: "Your photo is locked once set — ask a medic to update it.",
    };
  }

  const { error } = await supabase
    .from("workers")
    .update({ photo_url: clean })
    .eq("id", user.id);
  if (error) {
    return { error: "Your photo is locked once set — ask a medic to update it." };
  }

  revalidatePath("/wallet/profile");
  revalidatePath("/wallet");
  return {};
}
