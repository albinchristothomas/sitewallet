import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";

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
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-10 pt-6">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-1">Operator</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-[color:var(--text-dim)]">
            Create sites, set required credentials, assign medics, invite
            workers.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/invite"
            className="rounded-lg border border-[color:var(--hair-strong)] px-3 py-2 text-sm font-semibold hover:bg-[color:var(--ink-2)]"
          >
            Invite worker
          </Link>
          <Link
            href="/admin/sites/new"
            className="rounded-lg bg-[color:var(--hi-yellow)] px-4 py-2 text-sm font-bold text-[color:var(--ink-1)] hover:brightness-95"
          >
            + New site
          </Link>
        </div>
      </header>

      <div className="mb-4 flex items-center justify-between">
        <Eyebrow>Sites · {sites?.length ?? 0}</Eyebrow>
      </div>

      {!sites || sites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-8 text-center">
          <div className="text-[32px]" aria-hidden>
            🛢️
          </div>
          <p className="mt-2 text-[15px] font-semibold">No worksites yet</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-dim)]">
            Start by setting up a site — the rig or pad workers will check in
            at. You can edit it later.
          </p>
          <Link
            href="/admin/sites/new"
            className="mt-4 inline-block rounded-lg bg-[color:var(--hi-yellow)] px-4 py-2.5 text-sm font-bold text-[color:var(--ink-1)] hover:brightness-95"
          >
            + Create first site
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sites.map((s) => {
            const project = Array.isArray(s.project) ? s.project[0] : s.project;
            const operator = project
              ? Array.isArray(project.operator)
                ? project.operator[0]
                : project.operator
              : null;
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/sites/${s.id}`}
                      className="text-[17px] font-bold hover:text-[color:var(--hi-yellow)]"
                    >
                      {s.name}
                      {s.rig_name && <> · {s.rig_name}</>}
                      {s.rig_number && <> #{s.rig_number}</>}
                    </Link>
                    <div className="mt-1 text-[13px] text-[color:var(--text-dim)]">
                      {operator?.name && (
                        <>
                          <span className="font-semibold">{operator.name}</span>{" "}
                          ·{" "}
                        </>
                      )}
                      {project?.name}
                    </div>
                    {s.lsd_location && (
                      <div className="mt-1 font-mono text-[11px] text-[color:var(--text-faint)]">
                        {s.lsd_location}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/admin/sites/${s.id}`}
                    className="shrink-0 rounded-lg border border-[color:var(--hair-strong)] px-3 py-1.5 text-sm font-semibold hover:bg-[color:var(--ink-3)]"
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
