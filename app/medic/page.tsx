import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Medic dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Pick a site to scan workers in.
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-zinc-600 dark:text-zinc-400">
            You're not assigned to any sites yet.
          </p>
          <Link
            href="/admin"
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Go to Admin to assign yourself
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
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {site.name}
                      {site.rig_name && <> — {site.rig_name}</>}
                      {site.rig_number && <> #{site.rig_number}</>}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {operator?.name}
                      {project?.name && <> · {project.name}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/medic/${site.id}`}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    >
                      Open
                    </Link>
                    <Link
                      href={`/medic/${site.id}/scan`}
                      className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
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
