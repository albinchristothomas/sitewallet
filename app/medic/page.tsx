import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
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
        <div className="mt-8 rounded-2xl border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface-1)] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--surface-3)] text-[color:var(--brand)]">
            <Shield size={28} strokeWidth={1.75} />
          </div>
          <p className="mt-3 text-[15px] font-semibold">No sites assigned yet</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-dim)]">
            You need to be assigned to a site before you can scan workers in.
            Ask the site admin to add you, or assign yourself in Setup.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-flex h-11 items-center rounded-[9px] border border-[color:var(--line-strong)] px-4 text-sm font-semibold hover:bg-[color:var(--surface-3)]"
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
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)] p-4"
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
                      className="inline-flex h-10 items-center rounded-[9px] border border-[color:var(--line-strong)] px-3 text-sm font-semibold hover:bg-[color:var(--surface-3)]"
                    >
                      Open
                    </Link>
                    <Link
                      href={`/medic/${site.id}/scan`}
                      className="inline-flex h-10 items-center rounded-[9px] bg-[color:var(--brand)] px-3 text-sm font-bold text-[color:var(--on-brand)] hover:brightness-95"
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
