import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";
import { SITE_TZ, siteTime } from "@/lib/dates";
import { checkOut } from "./actions";
import { CheckoutButton } from "./checkout-button";

function formatDuration(checkIn: string): string {
  const minutes = Math.floor(
    (Date.now() - new Date(checkIn).getTime()) / 60000,
  );
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} m`;
}

export default async function ActiveSessionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, check_in_at, status, check_in_medic_id, site:sites(name, rig_name, rig_number, lsd_location, project:projects(name, operator:companies(name)))",
    )
    .eq("worker_id", user.id)
    .eq("status", "ACTIVE")
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight">No active session</h1>
        <p className="mt-2 text-sm text-[color:var(--text-dim)]">
          You're not checked in to a site right now.
        </p>
        <Link
          href="/wallet/qr"
          className="mt-6 rounded-xl bg-[color:var(--hi-yellow)] px-6 py-3.5 text-sm font-bold text-[color:var(--ink-1)] hover:brightness-95"
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

  const checkInTime = siteTime(session.check_in_at);
  const checkInDate = new Date(session.check_in_at)
    .toLocaleDateString("en-CA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: SITE_TZ,
    })
    .toUpperCase();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6 pt-2">
      <div className="flex h-14 items-center justify-between">
        <Link
          href="/wallet"
          className="flex items-center gap-1.5 text-[15px] font-medium text-[color:var(--text)]"
        >
          <span aria-hidden>←</span> Wallet
        </Link>
        <div className="text-[16px] font-bold">Session</div>
        <div className="w-5" />
      </div>

      <div
        className="mb-3.5 rounded-2xl p-5"
        style={{
          background:
            "linear-gradient(180deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 100%)",
          border: "1px solid rgba(16,185,129,0.35)",
        }}
      >
        <div className="mb-3.5 flex items-center gap-2.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{
              background: "#10B981",
              boxShadow: "0 0 0 6px rgba(16,185,129,0.20)",
            }}
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:#34D399]">
            Checked in · {formatDuration(session.check_in_at)}
          </span>
        </div>
        <Eyebrow className="mb-1.5">Site</Eyebrow>
        <div className="text-[22px] font-bold leading-tight">{site?.name}</div>
        <div className="mt-0.5 text-[15px] text-[color:var(--text-dim)]">
          {site?.rig_name && <>{site.rig_name} · </>}
          {operator?.name}
        </div>
        {project?.name && (
          <div className="mt-3.5 text-[13px] leading-snug text-[color:var(--text-dim)]">
            {project.name}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3.5 border-t border-white/[0.08] pt-4">
          <div>
            <Eyebrow className="mb-1">Check-in</Eyebrow>
            <div className="font-mono text-[17px] font-bold">{checkInTime}</div>
            <div className="mt-0.5 font-mono text-[12px] text-[color:var(--text-dim)]">
              {checkInDate}
            </div>
          </div>
          {site?.lsd_location && (
            <div>
              <Eyebrow className="mb-1">LSD</Eyebrow>
              <div className="font-mono text-[14px] font-semibold">
                {site.lsd_location}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <CheckoutButton action={checkOut.bind(null, session.id)} />
    </main>
  );
}
