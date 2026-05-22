import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sites } = await supabase
    .from("sites")
    .select(
      "id, name, rig_name, rig_number, lsd_location, started_at, project:projects(name, operator:companies(name))",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create sites, set required credentials, assign medics.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/invite"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Invite worker
          </Link>
          <Link
            href="/admin/sites/new"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + New site
          </Link>
        </div>
      </header>

      <h2 className="mb-4 text-lg font-semibold">Sites</h2>
      {!sites || sites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-zinc-600 dark:text-zinc-400">No sites yet.</p>
          <Link
            href="/admin/sites/new"
            className="mt-3 inline-block text-sm font-medium underline"
          >
            Create your first site
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {sites.map((s) => {
            // Supabase nested types can come back as array or object depending
            // on the relationship cardinality. Normalize.
            const project = Array.isArray(s.project) ? s.project[0] : s.project;
            const operator = project
              ? Array.isArray(project.operator)
                ? project.operator[0]
                : project.operator
              : null;
            return (
              <li
                key={s.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/admin/sites/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.name}
                      {s.rig_name && <> — {s.rig_name}</>}
                      {s.rig_number && <> #{s.rig_number}</>}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {operator?.name && (
                        <>
                          <span className="font-medium">{operator.name}</span>
                          {" · "}
                        </>
                      )}
                      {project?.name}
                      {s.lsd_location && (
                        <>
                          {" · "}
                          <span className="font-mono">{s.lsd_location}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/admin/sites/${s.id}`}
                    className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    Manage
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
