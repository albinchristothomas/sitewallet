import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "bg-[color:var(--ok-bg)] text-[color:var(--ok-text)]",
  MEDIUM: "bg-[color:var(--warn-bg)] text-[color:var(--warn-text)]",
  HIGH: "bg-[color:rgba(242,88,28,0.16)] text-[color:var(--brand)]",
  CRITICAL: "bg-[color:var(--bad-bg)] text-[color:var(--bad-text)]",
};

const TYPE_LABEL: Record<string, string> = {
  FIRST_AID: "First aid",
  NEAR_MISS: "Near miss",
  PROPERTY_DAMAGE: "Property damage",
  EQUIPMENT_FAILURE: "Equipment failure",
  ENVIRONMENTAL: "Environmental",
  MEDICAL_EVACUATION: "Medical evacuation",
  OTHER: "Other",
};

export default async function IncidentsPage(
  props: PageProps<"/medic/[siteId]/incidents">,
) {
  const { siteId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: site } = await supabase
    .from("sites")
    .select("name, rig_name, rig_number")
    .eq("id", siteId)
    .single();

  const { data: incidents } = await supabase
    .from("incidents")
    .select(
      "id, type, severity, description, occurred_at, closed_at, follow_up, worker:workers!incidents_worker_id_fkey(full_name)",
    )
    .eq("site_id", siteId)
    .order("occurred_at", { ascending: false });

  type Row = {
    id: string;
    type: string;
    severity: string;
    description: string;
    occurred_at: string;
    closed_at: string | null;
    follow_up: string | null;
    worker: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const list: Row[] = incidents ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-5">
      <Link
        href={`/medic/${siteId}`}
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Site
      </Link>
      <header className="mt-3 flex items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-1">Incidents</Eyebrow>
          <h1 className="text-2xl font-bold tracking-tight">
            {site?.name}
            {site?.rig_name && <> · {site.rig_name}</>}
            {site?.rig_number && <> #{site.rig_number}</>}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-dim)]">
            {list.length} logged
          </p>
        </div>
        <Link
          href={`/medic/${siteId}/incidents/new`}
          className="inline-flex h-10 items-center gap-1.5 rounded-[9px] bg-[color:var(--hi-yellow)] px-4 text-sm font-bold text-[color:var(--ink-1)]"
        >
          <Plus size={16} strokeWidth={2} /> Log incident
        </Link>
      </header>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface-2)] p-6 text-center">
          <p className="text-[15px] font-semibold">No incidents logged</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-dim)]">
            First aid, near misses, evacuations. Anything that belongs on the
            end-of-day report.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {list.map((i) => {
            const worker = Array.isArray(i.worker) ? i.worker[0] : i.worker;
            return (
              <li
                key={i.id}
                className="rounded-xl border border-[color:var(--hair)] bg-[color:var(--surface-2)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      SEVERITY_STYLE[i.severity] ?? ""
                    }`}
                  >
                    {i.severity}
                  </span>
                  <span className="text-[13px] font-semibold">
                    {TYPE_LABEL[i.type] ?? i.type}
                  </span>
                  {worker?.full_name && (
                    <span className="text-[12px] text-[color:var(--text-dim)]">
                      · {worker.full_name}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[11px] text-[color:var(--text-faint)]">
                    {new Date(i.occurred_at).toLocaleString("en-CA", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--text)]">
                  {i.description}
                </p>
                {i.follow_up && (
                  <p className="mt-1.5 text-[12px] text-[color:var(--text-dim)]">
                    <span className="font-semibold">Follow-up:</span>{" "}
                    {i.follow_up}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
