import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
      "id, name, rig_name, rig_number, project:projects(name, operator:companies(name))",
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href="/medic"
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; All assigned sites
      </Link>
      <header className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {site?.name ?? "Site"}
            {site?.rig_name && <> — {site.rig_name}</>}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {operator?.name}
            {project?.name && <> · {project.name}</>}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/medic/${siteId}/roster`}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Roster
          </Link>
          <Link
            href={`/medic/${siteId}/scan`}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Scan worker
          </Link>
        </div>
      </header>

      <h2 className="mt-8 mb-3 text-lg font-semibold">
        Active on site ({active?.length ?? 0})
      </h2>
      {!active || active.length === 0 ? (
        <p className="text-sm text-zinc-500">No workers currently on site.</p>
      ) : (
        <ul className="space-y-2">
          {active.map(
            (s: {
              session_id: string;
              worker_id: string;
              worker_name: string | null;
              check_in_at: string;
            }) => (
              <li
                key={s.session_id}
                className="rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {s.worker_name ?? s.worker_id}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Checked in {new Date(s.check_in_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </main>
  );
}
