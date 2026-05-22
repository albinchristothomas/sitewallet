import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Eyebrow, StatusPill, getInitials } from "@/lib/atoms";

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
      "id, name, rig_name, rig_number, lsd_location, project:projects(name, operator:companies(name))",
    )
    .eq("id", siteId)
    .single();

  const { data: active } = await supabase.rpc("active_sessions_for_site", {
    p_site_id: siteId,
  });

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

  type ActiveRow = {
    session_id: string;
    worker_id: string;
    worker_name: string | null;
    check_in_at: string;
  };
  const activeList: ActiveRow[] = active ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-10 pt-5">
      <Link
        href="/medic"
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← All assigned sites
      </Link>

      <header className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow className="mb-1">Gate · Medic</Eyebrow>
          <h1 className="text-2xl font-bold tracking-tight">
            {site?.name}
            {site?.rig_name && <> · {site.rig_name}</>}
            {site?.rig_number && <> #{site.rig_number}</>}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-dim)]">
            {operator?.name}
            {project?.name && <> · {project.name}</>}
          </p>
          {site?.lsd_location && (
            <p className="mt-1 font-mono text-[12px] text-[color:var(--text-faint)]">
              {site.lsd_location}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/medic/${siteId}/roster`}
            className="rounded-lg border border-[color:var(--hair-strong)] px-3 py-2 text-sm font-semibold hover:bg-[color:var(--ink-2)]"
          >
            Roster
          </Link>
          <Link
            href={`/medic/${siteId}/scan`}
            className="rounded-lg bg-[color:var(--hi-yellow)] px-4 py-2 text-sm font-bold text-[color:var(--ink-1)] hover:brightness-95"
          >
            Scan worker
          </Link>
        </div>
      </header>

      <div className="mt-8 flex items-center justify-between">
        <Eyebrow>Active on site · {activeList.length}</Eyebrow>
        <div className="font-mono text-[11px] text-[color:#34D399]">
          ● live
        </div>
      </div>

      {activeList.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-10 text-center">
          <p className="text-sm text-[color:var(--text-dim)]">
            No workers currently on site.
          </p>
          <Link
            href={`/medic/${siteId}/scan`}
            className="mt-3 inline-block text-sm font-medium text-[color:var(--hi-yellow)] hover:underline"
          >
            Scan a worker in →
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {activeList.map((s) => (
            <li
              key={s.session_id}
              className="flex items-center gap-3.5 rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-4 py-3"
            >
              <Avatar
                initials={getInitials(s.worker_name)}
                size={42}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">
                  {s.worker_name ?? "Unnamed worker"}
                </div>
                <div className="mt-0.5 font-mono text-[12px] text-[color:var(--text-faint)]">
                  Checked in{" "}
                  {new Date(s.check_in_at).toLocaleTimeString("en-CA", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </div>
              </div>
              <StatusPill status="ok" label="On site" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
