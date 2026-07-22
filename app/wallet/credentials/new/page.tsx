import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddCredentialForm } from "./add-credential-form";

export default async function NewCredentialPage(
  props: PageProps<"/wallet/credentials/new">,
) {
  const sp = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile name pre-fills "name on the card" (workers hated re-typing it),
  // and existing ticket types let the AI scan skip cards already in the wallet.
  const [{ data: worker }, { data: existing }] = await Promise.all([
    supabase.from("workers").select("full_name").eq("id", user.id).single(),
    supabase.from("credentials").select("credential_type").eq("worker_id", user.id),
  ]);
  const existingTypes = [
    ...new Set((existing ?? []).map((c) => c.credential_type)),
  ];

  const prefill = {
    type: typeof sp.type === "string" ? sp.type : "",
    issuer: typeof sp.issuer === "string" ? sp.issuer : "",
    cert: typeof sp.cert === "string" ? sp.cert : "",
    issue: typeof sp.issue === "string" ? sp.issue : "",
    expiry: typeof sp.expiry === "string" ? sp.expiry : "",
    holder:
      typeof sp.holder === "string" && sp.holder
        ? sp.holder
        : (worker?.full_name ?? ""),
    verifyUrl: typeof sp.verify_url === "string" ? sp.verify_url : "",
  };
  const wasPrefilled = Object.entries(prefill).some(
    ([k, v]) => k !== "holder" && v.length > 0,
  );

  return (
    <main className="mx-auto flex w-full max-w-[384px] flex-1 flex-col">
      {/* header */}
      <div
        style={{
          padding: "14px 24px 0",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
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
          Add a ticket
        </div>
      </div>

      {wasPrefilled && (
        <div
          className="mono"
          style={{
            margin: "14px 24px 0",
            borderRadius: 9,
            border: "1px solid rgba(47,200,106,0.5)",
            background: "rgba(47,200,106,0.12)",
            padding: "10px 14px",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "#7ff0a8",
          }}
        >
          ✓ DETAILS AUTO-FILLED FROM YOUR PHOTO · NOW PHOTOGRAPH THE CARD
          &amp; SAVE
        </div>
      )}

      <AddCredentialForm prefill={prefill} existingTypes={existingTypes} />
    </main>
  );
}
