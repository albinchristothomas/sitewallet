"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type State = { error?: string };

export async function saveMedicProfile(
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
  const medicFirm = String(formData.get("medic_firm") ?? "").trim() || null;
  const medicLicenseNumber =
    String(formData.get("medic_license_number") ?? "").trim() || null;

  if (!fullName) return { error: "Full name is required." };

  const { error } = await supabase
    .from("workers")
    .update({
      full_name: fullName,
      phone,
      medic_firm: medicFirm,
      medic_license_number: medicLicenseNumber,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/medic");
  revalidatePath("/medic/profile");
  redirect("/medic/profile?saved=1");
}
