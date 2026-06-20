import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { faceUrl } from "@/lib/photos";
import { getExpiryStatus } from "@/lib/credentials";
import { QrActions } from "./qr-actions";

// RigWise gate id, derived from the worker's uuid. Mono, uppercase, stable.
function rigWiseId(uuid: string): string {
  const hex = uuid.replace(/[^0-9a-f]/gi, "").toUpperCase();
  return `RW-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export default async function WalletQrPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: worker } = await supabase
    .from("workers")
    .select("full_name, contractor_company, photo_url")
    .eq("id", user.id)
    .single();

  const { data: credentials } = await supabase
    .from("credentials")
    .select("expiry_date")
    .eq("worker_id", user.id);

  const qrSvg = await QRCode.toString(user.id, {
    type: "svg",
    margin: 1,
    width: 400,
    color: { dark: "#0E1116", light: "#FACC15" },
  });

  const fullName = worker?.full_name ?? user.email ?? "Worker";
  const company = worker?.contractor_company ?? null;
  const facePhoto = await faceUrl(worker?.photo_url);
  const rwId = rigWiseId(user.id);

  // Footer summary, driven by the worker's real wallet.
  const creds = credentials ?? [];
  const validCount = creds.filter(
    (c) => getExpiryStatus(c.expiry_date) !== "expired",
  ).length;
  const totalCount = creds.length;
  const ticketsLine =
    totalCount > 0
      ? `HOLD UP TO THE GATE SCANNER · ${validCount} OF ${totalCount} REQUIRED TICKETS VALID`
      : "HOLD UP TO THE GATE SCANNER";

  // Subtitle under the worker name — mono, uppercase. Company when present.
  const subtitle = company ? company.toUpperCase() : rwId;

  return (
    <main
      className="flex flex-1 flex-col"
      style={{
        position: "relative",
        background:
          "radial-gradient(120% 70% at 50% -10%, #1a1f25 0%, #0d0f12 55%)",
        color: "#f4f6f7",
      }}
    >
      {/* security / guilloché overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.4,
          backgroundImage:
            "repeating-radial-gradient(circle at 50% 40%, transparent 0 8px, rgba(255,255,255,0.04) 8px 9px),conic-gradient(from 10deg at 50% 42%, rgba(255,255,255,0.04), transparent 30%, rgba(255,255,255,0.03) 60%, transparent 90%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
          maxWidth: 384,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* header — back + RIGWISE wordmark */}
        <div
          style={{
            padding: "16px 28px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/wallet"
            aria-label="Back to wallet"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9aa3ab"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.2em",
                color: "#9aa3ab",
                fontWeight: 600,
              }}
            >
              GATE PASS
            </span>
          </Link>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#eef1f3" }}>
            RIG<span style={{ color: "#8b949c", fontWeight: 600 }}>WISE</span>
          </div>
        </div>

        {/* face */}
        <div
          style={{
            margin: "22px 28px 0",
            height: 230,
            borderRadius: 14,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
        >
          {facePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={facePhoto}
              alt={fullName}
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
                background:
                  "repeating-linear-gradient(135deg,#262c35 0 10px,#1d232b 10px 20px)",
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(160deg, rgba(242,88,28,0.12), transparent 50%, rgba(110,200,255,0.08))",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(120% 90% at 50% 0%, transparent 40%, rgba(0,0,0,0.5))",
            }}
          />
          <div
            className="mono"
            style={{
              position: "absolute",
              left: 14,
              top: 14,
              fontSize: 9,
              letterSpacing: "0.16em",
              color: "#7a838b",
            }}
          >
            WORKER PHOTO
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "14px 16px",
              background:
                "linear-gradient(0deg,rgba(13,15,18,0.9),transparent)",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: "-0.02em",
                color: "#f4f6f7",
              }}
            >
              {fullName}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "#9aa3ab",
                marginTop: 3,
                letterSpacing: "0.06em",
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        {/* QR — real, scannable. Keep the generated SVG; place it in the
            design's cream frame with the guilloché corner accent. */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 24,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 218,
              height: 218,
              borderRadius: 14,
              background: "#efe9dc",
              padding: 16,
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.1),0 16px 36px -14px rgba(0,0,0,0.6)",
            }}
          >
            <div
              className="qr-svg"
              style={{ width: "100%", height: "100%" }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div
              style={{
                position: "absolute",
                right: -1,
                top: -1,
                width: 34,
                height: 34,
                borderTopRightRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-50%",
                  background:
                    "conic-gradient(from 0deg,#ff8a3c,#8affd1,#6ec8ff,#c79bff,#ff8a3c)",
                  opacity: 0.9,
                  mixBlendMode: "screen",
                }}
              />
            </div>
          </div>
        </div>
        <div
          className="mono"
          style={{
            textAlign: "center",
            fontSize: 11,
            letterSpacing: "0.1em",
            color: "#c4ccd2",
            marginTop: 14,
          }}
        >
          {rwId}
        </div>

        {/* status */}
        <div style={{ marginTop: "auto", padding: "0 28px 26px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              height: 58,
              borderRadius: 11,
              background: "rgba(47,200,106,0.12)",
              border: "1px solid rgba(47,200,106,0.5)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2fd072"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span
              className="mono"
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#7ff0a8",
              }}
            >
              VALID FOR ENTRY
            </span>
          </div>
          <div
            className="mono"
            style={{
              textAlign: "center",
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "#5d666f",
              marginTop: 12,
            }}
          >
            {ticketsLine}
          </div>

          {/* Camera-fail fallback: ID disclosure + wake-lock / share / copy. */}
          <QrActions workerId={user.id} workerName={fullName} />
        </div>
      </div>

      {/* The real QR SVG fills its container, no inline width/height clobbering. */}
      <style>{`.qr-svg svg { width: 100%; height: 100%; display: block; }`}</style>
    </main>
  );
}
