import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScanForm } from "./scan-form";

export default async function ScanCredentialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: worker } = await supabase
    .from("workers")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <main
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/wallet"
          aria-label="Back to wallet"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-[22px] leading-none text-[color:var(--text-dim)] hover:bg-[color:var(--ink-2)] hover:text-[color:var(--text)]"
        >
          ←
        </Link>
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-faint)]">
          Scan ticket
        </div>
        <div className="w-11" />
      </div>

      <ScanForm holderName={worker?.full_name ?? ""} />
    </main>
  );
}
