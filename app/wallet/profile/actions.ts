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
