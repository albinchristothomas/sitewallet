import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";
import { MedicProfileForm } from "./profile-form";

export default async function MedicProfilePage(
  props: PageProps<"/medic/profile">,
) {
  const sp = await props.searchParams;
  const saved = sp.saved === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: medic } = await supabase
    .from("workers")
    .select(
      "full_name, phone, medic_license_number, medic_firm, account_type",
    )
    .eq("id", user.id)
    .single();

  // Only medics should be here.
  if (medic?.account_type && medic.account_type !== "MEDIC") {
    redirect("/wallet/profile");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pb-10 pt-5">
      <Link
        href="/medic"
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Medic
      </Link>
      <header className="mt-3">
        <Eyebrow className="mb-1">Profile</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Your details</h1>
        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
          Goes onto every end-of-day report as the signing medic.
        </p>
      </header>

      {saved && (
        <div className="mt-4 rounded-xl border border-[color:rgba(16,185,129,0.32)] bg-[color:rgba(16,185,129,0.10)] px-4 py-3 text-[13px] text-[color:#34D399]">
          ✓ Saved.
        </div>
      )}

      <div className="mt-6">
        <MedicProfileForm
          email={user.email ?? ""}
          initial={{
            fullName: medic?.full_name ?? "",
            phone: medic?.phone ?? "",
            medicFirm: medic?.medic_firm ?? "",
            medicLicenseNumber: medic?.medic_license_number ?? "",
          }}
        />
      </div>
    </main>
  );
}
