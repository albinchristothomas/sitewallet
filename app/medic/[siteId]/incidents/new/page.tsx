import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";
import { IncidentForm } from "./incident-form";

export default async function NewIncidentPage(
  props: PageProps<"/medic/[siteId]/incidents/new">,
) {
  const { siteId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pull workers currently active on site, so the medic can attach the
  // incident to a specific person they just admitted (optional).
  const { data: activeRaw } = await supabase.rpc("active_sessions_for_site", {
    p_site_id: siteId,
  });
  type ActiveRow = {
    session_id: string;
    worker_id: string;
    worker_name: string | null;
  };
  const activeWorkers: ActiveRow[] = activeRaw ?? [];

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pb-10 pt-5">
      <Link
        href={`/medic/${siteId}/incidents`}
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Incidents
      </Link>
      <header className="mt-3">
        <Eyebrow className="mb-1">New incident</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Log an incident</h1>
        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
          Goes onto the end-of-day report. Anything that needs a paper trail.
        </p>
      </header>
      <div className="mt-7">
        <IncidentForm
          siteId={siteId}
          activeWorkers={activeWorkers.map((w) => ({
            id: w.worker_id,
            name: w.worker_name ?? w.worker_id.slice(0, 8),
          }))}
        />
      </div>
    </main>
  );
}
