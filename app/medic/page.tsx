import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";

export default async function MedicHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignments } = await supabase
    .from("medic_assignments")
    .select(
      "site_id, site:sites(id, name, rig_name, rig_number, project:projects(name, operator:companies(name)))",
    )
    .eq("medic_id", user.id);

  const items = assignments ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-6">
      <Eyebrow className="mb-1">Medic</Eyebrow>
      <h1 className="text-3xl font-bold tracking-tight">Assigned sites</h1>
      <p className="mt-1 text-sm text-[color:var(--text-dim)]">
        Pick a site to start scanning workers in.
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-8 text-center">
          <div className="text-[32px]" aria-hidden>
            🛡️
          </div>
          <p className="mt-2 text-[15px] font-semibold">No sites assigned yet</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-dim)]">
            You need to be assigned to a site before you can scan workers in.
            If this is your own demo, open Setup and click &ldquo;Assign myself
            as medic&rdquo; on a site.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-block rounded-lg border border-[color:var(--hair-strong)] px-4 py-2.5 text-sm font-semibold hover:bg-[color:var(--ink-3)]"
          >
            Open Setup
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((a) => {
            const site = Array.isArray(a.site) ? a.site[0] : a.site;
            if (!site) return null;
            const project = Array.isArray(site.project)
              ? site.project[0]
              : site.project;
            const operator = project
              ? Array.isArray(project.operator)
                ? project.operator[0]
                : project.operator
              : null;
            return (
              <li
                key={a.site_id}
                className="rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Eyebrow className="mb-1">Site</Eyebrow>
                    <div className="text-[18px] font-bold leading-tight">
                      {site.name}
                      {site.rig_name && <> · {site.rig_name}</>}
                      {site.rig_number && <> #{site.rig_number}</>}
                    </div>
                    <div className="mt-1 text-[13px] text-[color:var(--text-dim)]">
                      {operator?.name}
                      {project?.name && <> · {project.name}</>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/medic/${site.id}`}
                      className="rounded-lg border border-[color:var(--hair-strong)] px-3 py-1.5 text-sm font-semibold hover:bg-[color:var(--ink-3)]"
                    >
                      Open
                    </Link>
                    <Link
                      href={`/medic/${site.id}/scan`}
                      className="rounded-lg bg-[color:var(--hi-yellow)] px-3 py-1.5 text-sm font-bold text-[color:var(--ink-1)] hover:brightness-95"
                    >
                      Scan
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
