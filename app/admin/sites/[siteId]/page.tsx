import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredentialLabel } from "@/lib/credentials";
import { assignSelfAsMedic, assignMedicByEmail } from "./actions";

export default async function SiteDetailPage(
  props: PageProps<"/admin/sites/[siteId]">,
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
      "id, name, rig_name, rig_number, lsd_location, project:projects(id, name, requirements_profile:requirements_profiles(id, required_credential_types), operator:companies(id, name))",
    )
    .eq("id", siteId)
    .single();

  if (!site) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <p>Site not found.</p>
        <Link href="/admin" className="text-sm underline">
          Back
        </Link>
      </main>
    );
  }

  const project = Array.isArray(site.project) ? site.project[0] : site.project;
  const reqProfile = project
    ? Array.isArray(project.requirements_profile)
      ? project.requirements_profile[0]
      : project.requirements_profile
    : null;
  const operator = project
    ? Array.isArray(project.operator)
      ? project.operator[0]
      : project.operator
    : null;
  const required: string[] = reqProfile?.required_credential_types ?? [];

  const { data: assignments } = await supabase
    .from("medic_assignments")
    .select("id, medic_id, assigned_at, expires_at, medic:workers(id, full_name)")
    .eq("site_id", siteId);

  const meAssigned = assignments?.some((a) => a.medic_id === user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href="/admin"
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; All sites
      </Link>
      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {operator?.name}
          {project?.name && (
            <>
              {" · "}
              {project.name}
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          {site.rig_name && <>Rig {site.rig_name} </>}
          {site.rig_number && <>#{site.rig_number} </>}
          {site.lsd_location && <>· {site.lsd_location}</>}
        </p>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Required credentials</h2>
        {required.length === 0 ? (
          <p className="text-sm text-zinc-500">No credentials required.</p>
        ) : (
          <ul className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {required.map((r) => (
              <li
                key={r}
                className="border-b border-zinc-100 px-4 py-2 text-sm last:border-0 dark:border-zinc-900"
              >
                {getCredentialLabel(r)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Medics</h2>
          {!meAssigned && (
            <form action={assignSelfAsMedic.bind(null, siteId)}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Assign myself as medic
              </button>
            </form>
          )}
        </div>

        {assignments && assignments.length > 0 ? (
          <ul className="space-y-2">
            {assignments.map((a) => {
              const medic = Array.isArray(a.medic) ? a.medic[0] : a.medic;
              return (
                <li
                  key={a.id}
                  className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  {medic?.full_name ?? medic?.id ?? a.medic_id}
                  {a.medic_id === user.id && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                      You
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No medics assigned yet.</p>
        )}

        <form
          action={assignMedicByEmail.bind(null, siteId)}
          className="mt-4 flex gap-2"
        >
          <input
            name="email"
            type="email"
            placeholder="medic@example.com"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Add medic by email
          </button>
        </form>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          The medic must have signed in at least once for this to work. Phase 2:
          send them an invite email automatically.
        </p>
      </section>

      <section className="mt-8 flex gap-3">
        <Link
          href={`/medic/${siteId}/scan`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Open scanner
        </Link>
        <Link
          href={`/medic/${siteId}/roster`}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Daily roster
        </Link>
      </section>
    </main>
  );
}
