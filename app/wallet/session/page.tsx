import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkOut } from "./actions";

export default async function ActiveSessionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, check_in_at, status, site:sites(name, rig_name, rig_number, project:projects(name, operator:companies(name)))",
    )
    .eq("worker_id", user.id)
    .eq("status", "ACTIVE")
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">No active session</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You're not checked in to a site right now.
        </p>
        <Link
          href="/wallet/qr"
          className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Show my QR
        </Link>
      </main>
    );
  }

  const site = Array.isArray(session.site) ? session.site[0] : session.site;
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
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <div className="rounded-2xl bg-emerald-50 p-6 dark:bg-emerald-950/30">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          Active on site
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {site?.name}
          {site?.rig_name && (
            <>
              <br />
              <span className="text-base font-medium">
                {site.rig_name}
                {site.rig_number && <> #{site.rig_number}</>}
              </span>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
          {operator?.name}
          {project?.name && <> · {project.name}</>}
        </p>
        <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300">
          Checked in {new Date(session.check_in_at).toLocaleString()}
        </p>
      </div>

      <form action={checkOut.bind(null, session.id)} className="mt-6">
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-4 text-base font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Check out
        </button>
      </form>
    </main>
  );
}
