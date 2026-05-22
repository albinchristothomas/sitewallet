import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function RosterPage(
  props: PageProps<"/medic/[siteId]/roster">,
) {
  const { siteId } = await props.params;
  const sp = await props.searchParams;
  const day = typeof sp.day === "string" ? sp.day : isoToday();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: site } = await supabase
    .from("sites")
    .select("name, rig_name, rig_number")
    .eq("id", siteId)
    .single();

  const { data: rows } = await supabase.rpc("daily_roster", {
    p_site_id: siteId,
    p_day: day,
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href={`/medic/${siteId}`}
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; Site
      </Link>
      <header className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Daily roster
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {site?.name}
            {site?.rig_name && <> — {site.rig_name}</>}
            {site?.rig_number && <> #{site.rig_number}</>}
          </p>
        </div>
        <form>
          <label className="block text-xs font-medium text-zinc-500">
            Date
          </label>
          <input
            type="date"
            name="day"
            defaultValue={day}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
          <button
            type="submit"
            className="ml-2 rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Apply
          </button>
        </form>
      </header>

      <p className="mt-4 text-sm text-zinc-500">
        {rows?.length ?? 0} sessions on {day}
      </p>

      {!rows || rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No activity for this day.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2">Worker</th>
                <th className="px-4 py-2">Check-in</th>
                <th className="px-4 py-2">Check-out</th>
                <th className="px-4 py-2">Duration</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(
                (r: {
                  session_id: string;
                  worker_name: string | null;
                  worker_id: string;
                  check_in_at: string;
                  check_out_at: string | null;
                  duration_minutes: number | null;
                  status: string;
                }) => (
                  <tr
                    key={r.session_id}
                    className="border-t border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="px-4 py-2">
                      {r.worker_name ?? r.worker_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {new Date(r.check_in_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {r.check_out_at
                        ? new Date(r.check_out_at).toLocaleTimeString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {r.duration_minutes
                        ? `${Math.floor(r.duration_minutes / 60)}h ${r.duration_minutes % 60}m`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">{r.status}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
