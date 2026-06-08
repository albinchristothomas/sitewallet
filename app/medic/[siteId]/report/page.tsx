import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";
import { ReportControls } from "./report-controls";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-CA", {
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

export default async function EndOfDayReportPage(
  props: PageProps<"/medic/[siteId]/report">,
) {
  const { siteId } = await props.params;
  const sp = await props.searchParams;
  const day = typeof sp.day === "string" ? sp.day : isoToday();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Site + project + operator (the oil company)
  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, name, rig_name, rig_number, well_number, lsd_location, project:projects(name, contract_name, contractor_company_name, operator:companies(name))",
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
      .gte("occurred_at", `${day}T00:00:00`)
      .lt("occurred_at", `${day}T23:59:59`)
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

  const jobSafe = incidents.length === 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-5">
      {/* Header — hidden when printing */}
      <div className="print:hidden">
        <Link
          href={`/medic/${siteId}`}
          className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
        >
          ← Site
        </Link>
        <header className="mt-3 flex items-end justify-between gap-4">
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

      {/* The printable report itself */}
      <article
        className="mt-6 rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-6 print:mt-0 print:border-0 print:bg-white print:p-8 print:text-black"
        id="report"
      >
        <header className="border-b border-[color:var(--hair)] pb-5 print:border-[color:#ccc]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-faint)] print:text-[#666]">
                SiteWallet · End-of-day report
              </div>
              <h2 className="mt-1 text-[28px] font-bold leading-tight tracking-tight">
                {site?.name}
              </h2>
              <p className="mt-1 text-[14px] text-[color:var(--text-dim)] print:text-[#555]">
                {fmtDateLong(day)}
              </p>
            </div>
            <div
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold uppercase tracking-wide ${
                jobSafe
                  ? "bg-[color:rgba(16,185,129,0.20)] text-[color:#34D399] print:bg-[#dcfce7] print:text-[#15803d]"
                  : "bg-[color:rgba(245,158,11,0.20)] text-[color:#FBBF24] print:bg-[#fef3c7] print:text-[#b45309]"
              }`}
            >
              {jobSafe ? (
                <>
                  <Check size={16} strokeWidth={2} /> Day completed safely
                </>
              ) : (
                <>
                  <AlertTriangle size={16} strokeWidth={2} /> {incidents.length} incident
                  {incidents.length === 1 ? "" : "s"} reported
                </>
              )}
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[12px] sm:grid-cols-3">
            <ReportField label="Oil company" value={operator?.name} />
            <ReportField label="Project" value={project?.name} />
            <ReportField label="Contract" value={project?.contract_name} />
            <ReportField
              label="Contractor"
              value={project?.contractor_company_name}
            />
            <ReportField
              label="Rig"
              value={
                site?.rig_name
                  ? `${site.rig_name}${site.rig_number ? ` · #${site.rig_number}` : ""}`
                  : null
              }
            />
            <ReportField label="Well" value={site?.well_number} />
            <ReportField label="LSD" value={site?.lsd_location} />
          </dl>
        </header>

        <section className="mt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[18px] font-bold">Workers on site</h3>
            <span className="font-mono text-[11px] text-[color:var(--text-faint)] print:text-[#666]">
              {roster.length} session{roster.length === 1 ? "" : "s"}
            </span>
          </div>
          {roster.length === 0 ? (
            <p className="text-[13px] text-[color:var(--text-dim)] print:text-[#555]">
              No workers signed in on this day.
            </p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[color:var(--hair)] text-left font-mono text-[10px] uppercase tracking-wide text-[color:var(--text-faint)] print:border-[#ccc] print:text-[#555]">
                  <th className="py-2 pr-3">Worker</th>
                  <th className="py-2 pr-3">Contractor</th>
                  <th className="py-2 pr-3">Contact</th>
                  <th className="py-2 pr-3">In</th>
                  <th className="py-2 pr-3">Out</th>
                  <th className="py-2 pr-3">Hours</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => {
                  const w = workerMap.get(r.worker_id);
                  const hrs = r.duration_minutes
                    ? `${Math.floor(r.duration_minutes / 60)}h ${r.duration_minutes % 60}m`
                    : r.check_out_at
                      ? "—"
                      : "on site";
                  return (
                    <tr
                      key={r.session_id}
                      className="border-b border-[color:var(--hair)] print:border-[#eee]"
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold">
                          {r.worker_name ?? "—"}
                        </div>
                        {w?.employee_number && (
                          <div className="mt-0.5 font-mono text-[10px] text-[color:var(--text-faint)] print:text-[#666]">
                            #{w.employee_number}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-[color:var(--text-dim)] print:text-[#555]">
                        {w?.contractor_company ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[color:var(--text-dim)] print:text-[#555]">
                        {w?.phone ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 font-mono">
                        {fmtTime(r.check_in_at)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono">
                        {fmtTime(r.check_out_at)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono">{hrs}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {incidents.length > 0 && (
          <section className="mt-7">
            <h3 className="mb-3 text-[18px] font-bold">Incidents</h3>
            <ul className="space-y-2">
              {incidents.map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-[color:rgba(239,68,68,0.30)] bg-[color:rgba(239,68,68,0.10)] p-3 text-[13px] print:border-[#f87171] print:bg-[#fee2e2]"
                >
                  <div className="flex items-center justify-between gap-3 font-mono text-[10px] font-bold uppercase tracking-wide text-[color:#F87171] print:text-[#991b1b]">
                    <span>
                      {i.type.replace(/_/g, " ")} · {i.severity}
                    </span>
                    <span>{fmtTime(i.occurred_at)}</span>
                  </div>
                  <p className="mt-1.5 text-[color:var(--text)] print:text-[#000]">
                    {i.description}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 border-t border-[color:var(--hair)] pt-5 print:border-[#ccc]">
          <h3 className="text-[14px] font-bold">Signed by</h3>
          <div className="mt-2 grid grid-cols-2 gap-x-6 font-mono text-[11px]">
            <div>
              <div className="text-[color:var(--text-faint)] print:text-[#666]">
                Medic
              </div>
              <div className="mt-0.5 text-[13px] font-semibold">
                {medic?.full_name ?? "(unsigned)"}
              </div>
            </div>
            <div>
              <div className="text-[color:var(--text-faint)] print:text-[#666]">
                Firm
              </div>
              <div className="mt-0.5 text-[13px] font-semibold">
                {medic?.medic_firm ?? "—"}
              </div>
            </div>
            {medic?.medic_license_number && (
              <div className="col-span-2 mt-2">
                <div className="text-[color:var(--text-faint)] print:text-[#666]">
                  License #
                </div>
                <div className="mt-0.5 text-[13px]">
                  {medic.medic_license_number}
                </div>
              </div>
            )}
          </div>
          <p className="mt-5 text-[10px] text-[color:var(--text-faint)] print:text-[#666]">
            Generated {new Date().toLocaleString("en-CA")} by SiteWallet ·
            sticketwalllet.netlify.app
          </p>
        </section>
      </article>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          body { background: white !important; }
          nav, footer, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
        }
      `}</style>
    </main>
  );
}

function ReportField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-faint)] print:text-[#666]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[color:var(--text-dim)] print:text-[#000]">{value}</dd>
    </div>
  );
}
