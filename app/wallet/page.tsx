import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredentialLabel, getExpiryStatus } from "@/lib/credentials";

function shortId(uuid: string): string {
  return `RW-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`;
}

function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "there";
  const first = trimmed.split(/\s+/)[0];
  if (first.includes("@")) return first.split("@")[0];
  return first;
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

function fmtDate(value: string): string {
  return new Date(value)
    .toLocaleDateString("en-CA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function daysUntil(value: string): number {
  const ms = new Date(value).getTime() - new Date().getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function WalletPage(props: PageProps<"/wallet">) {
  const sp = await props.searchParams;
  const justSaved = typeof sp.saved === "string" ? sp.saved : null;

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

  const { data: credentials } = await supabase
    .from("credentials")
    .select("*")
    .eq("worker_id", user.id)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  const credentialsList = credentials ?? [];

  const validCount = credentialsList.filter(
    (c) => getExpiryStatus(c.expiry_date) === "valid",
  ).length;
  const expiringCount = credentialsList.filter(
    (c) => getExpiryStatus(c.expiry_date) === "expiring_soon",
  ).length;
  const expiredCount = credentialsList.filter(
    (c) => getExpiryStatus(c.expiry_date) === "expired",
  ).length;

  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id, check_in_at, site:sites(name, rig_name, rig_number)")
    .eq("worker_id", user.id)
    .eq("status", "ACTIVE")
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeSite = activeSession?.site
    ? Array.isArray(activeSession.site)
      ? activeSession.site[0]
      : activeSession.site
    : null;

  const fullName = worker?.full_name ?? user.email ?? "Worker";

  // Numeral display tokens from the approved design ("Display grotesk").
  const numFont = "var(--font-archivo),sans-serif";
  const numWeight = 800 as const;
  const numLs = "-0.03em";

  return (
    <main className="mx-auto w-full max-w-md flex-1">
      <div style={{ padding: "14px 22px 0" }}>
        {/* greeting */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#5d666f",
              }}
            >
              WALLET
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: "-0.02em",
                color: "#f4f6f7",
                marginTop: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {timeGreeting()}, {firstName(fullName)}
            </div>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              flex: "none",
              borderRadius: 10,
              background:
                "repeating-linear-gradient(135deg,#232932 0 5px,#1b2027 5px 10px)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.1) inset",
            }}
          />
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.04em",
            color: "#9aa3ab",
            marginTop: 6,
          }}
        >
          WORKER ID · {shortId(user.id)}
        </div>

        {justSaved && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 16,
              borderRadius: 9,
              background: "rgba(47,200,106,0.07)",
              border: "1px solid rgba(47,200,106,0.25)",
              padding: "11px 13px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                flex: "none",
                borderRadius: "50%",
                background: "#2fd072",
                boxShadow: "0 0 6px #2fd072",
              }}
            />
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.04em" }}>
              <span style={{ color: "#7ff0a8", fontWeight: 700 }}>
                {getCredentialLabel(justSaved).toUpperCase()}
              </span>
              <span style={{ color: "#9aa3ab" }}> ADDED TO YOUR WALLET</span>
            </div>
          </div>
        )}

        {activeSession && (
          <Link
            href="/wallet/session"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 16,
              borderRadius: 9,
              background: "rgba(47,200,106,0.07)",
              border: "1px solid rgba(47,200,106,0.25)",
              padding: "11px 13px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                flex: "none",
                borderRadius: "50%",
                background: "#2fd072",
                boxShadow: "0 0 6px #2fd072",
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: "#7ff0a8",
                  fontWeight: 700,
                }}
              >
                ON SITE NOW
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#f4f6f7",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeSite?.name}
                {activeSite?.rig_name && <> · {activeSite.rig_name}</>}
              </div>
            </div>
            <span style={{ color: "#7ff0a8" }}>›</span>
          </Link>
        )}

        {/* summary stats */}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <div
            style={{
              flex: 1,
              borderRadius: 9,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "11px 12px",
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 9, letterSpacing: "0.1em", color: "#5d666f" }}
            >
              TOTAL
            </div>
            <div
              style={{
                fontFamily: numFont,
                fontSize: 26,
                fontWeight: numWeight,
                letterSpacing: numLs,
                color: "#eef1f3",
                marginTop: 1,
              }}
            >
              {credentialsList.length}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 9,
              background: "rgba(47,200,106,0.07)",
              border: "1px solid rgba(47,200,106,0.25)",
              padding: "11px 12px",
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 9, letterSpacing: "0.1em", color: "#5d666f" }}
            >
              VALID
            </div>
            <div
              style={{
                fontFamily: numFont,
                fontSize: 26,
                fontWeight: numWeight,
                letterSpacing: numLs,
                color: "#7ff0a8",
                marginTop: 1,
              }}
            >
              {validCount}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 9,
              background: "rgba(242,164,12,0.07)",
              border: "1px solid rgba(242,164,12,0.25)",
              padding: "11px 12px",
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 9, letterSpacing: "0.1em", color: "#5d666f" }}
            >
              EXP
            </div>
            <div
              style={{
                fontFamily: numFont,
                fontSize: 26,
                fontWeight: numWeight,
                letterSpacing: numLs,
                color: "#ffd27a",
                marginTop: 1,
              }}
            >
              {expiringCount}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 9,
              background: "rgba(239,65,53,0.07)",
              border: "1px solid rgba(239,65,53,0.25)",
              padding: "11px 12px",
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 9, letterSpacing: "0.1em", color: "#5d666f" }}
            >
              DEAD
            </div>
            <div
              style={{
                fontFamily: numFont,
                fontSize: 26,
                fontWeight: numWeight,
                letterSpacing: numLs,
                color: "#ff9a8f",
                marginTop: 1,
              }}
            >
              {expiredCount}
            </div>
          </div>
        </div>
      </div>

      {/* card list */}
      <div
        style={{
          padding: "18px 22px 0",
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        <div
          className="mono"
          style={{ fontSize: 9, letterSpacing: "0.16em", color: "#5d666f" }}
        >
          YOUR TICKETS
        </div>

        {credentialsList.length === 0 ? (
          <div
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              background:
                "linear-gradient(152deg,#222831 0%,#191d23 60%,#14171c 100%)",
              boxShadow:
                "0 10px 24px -16px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.07)",
              padding: "26px 18px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: "#f2581c",
              }}
            />
            <div
              style={{
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: "-0.01em",
                color: "#f4f6f7",
              }}
            >
              Add your first ticket
            </div>
            <div
              className="mono"
              style={{
                fontSize: 9.5,
                color: "#9aa3ab",
                letterSpacing: "0.04em",
                marginTop: 8,
                lineHeight: 1.6,
              }}
            >
              H2S ALIVE · FIRST AID · CSO · WHATEVER YOU CARRY
            </div>
            <Link
              href="/wallet/credentials/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 16,
                height: 46,
                padding: "0 18px",
                borderRadius: 9,
                background: "#f2581c",
                boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
                fontWeight: 800,
                fontSize: 14,
                color: "#0d0f12",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0d0f12"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add credential
            </Link>
          </div>
        ) : (
          credentialsList.map((c) => {
            const status = getExpiryStatus(c.expiry_date);
            const isExpired = status === "expired";
            const isExpiring = status === "expiring_soon";
            const verified =
              c.verification_status === "MANUALLY_VERIFIED" ||
              c.verification_status === "VERIFIED_BY_ISSUER";

            const spine = isExpired
              ? "#5d666f"
              : isExpiring
                ? "#f2a40c"
                : "#f2581c";

            const titleColor = isExpired ? "#c4ccd2" : "#f4f6f7";

            // sub-line text + color
            let subText: string;
            let subColor: string;
            if (!c.expiry_date) {
              subText = "NO EXPIRY";
              subColor = "#9aa3ab";
            } else if (isExpired) {
              subText = `EXPIRED ${fmtDate(c.expiry_date)}`;
              subColor = "#ff9a8f";
            } else if (isExpiring) {
              const d = daysUntil(c.expiry_date);
              subText = `EXPIRES IN ${d} DAY${d === 1 ? "" : "S"}`;
              subColor = "#ffd27a";
            } else {
              subText = `VALID TO ${fmtDate(c.expiry_date)}`;
              subColor = "#9aa3ab";
            }

            // status pill
            const pill = isExpired
              ? {
                  bg: "rgba(239,65,53,0.14)",
                  line: "rgba(239,65,53,0.55)",
                  dot: "#ef4135",
                  fg: "#ff9a8f",
                  text: "EXPIRED",
                }
              : isExpiring
                ? {
                    bg: "rgba(242,164,12,0.14)",
                    line: "rgba(242,164,12,0.55)",
                    dot: "#f2a40c",
                    fg: "#ffd27a",
                    text: "EXPIRING",
                  }
                : {
                    bg: "rgba(47,200,106,0.12)",
                    line: "rgba(47,200,106,0.5)",
                    dot: "#2fd072",
                    fg: "#7ff0a8",
                    text: "VALID",
                  };

            return (
              <Link
                key={c.id}
                href={`/wallet/credentials/${c.id}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: isExpired
                    ? "linear-gradient(152deg,#1c2026 0%,#16191e 60%,#121418 100%)"
                    : "linear-gradient(152deg,#222831 0%,#191d23 60%,#14171c 100%)",
                  filter: isExpired ? "grayscale(0.4) brightness(0.9)" : undefined,
                  boxShadow: isExpired
                    ? "0 10px 24px -16px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.05)"
                    : "0 10px 24px -16px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.07)",
                  padding: "14px 15px 14px 18px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: spine,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 17,
                        letterSpacing: "-0.01em",
                        color: titleColor,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getCredentialLabel(c.credential_type)}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 9.5,
                        color: subColor,
                        marginTop: 4,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {subText}
                    </div>
                    {!verified && (
                      <div
                        className="mono"
                        style={{
                          marginTop: 5,
                          fontSize: 8.5,
                          letterSpacing: "0.1em",
                          color: "#ffb27a",
                        }}
                      >
                        ● SELF-ENTERED · UNVERIFIED
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flex: "none",
                      padding: "5px 9px",
                      borderRadius: 5,
                      background: pill.bg,
                      border: `1px solid ${pill.line}`,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: pill.dot,
                        boxShadow: `0 0 6px ${pill.dot}`,
                      }}
                    />
                    <span
                      className="mono"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: pill.fg,
                      }}
                    >
                      {pill.text}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* bottom actions */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 18,
          padding: "14px 22px 22px",
          display: "flex",
          gap: 10,
          background: "linear-gradient(0deg,#0d0f12 60%,transparent)",
        }}
      >
        <Link
          href="/wallet/qr"
          style={{
            flex: 1,
            height: 52,
            borderRadius: 9,
            background: "#f2581c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0d0f12"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h3v3M21 21v.01M17 21h.01M21 17v.01" />
          </svg>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#0d0f12" }}>
            Show gate pass
          </span>
        </Link>
        <Link
          href="/wallet/credentials/new"
          style={{
            width: 52,
            height: 52,
            borderRadius: 9,
            background: "#15191e",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f2581c"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
    </main>
  );
}
