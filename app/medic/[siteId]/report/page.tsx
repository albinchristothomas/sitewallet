import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";
import { SITE_TZ, siteDayBounds, siteToday } from "@/lib/dates";
import { ReportControls } from "./report-controls";

// Approved "Warm cream" paper palette (design block 10 · END-OF-DAY REPORT)
const paperBg = "#f3efe6";
const paperInk = "#221d15";
const paperSub = "#6f6657";
const paperLine = "#ddd6c7";
const paperBand = "#2a251d";
const paperBandInk = "#efe9dc";
const paperRowAlt = "#ece7da";
const paperRule = "#cdbfa3";
// Display-grotesk numerals
const rNumFont = "var(--font-archivo), sans-serif";
const rNumWeight = 800;
const rNumLs = "-0.02em";

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: SITE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fmtDateLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// "19 JUN 2026" — masthead DATE token
function fmtDateMeta(iso: string): string {
  return new Date(iso + "T00:00:00")
    .toLocaleDateString("en-CA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/\./g, "")
    .toUpperCase();
}

// "19·06·26" — seal stamp
function fmtSealDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}·${m}·${y.slice(2)}`;
}

// "RW-DSR-20260619-1422" — official record id
function fmtReportId(iso: string): string {
  const compact = iso.replace(/-/g, "");
  const now = new Date();
  const stamp = `${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  return `RW-DSR-${compact}-${stamp}`;
}

