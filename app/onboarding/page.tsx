import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForType, type AccountType } from "@/lib/roles";
import { OnboardingWizard } from "./wizard";

export const metadata = { title: "Set up your account" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: worker } = await supabase
    .from("workers")
    .select(
      "account_type, full_name, phone, contractor_company, current_worksite, employee_number, drivers_license_number, emergency_contact_name, emergency_contact_phone, allergies, medical_conditions, medic_firm, medic_license_number, profile_completed_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Already onboarded → bounce home.
  if (worker?.profile_completed_at) {
    redirect(homeForType(worker.account_type as AccountType));
  }

  const type = (worker?.account_type ?? "WORKER") as AccountType;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
      <OnboardingWizard
        accountType={type}
        email={user.email ?? ""}
        initial={{
          full_name: worker?.full_name ?? "",
          phone: worker?.phone ?? "",
          contractor_company: worker?.contractor_company ?? "",
          current_worksite: worker?.current_worksite ?? "",
          employee_number: worker?.employee_number ?? "",
          drivers_license_number: worker?.drivers_license_number ?? "",
          emergency_contact_name: worker?.emergency_contact_name ?? "",
          emergency_contact_phone: worker?.emergency_contact_phone ?? "",
          allergies: worker?.allergies ?? "",
          medical_conditions: worker?.medical_conditions ?? "",
          medic_firm: worker?.medic_firm ?? "",
          medic_license_number: worker?.medic_license_number ?? "",
        }}
      />
    </main>
  );
}
