import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredentialLabel } from "@/lib/credentials";
import { siteTime, siteToday } from "@/lib/dates";

export default async function MedicSitePage(
  props: PageProps<"/medic/[siteId]">,
) {
  const { siteId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, name, rig_name, rig_number, lsd_location, muster_point, project:projects(name, requirements_profile:requirements_profiles(required_credential_types), operator:companies(name))",
    )
    .eq("id", siteId)
    .single();

  const today = siteToday(); // YYYY-MM-DD at the wellsite (America/Edmonton)

  const [{ data: active }, { data: denials }] = await Promise.all([
    supabase.rpc("active_sessions_for_site", { p_site_id: siteId }),
    supabase.rpc("daily_denials", { p_site_id: siteId, p_day: today }),
  ]);

  const project = site?.project
    ? Array.isArray(site.project)
      ? site.project[0]
      : site.project
    : null;
  const operator = project
    ? Array.isArray(project.operator)
      ? project.operator[0]
      : project.operator
    : null;
  const reqProfile = project
    ? Array.isArray(project.requirements_profile)
      ? project.requirements_profile[0]
      : project.requirements_profile
    : null;
  const required: string[] = reqProfile?.required_credential_types ?? [];

  type ActiveRow = {
    session_id: string;
    worker_id: string;
    worker_name: string | null;
    check_in_at: string;
  };
  const activeList: ActiveRow[] = active ?? [];

  // ---- design tokens (from "Display grotesk" numerals default) ----
  const numFont = "var(--font-archivo), sans-serif";
  const numWeight = 800;
  const numLs = "-0.03em";

  // ---- derived display values bound into the design layout ----
  const wellHeadline = (
    site?.lsd_location?.trim() ||
    [site?.name, site?.rig_name && `· ${site.rig_name}`, site?.rig_number && `#${site.rig_number}`]
      .filter(Boolean)
      .join(" ") ||
    "ACTIVE SITE"
  ).toUpperCase();

  const operatorLine = operator?.name
    ? `${operator.name.toUpperCase()} · OPERATOR`
    : "OPERATOR";

  const muster = (site?.muster_point?.trim() || "PER SITE PLAN").toUpperCase();
  const onSiteCount = activeList.length;
  const deniedCount = (denials ?? []).length;

  const initialsOf = (name: string | null | undefined) => {
    if (!name) return "—";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const timeOf = siteTime;

  const monoFont = "'JetBrains Mono', monospace";
  const surfaceGradient =
    "linear-gradient(152deg,#222831 0%,#191d23 60%,#14171c 100%)";

  return (
    <main
      className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-0 pb-0"
      style={{ color: "#eef1f3" }}
    >
      <Link
        href="/medic"
        className="mx-[18px] mt-3 inline-block"
        style={{
          fontFamily: monoFont,
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "#5d666f",
        }}
      >
        ← ALL ASSIGNED SITES
      </Link>

      {/* ---- site header ---- */}
      <div
        style={{
          position: "relative",
          margin: "12px 18px 0",
          borderRadius: 14,
          overflow: "hidden",
          background: surfaceGradient,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.07)",
          padding: "16px 18px 16px 20px",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            background: "#f2581c",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 9,
                letterSpacing: "0.14em",
                color: "#5d666f",
              }}
            >
              ACTIVE SITE
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 19,
                letterSpacing: "-0.01em",
                color: "#f4f6f7",
                marginTop: 3,
              }}
            >
              {wellHeadline}
            </div>
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 10,
                color: "#9aa3ab",
                marginTop: 3,
              }}
            >
              {operatorLine}
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "#5d666f",
              }}
            >
              MUSTER
            </div>
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 13,
                color: "#f2581c",
                marginTop: 3,
                fontWeight: 600,
              }}
            >
              {muster}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 13,
            flexWrap: "wrap",
          }}
        >
          {required.length === 0 ? (
            <span
              style={{
                fontFamily: monoFont,
                fontSize: 8,
                letterSpacing: "0.08em",
                color: "#5d666f",
                padding: "4px 8px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              NO TICKETS REQUIRED
            </span>
          ) : (
            required.map((chip) => (
              <span
                key={chip}
                style={{
                  fontFamily: monoFont,
                  fontSize: 8,
                  letterSpacing: "0.08em",
                  color: "#c4ccd2",
                  padding: "4px 8px",
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {getCredentialLabel(chip).toUpperCase()}
              </span>
            ))
          )}
        </div>
      </div>

      {/* ---- live count ---- */}
      <div style={{ margin: "12px 18px 0", display: "flex", gap: 10 }}>
        <div
          style={{
            flex: 1,
            borderRadius: 12,
            background: "rgba(47,200,106,0.07)",
            border: "1px solid rgba(47,200,106,0.25)",
            padding: "13px 16px",
          }}
        >
          <div
            style={{
              fontFamily: monoFont,
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "#5d666f",
            }}
          >
            ON SITE NOW
          </div>
          <div
            style={{
              fontFamily: numFont,
              fontSize: 40,
              fontWeight: numWeight,
              letterSpacing: numLs,
              color: "#7ff0a8",
              lineHeight: 1,
              marginTop: 3,
            }}
          >
            {onSiteCount}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "13px 16px",
          }}
        >
          <div
            style={{
              fontFamily: monoFont,
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "#5d666f",
            }}
          >
            DENIED TODAY
          </div>
          <div
            style={{
              fontFamily: numFont,
              fontSize: 40,
              fontWeight: numWeight,
              letterSpacing: numLs,
              color: "#ff9a8f",
              lineHeight: 1,
              marginTop: 3,
            }}
          >
            {deniedCount}
          </div>
        </div>
      </div>

      {/* ---- worker list ---- */}
      <div
        style={{
          flex: 1,
          padding: "16px 18px 0",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: monoFont,
              fontSize: 9,
              letterSpacing: "0.16em",
              color: "#5d666f",
            }}
          >
            CHECKED IN
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: monoFont,
              fontSize: 9,
              letterSpacing: "0.12em",
              color: "#5d666f",
            }}
          >
            <Link href={`/medic/${siteId}/roster`} style={{ color: "#9aa3ab" }}>
              ROSTER
            </Link>
            <Link href={`/medic/${siteId}/report`} style={{ color: "#9aa3ab" }}>
              EOD
            </Link>
            <span>TIME</span>
          </div>
        </div>

        {activeList.length === 0 ? (
          <div
            style={{
              borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.02)",
              padding: "28px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: "#eef1f3" }}>
              Quiet right now
            </div>
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 10,
                color: "#9aa3ab",
                marginTop: 6,
                lineHeight: 1.6,
              }}
            >
              NO ONE&apos;S CHECKED IN YET — SCAN A QR OR ADD A WALK-IN
            </div>
          </div>
        ) : (
          activeList.map((s, i) => (
            <div key={s.session_id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 4px",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background:
                      "repeating-linear-gradient(135deg,#232932 0 5px,#1b2027 5px 10px)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset",
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: monoFont,
                    fontSize: 11,
                    color: "#9aa3ab",
                  }}
                >
                  {initialsOf(s.worker_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#eef1f3",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.worker_name ?? "Unnamed worker"}
                  </div>
                  <div
                    style={{
                      fontFamily: monoFont,
                      fontSize: 9,
                      color: "#9aa3ab",
                      marginTop: 1,
                    }}
                  >
                    ON SITE
                  </div>
                </div>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#2fd072",
                    boxShadow: "0 0 6px #2fd072",
                    flex: "none",
                  }}
                />
                <div
                  style={{
                    fontFamily: monoFont,
                    fontSize: 11,
                    color: "#c4ccd2",
                    width: 46,
                    textAlign: "right",
                  }}
                >
                  {timeOf(s.check_in_at)}
                </div>
              </div>
              {i < activeList.length - 1 && (
                <div
                  style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* ---- bottom actions ---- */}
      <div
        className="sticky bottom-0"
        style={{
          padding: "14px 18px 22px",
          display: "flex",
          gap: 10,
          background: "linear-gradient(0deg,#0d0f12 60%,transparent)",
        }}
      >
        <Link
          href={`/medic/${siteId}/scan`}
          style={{
            flex: 1,
            height: 54,
            borderRadius: 9,
            background: "#f2581c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
            textDecoration: "none",
          }}
        >
          <svg
            width="18"
            height="18"
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
          <span style={{ fontWeight: 800, fontSize: 15, color: "#0d0f12" }}>
            Scan QR
          </span>
        </Link>
        <Link
          href={`/medic/${siteId}/walk-in`}
          style={{
            flex: 1,
            height: 54,
            borderRadius: 9,
            background: "#15191e",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#eef1f3"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#eef1f3" }}>
            Walk-in
          </span>
        </Link>
      </div>
    </main>
  );
}