export default async function EndOfDayReportPage(
  props: PageProps<"/medic/[siteId]/report">,
) {
  const { siteId } = await props.params;
  // Always today's live record — no manual date override.
  const day = siteToday();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Site + project + operator (the oil company)
  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, name, rig_name, rig_number, well_number, lsd_location, muster_point, project:projects(name, contract_name, contractor_company_name, operator:companies(name))",
    )
    .eq("id", siteId)
    .single();

  const project = site?.project
    ? Array.isArray(site.project) ? site.project[0] : site.project
    : null;
  const operator = project?.operator
    ? Array.isArray(project.operator) ? project.operator[0] : project.operator
    : null;

  // Roster for the day
  const { data: rosterRaw } = await supabase.rpc("daily_roster", {
    p_site_id: siteId,
    p_day: day,
  });
  type RosterRow = {
    session_id: string;
    worker_id: string;
    worker_name: string | null;
    check_in_at: string;
    check_out_at: string | null;
    duration_minutes: number | null;
    status: string;
  };
  const roster: RosterRow[] = rosterRaw ?? [];

  // Worker contact + employer details for the roster
  const workerIds = roster.map((r) => r.worker_id);
  const { data: workersDetail } = workerIds.length
    ? await supabase
        .from("workers")
        .select("id, full_name, phone, contractor_company, employee_number")
        .in("id", workerIds)
    : { data: [] };
  const workerMap = new Map(
    (workersDetail ?? []).map((w) => [w.id, w]),
  );

  // Incidents on this day at this site (best-effort — table may not exist yet)
  type IncidentRow = {
    id: string;
    type: string;
    severity: string;
    description: string;
    occurred_at: string;
    worker_id: string | null;
  };
  let incidents: IncidentRow[] = [];
  try {
    const { data: i } = await supabase
      .from("incidents")
      .select("id, type, severity, description, occurred_at, worker_id")
      .eq("site_id", siteId)
      .gte("occurred_at", siteDayBounds(day).start)
      .lt("occurred_at", siteDayBounds(day).end)
      .order("occurred_at", { ascending: true });
    incidents = i ?? [];
  } catch {
    incidents = [];
  }

  // Medic info (the report's author)
  const { data: medic } = await supabase
    .from("workers")
    .select("full_name, medic_firm, medic_license_number")
    .eq("id", user.id)
    .single();

  // Gate denials for the day — recorded in audit_log via deny_worker, read back
  // through the daily_denials RPC (denials never create a session row).
  const { data: denialsRaw } = await supabase.rpc("daily_denials", {
    p_site_id: siteId,
    p_day: day,
  });
  type DenialRow = {
    worker_id: string;
    worker_name: string | null;
    reason: string | null;
    denied_at: string;
  };
  const denials: DenialRow[] = denialsRaw ?? [];

  // ── derived report figures ───────────────────────────────────────────
  const isAdmitted = (r: RosterRow) => Boolean(r.check_in_at);
  const admittedCount = roster.filter(isAdmitted).length;
  const deniedCount = denials.length;
  const totalMinutes = roster.reduce(
    (sum, r) => sum + (r.duration_minutes ?? 0),
    0,
  );
  const crewHours = (totalMinutes / 60).toFixed(1);

  // Crew table shows the full roster (design label reflects how many of total)
  const shownCount = roster.length;
  const totalCount = roster.length;

  const wellLsd = site?.lsd_location || site?.well_number || "—";
  const muster =
    site?.muster_point?.trim() ||
    (site?.rig_name ? `${site.rig_name} muster point` : "Per site plan");

  const medicName = medic?.full_name ?? "(unsigned)";
  const medicFirm = medic?.medic_firm ?? "";
  const medicLicense = medic?.medic_license_number ?? "";
  // last name only for the cursive flourish — e.g. "A. Reyes"
  const sigParts = medicName.split(" ").filter(Boolean);
  const sigName =
    sigParts.length >= 2
      ? `${sigParts[0][0]}. ${sigParts[sigParts.length - 1]}`
      : medicName;
  const medicLine = [
    "ATTENDING MEDIC",
    medicName.toUpperCase(),
    medicLicense || null,
  ]
    .filter(Boolean)
    .join(" · ");

  // "Recordable" proxy = HIGH or CRITICAL severity (the incident_severity enum
  // is LOW/MEDIUM/HIGH/CRITICAL — there is no literal "recordable" value).
  const recordableCount = incidents.filter(
    (i) => i.severity === "HIGH" || i.severity === "CRITICAL",
  ).length;
  const incidentText =
    incidents.length === 0
      ? "None reported — 0 recordable"
      : `${incidents.length} reported — ${recordableCount} recordable`;
  const incidentColor = incidents.length === 0 ? "#1e8a4c" : "#c0392b";

  const mono = "var(--font-jetbrains-mono), ui-monospace, monospace";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10 pt-5 sm:px-5">
      {/* Header — hidden when printing */}
      <div className="print:hidden">
        <Link
          href={`/medic/${siteId}`}
          className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
        >
          ← Site
        </Link>
        <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow className="mb-1">End-of-day report</Eyebrow>
            <h1 className="text-2xl font-bold tracking-tight">
              {site?.name}
              {site?.rig_name && <> · {site.rig_name}</>}
            </h1>
          </div>
          <ReportControls day={day} />
        </header>
      </div>

      {/* The printable report — light "paper" document */}
      <div className="mt-6 print:mt-0" id="report-wrap">
        <article
          id="report"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 760,
            margin: "0 auto",
            borderRadius: 4,
            overflow: "hidden",
            background: paperBg,
            boxShadow:
              "0 30px 60px -20px rgba(0,0,0,0.45),0 0 0 1px rgba(0,0,0,0.08)",
          }}
        >
          {/* print texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              display: "block",
              opacity: 0.5,
              mixBlendMode: "multiply",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='r'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23r)' opacity='0.06'/%3E%3C/svg%3E\")",
            }}
          />
          {/* faint guilloché watermark */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.45,
              backgroundImage:
                "repeating-radial-gradient(circle at 84% 14%, transparent 0 11px, rgba(20,30,40,0.022) 11px 12px),conic-gradient(from 30deg at 80% 18%, rgba(20,30,40,0.018), transparent 40%, rgba(20,30,40,0.016) 70%, transparent 100%)",
            }}
          />
          {/* orange safety spine */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              background: "#f2581c",
            }}
          />

          <div
            style={{ position: "relative", padding: "46px 50px 40px 54px" }}
            className="rw-report-body"
          >
            {/* masthead */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 11 }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      background: "#f2581c",
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{ width: 11, height: 11, background: paperBg }}
                    />
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 17,
                      letterSpacing: "-0.01em",
                      color: paperInk,
                    }}
                  >
                    RIG
                    <span style={{ color: "#a59a8a", fontWeight: 600 }}>
                      WISE
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    color: paperSub,
                    marginTop: 14,
                  }}
                >
                  OFFICIAL RECORD · NOT VALID WITHOUT MEDIC SIGNATURE
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 34,
                    letterSpacing: "-0.025em",
                    color: paperInk,
                    lineHeight: 0.95,
                  }}
                >
                  Daily Safety
                  <br />
                  Report
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    color: paperSub,
                    marginTop: 9,
                  }}
                >
                  {fmtReportId(day)}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 0,
                marginTop: 18,
                height: 3,
              }}
            >
              <div style={{ width: 64, background: "#f2581c" }} />
              <div style={{ flex: 1, background: paperInk }} />
            </div>

            {/* meta — editorial row */}
            <div
              style={{ display: "flex", marginTop: 22, gap: 0 }}
              className="rw-report-meta"
            >
              <div style={{ flex: 1.3 }}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    color: paperSub,
                  }}
                >
                  WELL / LSD
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 15,
                    fontWeight: 600,
                    color: paperInk,
                    marginTop: 6,
                  }}
                >
                  {wellLsd}
                </div>
              </div>
              <div style={{ flex: 1.3 }}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    color: paperSub,
                  }}
                >
                  OPERATOR
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: "-0.01em",
                    color: paperInk,
                    marginTop: 5,
                  }}
                >
                  {operator?.name ?? "—"}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    color: paperSub,
                  }}
                >
                  CONTRACT
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 15,
                    fontWeight: 600,
                    color: paperInk,
                    marginTop: 6,
                  }}
                >
                  {project?.contract_name ?? "—"}
                </div>
              </div>
              <div style={{ flex: 0.9 }}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    color: paperSub,
                  }}
                >
                  DATE
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 15,
                    fontWeight: 600,
                    color: paperInk,
                    marginTop: 6,
                  }}
                >
                  {fmtDateMeta(day)}
                </div>
              </div>
            </div>

            {/* crew table */}
            <div style={{ marginTop: 30 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 11,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: "-0.01em",
                    color: paperInk,
                    whiteSpace: "nowrap",
                  }}
                >
                  Crew on site
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: paperSub,
                  }}
                >
                  {shownCount} OF {totalCount} SHOWN
                </div>
              </div>
              <div
                style={{
                  borderRadius: 3,
                  overflow: "hidden",
                  boxShadow: `0 0 0 1px ${paperLine}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    background: paperBand,
                    color: paperBandInk,
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.1em",
                  }}
                >
                  <div style={{ flex: 2.2, padding: "10px 16px" }}>WORKER</div>
                  <div style={{ flex: 1.8, padding: "10px 8px" }}>COMPANY</div>
                  <div style={{ flex: 1.2, padding: "10px 8px" }}>TICKETS</div>
                  <div style={{ flex: 0.9, padding: "10px 8px" }}>IN</div>
                  <div style={{ flex: 0.9, padding: "10px 8px" }}>OUT</div>
                  <div
                    style={{
                      flex: 0.7,
                      padding: "10px 8px",
                      textAlign: "right",
                    }}
                  >
                    HRS
                  </div>
                </div>
                {roster.length === 0 ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: paperSub,
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    No workers signed in on this day.
                  </div>
                ) : (
                  roster.map((r, idx) => {
                    const w = workerMap.get(r.worker_id);
                    const admitted = isAdmitted(r);
                    const hrs = r.duration_minutes
                      ? (r.duration_minutes / 60).toFixed(1)
                      : admitted
                        ? "0.0"
                        : "0.0";
                    const isLast = idx === roster.length - 1;
                    return (
                      <div
                        key={r.session_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: 13,
                          color: paperInk,
                          ...(isLast
                            ? {}
                            : { borderBottom: `1px solid ${paperLine}` }),
                          ...(idx % 2 === 1
                            ? { background: paperRowAlt }
                            : {}),
                        }}
                      >
                        <div
                          style={{
                            flex: 2.2,
                            padding: "11px 16px",
                            fontWeight: 700,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {r.worker_name ?? "—"}
                        </div>
                        <div
                          style={{
                            flex: 1.8,
                            padding: "11px 8px",
                            fontSize: 12,
                            color: paperSub,
                          }}
                        >
                          {w?.contractor_company ?? "—"}
                        </div>
                        <div
                          style={{
                            flex: 1.2,
                            padding: "11px 8px",
                            fontFamily: mono,
                            fontSize: 9.5,
                            color: admitted ? "#1e8a4c" : "#c0392b",
                            fontWeight: 600,
                          }}
                        >
                          {admitted ? "● VALID" : "● DENIED"}
                        </div>
                        <div
                          style={{
                            flex: 0.9,
                            padding: "11px 8px",
                            fontFamily: mono,
                            fontSize: 11,
                            ...(admitted ? {} : { color: paperSub }),
                          }}
                        >
                          {admitted ? fmtTime(r.check_in_at) : "—"}
                        </div>
                        <div
                          style={{
                            flex: 0.9,
                            padding: "11px 8px",
                            fontFamily: mono,
                            fontSize: 11,
                            ...(admitted && r.check_out_at
                              ? {}
                              : { color: paperSub }),
                          }}
                        >
                          {admitted ? fmtTime(r.check_out_at) : "—"}
                        </div>
                        <div
                          style={{
                            flex: 0.7,
                            padding: "11px 8px",
                            textAlign: "right",
                            fontFamily: mono,
                            fontSize: 11,
                            ...(admitted ? {} : { color: paperSub }),
                          }}
                        >
                          {hrs}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* entry denials — every gate refusal, with reason + time */}
            {denials.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    color: "#b03225",
                  }}
                >
                  ENTRY DENIALS · {denials.length}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    border: `1px solid ${paperLine}`,
                  }}
                >
                  {denials.map((d, i) => (
                    <div
                      key={`${d.worker_id}-${d.denied_at}`}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 12,
                        padding: "9px 12px",
                        borderLeft: "3px solid #b03225",
                        background: i % 2 ? paperRowAlt : "transparent",
                        borderTop: i > 0 ? `1px solid ${paperLine}` : "none",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: paperInk,
                          flex: "none",
                        }}
                      >
                        {d.worker_name ?? "Unknown"}
                      </span>
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 10,
                          color: paperSub,
                          flex: "none",
                        }}
                      >
                        {fmtTime(d.denied_at)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: paperSub,
                          minWidth: 0,
                        }}
                      >
                        {d.reason ?? "Not compliant"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* summary band — big figures */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 26,
                borderTop: `2px solid ${paperInk}`,
                paddingTop: 18,
                gap: 26,
              }}
              className="rw-report-summary"
            >
              <div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    color: paperSub,
                  }}
                >
                  ADMITTED
                </div>
                <div
                  style={{
                    fontFamily: rNumFont,
                    fontSize: 38,
                    fontWeight: rNumWeight,
                    letterSpacing: rNumLs,
                    color: "#1e8a4c",
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {admittedCount}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    color: paperSub,
                  }}
                >
                  DENIED
                </div>
                <div
                  style={{
                    fontFamily: rNumFont,
                    fontSize: 38,
                    fontWeight: rNumWeight,
                    letterSpacing: rNumLs,
                    color: "#c0392b",
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {deniedCount}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.16em",
                    color: paperSub,
                  }}
                >
                  CREW HOURS
                </div>
                <div
                  style={{
                    fontFamily: rNumFont,
                    fontSize: 38,
                    fontWeight: rNumWeight,
                    letterSpacing: rNumLs,
                    color: paperInk,
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {crewHours}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 8.5,
                      letterSpacing: "0.14em",
                      color: paperSub,
                      width: 70,
                      flex: "none",
                    }}
                  >
                    INCIDENTS
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: incidentColor,
                    }}
                  >
                    {incidentText}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 8.5,
                      letterSpacing: "0.14em",
                      color: paperSub,
                      width: 70,
                      flex: "none",
                    }}
                  >
                    MUSTER
                  </span>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: paperInk }}
                  >
                    {muster}
                  </span>
                </div>
              </div>
            </div>

            {/* signature */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginTop: 30,
                borderTop: `1px solid ${paperLine}`,
                paddingTop: 22,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-caveat), cursive",
                    fontSize: 40,
                    lineHeight: 0.7,
                    color: paperInk,
                    transform: "rotate(-2deg)",
                  }}
                >
                  {sigName}
                </div>
                <div
                  style={{
                    borderTop: `1px solid ${paperInk}`,
                    marginTop: 9,
                    paddingTop: 6,
                    fontFamily: mono,
                    fontSize: 8.5,
                    letterSpacing: "0.14em",
                    color: paperSub,
                  }}
                >
                  {medicLine}
                  {medicFirm ? ` · ${medicFirm.toUpperCase()}` : ""}
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: 16 }}
              >
                <div
                  style={{
                    textAlign: "right",
                    fontFamily: mono,
                    fontSize: 8,
                    letterSpacing: "0.1em",
                    color: paperSub,
                    lineHeight: 1.7,
                  }}
                >
                  VERIFIED · INTEGRITY SEALED
                  <br />
                  VOID IF ALTERED · {fmtTime(new Date().toISOString())} MST
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    border: `1.5px solid ${paperRule}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "rotate(-9deg)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 7,
                      letterSpacing: "0.1em",
                      color: "#f2581c",
                      fontWeight: 700,
                    }}
                  >
                    RIGWISE
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      color: paperInk,
                      fontWeight: 700,
                      marginTop: 1,
                    }}
                  >
                    SEAL
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 6,
                      letterSpacing: "0.08em",
                      color: paperSub,
                      marginTop: 1,
                    }}
                  >
                    {fmtSealDate(day)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* incidents detail — kept below the seal when present */}
        {incidents.length > 0 && (
          <article
            style={{
              maxWidth: 760,
              margin: "16px auto 0",
              borderRadius: 4,
              overflow: "hidden",
              background: paperBg,
              boxShadow:
                "0 30px 60px -20px rgba(0,0,0,0.45),0 0 0 1px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ position: "relative", padding: "28px 50px 30px 54px" }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  background: "#f2581c",
                }}
              />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: "-0.01em",
                  color: paperInk,
                  marginBottom: 12,
                }}
              >
                Incident detail
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {incidents.map((i) => (
                  <li
                    key={i.id}
                    style={{
                      borderRadius: 3,
                      border: "1px solid rgba(192,57,43,0.30)",
                      background: "rgba(192,57,43,0.06)",
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        fontFamily: mono,
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#c0392b",
                      }}
                    >
                      <span>
                        {i.type.replace(/_/g, " ")} · {i.severity}
                      </span>
                      <span>{fmtTime(i.occurred_at)}</span>
                    </div>
                    <p
                      style={{
                        marginTop: 6,
                        marginBottom: 0,
                        fontSize: 13,
                        color: paperInk,
                      }}
                    >
                      {i.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        )}

        <p
          className="print:hidden"
          style={{
            maxWidth: 760,
            margin: "12px auto 0",
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.04em",
            color: "var(--text-faint)",
            textAlign: "center",
          }}
        >
          {fmtDateLong(day)} · Generated {new Date().toLocaleString("en-CA")} by
          RigWise · rigwise.ca
        </p>
      </div>

      {/* Print stylesheet + responsive collapse for narrow phones */}
      <style>{`
        @media print {
          body { background: white !important; }
          nav, footer, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          #report { box-shadow: none !important; }
        }
        @media (max-width: 560px) {
          .rw-report-body { padding: 28px 22px 26px 28px !important; }
          .rw-report-meta { flex-wrap: wrap; gap: 16px 0 !important; }
          .rw-report-meta > div { flex: 1 1 50% !important; }
          .rw-report-summary { flex-wrap: wrap; gap: 18px 22px !important; }
          .rw-report-summary > div:last-child { flex: 1 1 100% !important; }
        }
      `}</style>
    </main>
  );
}
