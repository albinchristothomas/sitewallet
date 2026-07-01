import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, StatusPill } from "@/lib/atoms";
import { siteTime, siteToday } from "@/lib/dates";

export default async function RosterPage(
  props: PageProps<"/medic/[siteId]/roster">,
) {
  const { siteId } = await props.params;
  const sp = await props.searchParams;
  const day = typeof sp.day === "string" ? sp.day : siteToday();

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

  type Row = {
    session_id: string;
    worker_name: string | null;
    worker_id: string;
    check_in_at: string;
    check_out_at: string | null;
    duration_minutes: number | null;
    status: string;
  };
  const list: Row[] = rows ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 pb-10 pt-5">
      <Link
        href={`/medic/${siteId}`}
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Site
      </Link>
      <header className="mt-3 flex items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-1">Daily roster</Eyebrow>
          <h1 className="text-2xl font-bold tracking-tight">
            {site?.name}
            {site?.rig_name && <> · {site.rig_name}</>}
            {site?.rig_number && <> #{site.rig_number}</>}
          </h1>
        </div>
        <form className="flex items-end gap-2">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-faint)]">
              Date
            </label>
            <input
              type="date"
              name="day"
              defaultValue={day}
              className="mt-1 rounded-lg border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-3 py-2 text-sm focus:border-[color:var(--hi-yellow)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-[color:var(--hair-strong)] px-3 py-2 text-sm font-semibold hover:bg-[color:var(--ink-2)]"
          >
            Apply
          </button>
        </form>
      </header>

      <p className="mt-3 font-mono text-[12px] text-[color:var(--text-faint)]">
        {list.length} sessions on {day}
      </p>

      {list.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-10 text-center text-sm text-[color:var(--text-dim)]">
          No activity for this day.
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--hair)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-faint)]">
                <th className="px-4 py-2.5">Worker</th>
                <th className="px-4 py-2.5">Check-in</th>
                <th className="px-4 py-2.5">Check-out</th>
                <th className="px-4 py-2.5">Duration</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const onSite = r.status === "ACTIVE";
                return (
                  <tr
                    key={r.session_id}
                    className="border-t border-[color:var(--hair)]"
                  >
                    <td className="px-4 py-3 font-medium">
                      {r.worker_name ?? r.worker_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[color:var(--text-dim)]">
                      {siteTime(r.check_in_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[color:var(--text-dim)]">
                      {r.check_out_at ? siteTime(r.check_out_at) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[color:var(--text-dim)]">
                      {r.duration_minutes
                        ? `${Math.floor(r.duration_minutes / 60)}h ${r.duration_minutes % 60}m`
                        : onSite
                          ? "on site"
                          : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        status={onSite ? "ok" : "info"}
                        label={onSite ? "On site" : r.status.toLowerCase()}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
