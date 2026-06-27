import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCredentialLabel } from "@/lib/credentials";
import { getInitials } from "@/lib/atoms";
import { faceUrl, ticketPhotoUrl } from "@/lib/photos";
import { CardPhotoViewer } from "@/lib/card-photo-viewer";
import { admitWorker, denyWorker, markVerified } from "./actions";

type Compliance = {
  credential_type: string;
  status: "VALID" | "EXPIRED" | "MISSING";
  expiry_date: string | null;
  credential_id: string | null;
  verification_status: "UNVERIFIED" | "MANUALLY_VERIFIED" | "VERIFIED_BY_ISSUER" | "REJECTED" | null;
  external_verification_url: string | null;
  photo_url: string | null;
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
    verification_status: Compliance["verification_status"];
    photo_url: string | null;
  }>;
  compliance: Compliance[];
  evaluated_at: string;
};

function shortId(uuid: string): string {
  return `RW-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`;
}

function formatDate(value: string): string {
  return new Date(value)
    .toLocaleDateString("en-CA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
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
  const isVerifiedRow = (c: Compliance) =>
    c.verification_status === "MANUALLY_VERIFIED" ||
    c.verification_status === "VERIFIED_BY_ISSUER";
  // Valid tickets the worker typed in but no medic/issuer has confirmed yet.
  const unverifiedValid = payload.compliance.filter(
    (c) => c.status === "VALID" && !isVerifiedRow(c),
  ).length;
  const facePhoto = await faceUrl(payload.worker.photo_url);
  const hasPhoto = Boolean(facePhoto);

  // Sign every ticket's card photo (private "ticket-photos" bucket) so the medic
  // can open the real card at the gate, not just trust a "VALID" badge. Keyed by
  // credential id — covers both the required rows and the "also on file" list.
  const cardPhotos = new Map<string, string>();
  await Promise.all(
    (payload.credentials ?? []).map(async (cr) => {
      if (cr.id && cr.photo_url) {
        const url = await ticketPhotoUrl(cr.photo_url);
        if (url) cardPhotos.set(cr.id, url);
      }
    }),
  );

  // Tickets the worker carries that this site doesn't require — shown as a
  // secondary "also on file" list so the medic sees everything available.
  const requiredSet = new Set(payload.required);
  const extraCredentials = (payload.credentials ?? []).filter(
    (cr) => !requiredSet.has(cr.credential_type),
  );

  const total = payload.compliance.length;
  const expiredCount = payload.compliance.filter((c) => c.status === "EXPIRED").length;
  const missingCount = payload.compliance.filter((c) => c.status === "MISSING").length;

  const name = payload.worker.full_name ?? "Unnamed worker";
  const idLine = shortId(payload.worker.id);

  // ADMIT readout subline + DENY summary subline.
  const admitSub =
    unverifiedValid > 0
      ? `${unverifiedValid} SELF-ENTERED · VERIFY OR ADMIT ON SIGHT`
      : `ALL ${total} REQUIRED TICKET${total === 1 ? "" : "S"} VERIFIED`;
  const admitSubColor = unverifiedValid > 0 ? "#ffd27a" : "#7ff0a8";
  const denyParts: string[] = [];
  if (expiredCount > 0) denyParts.push(`${expiredCount} EXPIRED`);
  if (missingCount > 0) denyParts.push(`${missingCount} MISSING`);
  const denySub =
    denyParts.length > 0 ? `NOT COMPLIANT — ${denyParts.join(", ")}` : "NOT COMPLIANT";

  // Reason text for the DENY field.
  const reasonParts: string[] = [];
  if (expiredCount > 0)
    reasonParts.push(expiredCount === 1 ? "1 ticket expired" : `${expiredCount} tickets expired`);
  if (missingCount > 0)
    reasonParts.push(missingCount === 1 ? "1 ticket missing" : `${missingCount} tickets missing`);
  const reasonText = reasonParts.length > 0 ? reasonParts.join(", ") : "Not compliant";

  return (
    <main className="mx-auto w-full max-w-[420px] flex-1 pb-8">
      <div className="px-5 pt-4">
        <Link
          href={`/medic/${siteId}/scan`}
          className="mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
        >
          ← Scan another
        </Link>
      </div>

      <div
        className="mt-3 overflow-hidden rounded-[24px]"
        style={{
          background: "#0d0f12",
          boxShadow:
            "0 30px 60px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex flex-col">
          {/* gate header strip */}
          <div
            className="flex h-[30px] items-center justify-between px-[22px]"
            style={{ background: "#0d0f12" }}
          >
            <span
              className="mono text-[11px]"
              style={{ color: "#c4ccd2" }}
            >
              {idLine}
            </span>
            <span
              className="mono text-[9px]"
              style={{ color: "#c4ccd2", letterSpacing: "0.1em" }}
            >
              GATE · VERIFY
            </span>
          </div>

          {/* big face panel */}
          <div style={{ position: "relative", height: 300, overflow: "hidden" }}>
            {hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={facePhoto!}
                alt={name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: allPass
                    ? "repeating-linear-gradient(135deg,#262c35 0 11px,#1d232b 11px 22px)"
                    : "repeating-linear-gradient(135deg,#2b2530 0 11px,#231d24 11px 22px)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 64,
                    letterSpacing: "-0.02em",
                    color: "rgba(244,246,247,0.22)",
                  }}
                >
                  {getInitials(payload.worker.full_name)}
                </div>
              </div>
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: allPass
                  ? "linear-gradient(160deg, rgba(47,200,106,0.14), transparent 45%, rgba(110,200,255,0.06))"
                  : "linear-gradient(160deg, rgba(239,65,53,0.16), transparent 50%, rgba(80,80,90,0.1))",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(110% 80% at 50% 10%, transparent 45%, rgba(0,0,0,0.6))",
              }}
            />
            <div
              className="mono"
              style={{
                position: "absolute",
                left: 16,
                top: 14,
                fontSize: 9,
                letterSpacing: "0.16em",
                color: "#7a838b",
              }}
            >
              {hasPhoto ? "PHOTO ON FILE · COMPARE TO PERSON" : "NO PHOTO ON FILE · CHECK GOVT ID"}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "16px 20px",
                background:
                  "linear-gradient(0deg,rgba(13,15,18,0.95),transparent)",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 30,
                  letterSpacing: "-0.02em",
                  color: "#f4f6f7",
                }}
              >
                {name}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "#9aa3ab",
                  marginTop: 4,
                  letterSpacing: "0.06em",
                }}
              >
                {idLine}
              </div>
            </div>
          </div>

          {/* verdict readout */}
          {allPass ? (
            <div
              style={{
                margin: "18px 20px 0",
                borderRadius: 14,
                background:
                  "linear-gradient(180deg,rgba(47,200,106,0.18),rgba(47,200,106,0.07))",
                border: "1.5px solid rgba(47,200,106,0.6)",
                boxShadow: "0 0 30px -6px rgba(47,200,106,0.4)",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "rgba(47,200,106,0.18)",
                  border: "2px solid #2fd072",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2fd072"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 42,
                    letterSpacing: "0.02em",
                    color: "#7ff0a8",
                    lineHeight: 0.9,
                  }}
                >
                  ADMIT
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    color: admitSubColor,
                    marginTop: 5,
                  }}
                >
                  {admitSub}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                margin: "18px 20px 0",
                borderRadius: 14,
                background:
                  "linear-gradient(180deg,rgba(239,65,53,0.2),rgba(239,65,53,0.08))",
                border: "1.5px solid rgba(239,65,53,0.65)",
                boxShadow: "0 0 30px -6px rgba(239,65,53,0.45)",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "rgba(239,65,53,0.2)",
                  border: "2px solid #ef4135",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4135"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 42,
                    letterSpacing: "0.02em",
                    color: "#ff9a8f",
                    lineHeight: 0.9,
                  }}
                >
                  DENY
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    color: "#ff9a8f",
                    marginTop: 5,
                  }}
                >
                  {denySub}
                </div>
              </div>
            </div>
          )}

          {/* per-ticket list */}
          <div
            style={{
              padding: "16px 20px 0",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.16em",
                color: "#5d666f",
                marginBottom: 2,
              }}
            >
              REQUIRED FOR THIS SITE
            </div>

            {payload.compliance.map((c) => {
              const isValid = c.status === "VALID";
              const isExpired = c.status === "EXPIRED";
              const isMissing = c.status === "MISSING";
              const isVerified =
                c.verification_status === "MANUALLY_VERIFIED" ||
                c.verification_status === "VERIFIED_BY_ISSUER";
              const selfEntered = isValid && !isVerified;
              // Medic can mark ANY valid ticket verified after reviewing the
              // card/photo — not only ones carrying an issuer QR.
              const canVerify = isValid && !isVerified && Boolean(c.credential_id);
              const hasIssuerUrl = Boolean(c.external_verification_url);
              const cardUrl = c.credential_id
                ? cardPhotos.get(c.credential_id)
                : undefined;

              // Row colour treatment.
              const rowBg = isValid
                ? "rgba(47,200,106,0.06)"
                : "rgba(239,65,53,0.09)";
              const rowBorder = isValid
                ? "1px solid rgba(47,200,106,0.22)"
                : "1px solid rgba(239,65,53,0.45)";
              const titleColor = isValid ? "#eef1f3" : "#f4f6f7";
              const metaColor = isValid ? "#9aa3ab" : "#ff9a8f";
              const pillColor = isValid ? "#7ff0a8" : "#ff9a8f";
              const pillLabel = isValid ? "VALID" : isExpired ? "EXPIRED" : "MISSING";

              let meta = "";
              if (isMissing) meta = "NOT ON FILE";
              else if (isExpired)
                meta = c.expiry_date ? `EXPIRED ${formatDate(c.expiry_date)}` : "EXPIRED";
              else if (isValid)
                meta = c.expiry_date ? `VALID TO ${formatDate(c.expiry_date)}` : "VALID · NO EXPIRY";

              return (
                <div key={c.credential_type}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 13px",
                      borderRadius: 9,
                      background: rowBg,
                      border: rowBorder,
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: titleColor,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        {getCredentialLabel(c.credential_type)}
                        {isVerified && (
                          <span
                            className="mono"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 8,
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              color: "#7ff0a8",
                              background: "rgba(47,200,106,0.18)",
                              borderRadius: 999,
                              padding: "2px 6px",
                            }}
                          >
                            <ShieldCheck size={9} strokeWidth={2.4} /> VERIFIED
                          </span>
                        )}
                        {selfEntered && (
                          <span
                            className="mono"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 8,
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              color: "#ffd27a",
                              background: "rgba(242,164,12,0.16)",
                              borderRadius: 999,
                              padding: "2px 6px",
                            }}
                          >
                            ● SELF-ENTERED
                          </span>
                        )}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 9, color: metaColor, marginTop: 2 }}
                      >
                        {meta}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flex: "none",
                      }}
                    >
                      {cardUrl && (
                        <CardPhotoViewer
                          src={cardUrl}
                          label={getCredentialLabel(c.credential_type)}
                        />
                      )}
                      <span
                        className="mono"
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          color: pillColor,
                        }}
                      >
                        ● {pillLabel}
                      </span>
                    </div>
                  </div>

                  {canVerify && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: hasIssuerUrl ? "1fr 1fr" : "1fr",
                        gap: 8,
                        marginTop: 7,
                      }}
                    >
                      {hasIssuerUrl && (
                        <a
                          href={c.external_verification_url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono"
                          style={{
                            height: 38,
                            borderRadius: 9,
                            background: "#15191e",
                            border: "1px solid rgba(255,255,255,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            color: "#c4ccd2",
                          }}
                        >
                          <ExternalLink size={12} strokeWidth={1.9} /> ISSUER
                        </a>
                      )}
                      <form
                        action={markVerified.bind(
                          null,
                          siteId,
                          workerId,
                          c.credential_id!,
                        )}
                      >
                        <button
                          type="submit"
                          className="mono"
                          style={{
                            width: "100%",
                            height: 38,
                            borderRadius: 9,
                            background: "rgba(47,200,106,0.18)",
                            border: "1px solid rgba(47,200,106,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            color: "#7ff0a8",
                          }}
                        >
                          <ShieldCheck size={12} strokeWidth={2.2} /> MARK VERIFIED
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}

            {payload.compliance.length === 0 && (
              <div
                className="mono"
                style={{
                  padding: "11px 13px",
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 10,
                  color: "#9aa3ab",
                }}
              >
                NO REQUIRED CREDENTIALS CONFIGURED FOR THIS SITE
              </div>
            )}
          </div>

          {/* also on file — the worker's other tickets, each tap-to-view */}
          {extraCredentials.length > 0 && (
            <div
              style={{
                padding: "18px 20px 0",
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  color: "#5d666f",
                  marginBottom: 2,
                }}
              >
                ALSO ON FILE · NOT REQUIRED HERE
              </div>

              {extraCredentials.map((cr) => {
                const verified =
                  cr.verification_status === "MANUALLY_VERIFIED" ||
                  cr.verification_status === "VERIFIED_BY_ISSUER";
                const cardUrl = cardPhotos.get(cr.id);
                const expired = cr.expiry_date
                  ? new Date(cr.expiry_date) < new Date()
                  : false;
                const metaTxt = expired
                  ? `EXPIRED ${formatDate(cr.expiry_date!)}`
                  : cr.expiry_date
                    ? `VALID TO ${formatDate(cr.expiry_date)}`
                    : "NO EXPIRY";
                return (
                  <div
                    key={cr.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 13px",
                      borderRadius: 9,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#cdd3d8",
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        {getCredentialLabel(cr.credential_type)}
                        <span
                          className="mono"
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            color: verified ? "#7ff0a8" : "#ffd27a",
                            background: verified
                              ? "rgba(47,200,106,0.16)"
                              : "rgba(242,164,12,0.14)",
                            borderRadius: 999,
                            padding: "2px 6px",
                          }}
                        >
                          {verified ? "VERIFIED" : "SELF-ENTERED"}
                        </span>
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 9,
                          color: expired ? "#ff9a8f" : "#7a838b",
                          marginTop: 2,
                        }}
                      >
                        {metaTxt}
                      </div>
                    </div>
                    {cardUrl ? (
                      <CardPhotoViewer
                        src={cardUrl}
                        label={getCredentialLabel(cr.credential_type)}
                      />
                    ) : (
                      <span
                        className="mono"
                        style={{
                          fontSize: 8,
                          letterSpacing: "0.1em",
                          color: "#5d666f",
                          flex: "none",
                        }}
                      >
                        NO PHOTO
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* action footer */}
          {allPass ? (
            <div
              style={{
                padding: "14px 20px 22px",
                display: "flex",
                gap: 10,
              }}
            >
              <form
                action={denyWorker.bind(
                  null,
                  siteId,
                  workerId,
                  "ID or face mismatch — medic discretion",
                )}
                style={{ flex: "none" }}
              >
                <button
                  type="submit"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 9,
                    background: "#15191e",
                    border: "1px solid rgba(239,65,53,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#ff9a8f",
                    }}
                  >
                    DENY
                  </span>
                </button>
              </form>
              <form
                action={admitWorker.bind(null, siteId, workerId, payload)}
                style={{ flex: 1 }}
              >
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    height: 54,
                    borderRadius: 9,
                    background: "#2fd072",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 8px 20px -8px rgba(47,200,106,0.6)",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0d0f12"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span
                    style={{ fontWeight: 800, fontSize: 16, color: "#0d2417" }}
                  >
                    Admit worker
                  </span>
                </button>
              </form>
            </div>
          ) : (
            <div style={{ padding: "14px 20px 22px" }}>
              <div
                className="mono"
                style={{
                  minHeight: 42,
                  borderRadius: 9,
                  background: "#15191e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  fontSize: 11,
                  color: "#6b747c",
                  marginBottom: 10,
                }}
              >
                REASON ·&nbsp;
                <span style={{ color: "#c4ccd2" }}>{reasonText}</span>
                <span
                  style={{
                    width: 2,
                    height: 15,
                    background: "#ef4135",
                    marginLeft: 3,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {/* "Deny entry" records a WORKER_DENIED event, then back to scan. */}
                <form
                  action={denyWorker.bind(null, siteId, workerId, reasonText)}
                  style={{ flex: 1 }}
                >
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      height: 54,
                      borderRadius: 9,
                      background: "#ef4135",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 8px 20px -8px rgba(239,65,53,0.6)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0d0f12"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                    <span
                      style={{ fontWeight: 800, fontSize: 16, color: "#2a0d0a" }}
                    >
                      Deny entry
                    </span>
                  </button>
                </form>
                {/* Override = admit anyway, recorded in the audit log. */}
                <form
                  action={admitWorker.bind(null, siteId, workerId, payload)}
                  style={{ flex: "none" }}
                >
                  <button
                    type="submit"
                    style={{
                      width: 84,
                      height: 54,
                      borderRadius: 9,
                      background: "#15191e",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    <span
                      className="mono"
                      style={{ fontSize: 9, color: "#9aa3ab" }}
                    >
                      OVERRIDE
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 8, color: "#5d666f", marginTop: 3 }}
                    >
                      ADMIT
                    </span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* face-match prompt — the medic's job (kept from original logic) */}
      <div
        className="mt-4 flex items-start gap-3 px-5"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "#15191e", color: "#f2581c" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
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

      {!allPass && (
        <div
          className="mx-5 mt-4 rounded-xl p-4 text-[13px] leading-relaxed"
          style={{
            background: "rgba(239,65,53,0.1)",
            border: "1px solid rgba(239,65,53,0.3)",
          }}
        >
          <div className="font-semibold" style={{ color: "#ff9a8f" }}>
            Heads up — admitting anyway is an override
          </div>
          <div className="mt-1 text-[color:var(--text-dim)]">
            It&apos;s recorded in the audit log with your medic ID. Only use
            when you&apos;ve verified another way (paper card, phone call to
            issuer, etc.).
          </div>
        </div>
      )}
    </main>
  );
}
