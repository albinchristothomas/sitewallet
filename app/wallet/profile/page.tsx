import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";
import { ProfileForm } from "./profile-form";

export default async function WorkerProfilePage(
  props: PageProps<"/wallet/profile">,
) {
  const sp = await props.searchParams;
  const saved = sp.saved === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: worker } = await supabase
    .from("workers")
    .select(
      "full_name, phone, employee_number, contractor_company, account_type",
    )
    .eq("id", user.id)
    .single();

  // Only workers should be here. If a medic somehow lands here, push them home.
  if (worker?.account_type && worker.account_type !== "WORKER") {
    redirect("/medic/profile");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pb-10 pt-5">
      <Link
        href="/wallet"
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Wallet
      </Link>
      <header className="mt-3">
        <Eyebrow className="mb-1">Profile</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Your details</h1>
        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
          The medic sees this when you scan in. The oil company sees this on
          the daily roster.
        </p>
      </header>

      {saved && (
        <div className="mt-4 rounded-xl border border-[color:rgba(16,185,129,0.32)] bg-[color:rgba(16,185,129,0.10)] px-4 py-3 text-[13px] text-[color:#34D399]">
          ✓ Saved.
        </div>
      )}

      <div className="mt-6">
        <ProfileForm
          email={user.email ?? ""}
          initial={{
            fullName: worker?.full_name ?? "",
            phone: worker?.phone ?? "",
            employeeNumber: worker?.employee_number ?? "",
            contractorCompany: worker?.contractor_company ?? "",
          }}
        />
      </div>
    </main>
  );
}
