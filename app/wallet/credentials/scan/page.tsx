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
      className="mx-auto flex w-full max-w-[384px] flex-1 flex-col px-6 pb-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 14px)" }}
    >
      {/* header (matches /wallet/credentials/new) */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link
          href="/wallet"
          aria-label="Back to wallet"
          style={{ display: "inline-flex", lineHeight: 0 }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9aa3ab"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div
          style={{
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-0.02em",
            color: "#f4f6f7",
          }}
        >
          Scan ticket
        </div>
      </div>

      <ScanForm holderName={worker?.full_name ?? ""} />
    </main>
  );
}
