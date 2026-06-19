import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Check, X, ShieldCheck, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCredentialLabel } from "@/lib/credentials";
import { Avatar, Eyebrow, getInitials } from "@/lib/atoms";
import { faceUrl } from "@/lib/photos";
import { admitWorker, markVerified } from "./actions";

type Compliance = {
  credential_type: string;
  status: "VALID" | "EXPIRED" | "MISSING";
  expiry_date: string | null;
  credential_id: string | null;
  verification_status: "UNVERIFIED" | "MANUALLY_VERIFIED" | "VERIFIED_BY_ISSUER" | "REJECTED" | null;
  external_verification_url: string | null;
};

type CompliancePayload = {
  worker: { id: string; full_name: string | null; photo_url: string | null };
  required: string[];
  credentials: Array<{
    id: string;
    credential_type: string;
    issuer: string | null;
    certificate_number: string | null;
    expiry_date: string | null;
  }>;
  compliance: Compliance[];
  evaluated_at: string;
};

function shortId(uuid: string): string {
  return `SW-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`;
}

export default async function VerifyWorkerPage(
  props: PageProps<"/medic/[siteId]/verify/[workerId]">,
) {
  const { siteId, workerId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("worker_compliance_for_site", {
    p_worker_id: workerId,
    p_site_id: siteId,
  });

  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <Link
          href={`/medic/${siteId}/scan`}
          className="text-sm text-[color:var(--text-dim)]"
        >
          ← Scan
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Couldn&apos;t look up this worker
        </h1>
        <p className="mt-2 text-sm text-[color:var(--text-dim)]">
          They may not have signed up yet, or the QR was for a different
          system.
        </p>
        <p className="mt-2 font-mono text-[11px] text-[color:#F87171]">
          {error?.message ?? "Worker not found."}
        </p>
        <Link
          href={`/medic/${siteId}/scan`}
          className="mt-6 inline-block rounded-xl bg-[color:var(--hi-yellow)] px-5 py-3 text-sm font-bold text-[color:var(--ink-1)] hover:brightness-95"
        >
          Try another scan
        </Link>
      </main>
    );
  }

  const payload = data as CompliancePayload;
  const allPass = payload.compliance.every((c) => c.status === "VALID");
  const facePhoto = await faceUrl(payload.worker.photo_url);
  const hasPhoto = Boolean(facePhoto);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-8 pt-4">
      <Link
        href={`/medic/${siteId}/scan`}
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Scan another
      </Link>

      <div
        className="mt-3 overflow-hidden rounded-3xl"
        style={{
          background: allPass
            ? "linear-gradient(180deg, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.04) 100%)"
            : "linear-gradient(180deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.04) 100%)",
          border: allPass
            ? "1px solid rgba(16,185,129,0.40)"
            : "1px solid rgba(239,68,68,0.40)",
        }}
      >
        <div className="flex items-center gap-5 p-6">
          <Avatar
            initials={getInitials(payload.worker.full_name)}
            size={84}
            photoUrl={facePhoto}
          />
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{
                color: allPass ? "#34D399" : "#F87171",
              }}
            >
              {allPass ? "Compliant · OK to admit" : "Not compliant"}
            </div>
            <div className="mt-1 truncate text-[28px] font-bold leading-tight">
              {payload.worker.full_name ?? "Unnamed worker"}
            </div>
            <div className="mt-1 font-mono text-[12px] text-[color:var(--text-dim)]">
              {shortId(payload.worker.id)}
            </div>
          </div>
        </div>

        <div
          className="px-6 py-3.5 text-center text-[44px] font-extrabold tracking-tight"
          style={{
            background: allPass ? "rgba(16,185,129,0.20)" : "rgba(239,68,68,0.20)",
            color: allPass ? "#10B981" : "#EF4444",
            borderTop: allPass
              ? "1px solid rgba(16,185,129,0.30)"
              : "1px solid rgba(239,68,68,0.30)",
          }}
        >
          {allPass ? "PASS" : "FAIL"}
        </div>
      </div>

      {/* Face-match prompt — the medic's job */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--ink-3)] text-[color:var(--hi-yellow)]">
          <Eye size={18} strokeWidth={1.75} />
        </div>
        <div className="text-[13px] leading-relaxed">
          <div className="font-semibold">Check the person at the gate</div>
          <div className="mt-1 text-[color:var(--text-dim)]">
            {hasPhoto
              ? "Compare the photo above to the person standing in front of you. If they don't match, deny entry."
              : "No photo on file for this worker yet. Ask for government ID and confirm the name above matches."}
          </div>
        </div>
      </div>

      <Eyebrow className="mt-6 mb-3">Required credentials</Eyebrow>

      <ul className="space-y-2">
        {payload.compliance.map((c) => {
          const isValid = c.status === "VALID";
          const isExpired = c.status === "EXPIRED";
          const isMissing = c.status === "MISSING";
          const tint = isValid ? "#10B981" : "#EF4444";
          const isVerified =
            c.verification_status === "MANUALLY_VERIFIED" ||
            c.verification_status === "VERIFIED_BY_ISSUER";
          const canVerify = isValid && !isVerified && c.credential_id && c.external_verification_url;
          return (
            <li
              key={c.credential_type}
              className="rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-4 py-3.5"
              style={{ borderLeft: `3px solid ${tint}` }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold">
                      {getCredentialLabel(c.credential_type)}
                    </span>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color:rgba(16,185,129,0.18)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:#34D399]">
                        <ShieldCheck size={11} strokeWidth={2} /> Verified
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[12px] text-[color:var(--text-faint)]">
                    {isMissing && "Not in wallet"}
                    {isExpired && c.expiry_date && (
                      <>
                        Expired{" "}
                        {new Date(c.expiry_date).toLocaleDateString("en-CA", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </>
                    )}
                    {isValid && c.expiry_date && (
                      <>
                        Valid until{" "}
                        {new Date(c.expiry_date).toLocaleDateString("en-CA", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </>
                    )}
                    {isValid && !c.expiry_date && "Valid · no expiry"}
                  </div>
                </div>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isValid
                      ? "rgba(16,185,129,0.20)"
                      : "rgba(239,68,68,0.20)",
                    color: tint,
                  }}
                >
                  {isValid ? (
                    <Check size={18} strokeWidth={2.2} />
                  ) : (
                    <X size={18} strokeWidth={2.2} />
                  )}
                </div>
              </div>
              {canVerify && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[color:var(--hair)] pt-3">
                  <a
                    href={c.external_verification_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--hair-strong)] text-[12px] font-semibold text-[color:var(--text-dim)] hover:bg-[color:var(--ink-3)] hover:text-[color:var(--text)]"
                  >
                    <ExternalLink size={14} strokeWidth={1.75} /> Verify with issuer
                  </a>
                  <form action={markVerified.bind(null, siteId, workerId, c.credential_id!)}>
                    <button
                      type="submit"
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[color:rgba(16,185,129,0.18)] text-[12px] font-bold text-[color:#34D399] hover:bg-[color:rgba(16,185,129,0.28)]"
                    >
                      <ShieldCheck size={14} strokeWidth={2} /> Mark verified
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
        {payload.compliance.length === 0 && (
          <li className="rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-4 py-3.5 text-sm text-[color:var(--text-dim)]">
            This site has no required credentials configured.
          </li>
        )}
      </ul>

      {!allPass && (
        <div className="mt-6 rounded-xl border border-[color:rgba(239,68,68,0.30)] bg-[color:rgba(239,68,68,0.10)] p-4 text-[13px] leading-relaxed">
          <div className="font-semibold text-[color:#F87171]">
            Heads up — admitting anyway is an override
          </div>
          <div className="mt-1 text-[color:var(--text-dim)]">
            It&apos;s recorded in the audit log with your medic ID. Only use
            when you&apos;ve verified another way (paper card, phone call to
            issuer, etc.).
          </div>
        </div>
      )}

      <form
        action={admitWorker.bind(null, siteId, workerId, payload)}
        className="mt-4"
      >
        <button
          type="submit"
          className="h-[64px] w-full rounded-xl text-[17px] font-bold tracking-[0.01em]"
          style={
            allPass
              ? {
                  background: "#10B981",
                  color: "#062B1F",
                }
              : {
                  background: "var(--hi-yellow)",
                  color: "var(--ink-1)",
                }
          }
        >
          {allPass ? "Admit worker" : "Admit anyway (override)"}
        </button>
      </form>
    </main>
  );
}
