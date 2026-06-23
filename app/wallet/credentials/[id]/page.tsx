import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { faceUrl } from "@/lib/photos";
import { getCredentialLabel, getExpiryStatus } from "@/lib/credentials";
import {
  CredentialCard,
  type CredentialCardData,
  type CardState,
} from "@/lib/credential-card";

const MONO = "var(--font-jetbrains-mono), ui-monospace, monospace";

function fmtCardDate(d: string | null): string {
  if (!d) return "NO EXPIRY";
  return new Date(d + "T00:00:00")
    .toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/\./g, "")
    .toUpperCase();
}

function seedFrom(id: string): number {
  let s = 0;
  for (const ch of id.slice(0, 12)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return s || 1;
}

export const metadata = { title: "Credential" };

export default async function CredentialDetailPage(
  props: PageProps<"/wallet/credentials/[id]">,
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: c } = await supabase
    .from("credentials")
    .select("*")
    .eq("id", id)
    .eq("worker_id", user.id)
    .maybeSingle();

  if (!c) {
    return (
      <main className="mx-auto w-full max-w-[460px] flex-1 px-5 py-10">
        <Link
          href="/wallet"
          className="mono"
          style={{ fontSize: 11, color: "#9aa3ab", textTransform: "uppercase", letterSpacing: "0.1em" }}
        >
          ← Wallet
        </Link>
        <p style={{ marginTop: 24, color: "#9aa3ab" }}>
          That credential wasn&apos;t found in your wallet.
        </p>
      </main>
    );
  }

  const { data: worker } = await supabase
    .from("workers")
    .select("full_name, contractor_company, photo_url")
    .eq("id", user.id)
    .single();

  const verified =
    c.verification_status === "MANUALLY_VERIFIED" ||
    c.verification_status === "VERIFIED_BY_ISSUER";

  const expiry = getExpiryStatus(c.expiry_date);
  const state: CardState =
    expiry === "expired" ? "expired" : expiry === "expiring_soon" ? "expiring" : "valid";

  const label = getCredentialLabel(c.credential_type);
  const photoUrl = await faceUrl(worker?.photo_url);
  const idUp = id.replace(/-/g, "").toUpperCase();

  const data: CredentialCardData = {
    issuerLine1: (c.issuer ?? "RIGWISE").toUpperCase(),
    issuerSub: "ISSUING BODY · CAN",
    category: verified ? "VERIFIED · SAFETY TICKET" : "SELF-ENTERED · SAFETY TICKET",
    title: label.toUpperCase(),
    subtitle: verified ? "Verified credential" : "Self-entered — confirm at the gate",
    holderName: worker?.full_name ?? "Worker",
    holderRole: (worker?.contractor_company ?? "WORKER").toUpperCase(),
    certNo: c.certificate_number ?? "—",
    issued: c.issue_date ? fmtCardDate(c.issue_date) : "—",
    expires: fmtCardDate(c.expiry_date),
    serial: `${idUp.slice(0, 4)} ${idUp.slice(4, 8)} ${idUp.slice(8, 9)}`,
    verifyUrl: c.external_verification_url ?? undefined,
    photoUrl,
    qrSeed: seedFrom(id),
  };

  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 pb-12 pt-4">
      <Link
        href="/wallet"
        className="mono"
        style={{
          fontSize: 11,
          color: "#9aa3ab",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          textDecoration: "none",
        }}
      >
        ← Wallet
      </Link>

      <div style={{ marginTop: 18 }}>
        <CredentialCard data={data} state={state} />
      </div>

      <div
        style={{
          marginTop: 22,
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "#5d666f",
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        Tap card to flip · move to tilt
      </div>

      {/* verification reality */}
      <div
        style={{
          marginTop: 18,
          borderRadius: 10,
          border: `1px solid ${verified ? "rgba(47,200,106,0.4)" : "rgba(242,164,12,0.4)"}`,
          background: verified ? "rgba(47,200,106,0.08)" : "rgba(242,164,12,0.08)",
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: verified ? "#7ff0a8" : "#ffd27a",
          }}
        >
          {verified ? "● Verified" : "● Self-entered · unverified"}
        </div>
        <p style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.5, color: "#9aa3ab" }}>
          {verified
            ? "A medic has confirmed this ticket against the issuer."
            : c.external_verification_url
              ? "This card carries an issuer QR. The medic can verify it with the issuer at the gate."
              : "You entered this yourself. The medic will check your physical card at the gate before it counts."}
        </p>
      </div>
    </main>
  );
}
