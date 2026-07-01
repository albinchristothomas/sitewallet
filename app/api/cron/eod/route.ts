import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildEodEmailHtml,
  type EodCrewRow,
  type EodDenialRow,
  type EodIncidentRow,
} from "@/lib/eod/email";

// Daily End-of-Day auto-send. Vercel Cron hits this once per evening; for every
// active site with an eod_recipient_email it builds the day's report and emails
// it via Resend — even if the medic forgot. Exactly once per site per day
// (eod_sent_log unique constraint).
//
// NOTE: this deliberately queries sessions/audit_log/incidents directly with
// the service-role client. The daily_roster / daily_denials RPCs are gated on
// auth.uid() (is_medic_for_site) and return ZERO rows for a cron with no user.

const TZ = "America/Edmonton";

// "YYYY-MM-DD" for the current moment in Edmonton (site-local day).
function edmontonToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// UTC ISO bounds [start, end) of an Edmonton-local calendar day, DST-correct.
function edmontonDayBounds(day: string): { start: string; end: string } {
  const offsetAt = (isoLocalMidnight: string): string => {
    // Probe the UTC instant that corresponds *roughly* to that local midnight,
    // then read the zone's longOffset (e.g. "GMT-06:00") for it.
    const probe = new Date(`${isoLocalMidnight}T12:00:00Z`);
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      timeZoneName: "longOffset",
    })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")?.value; // "GMT-06:00"
    const m = part?.match(/GMT([+-]\d{2}:\d{2})/);
    return m ? m[1] : "-07:00"; // MST fallback
  };
  const next = new Date(`${day}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDay = next.toISOString().slice(0, 10);
  return {
    start: new Date(`${day}T00:00:00${offsetAt(day)}`).toISOString(),
    end: new Date(`${nextDay}T00:00:00${offsetAt(nextDay)}`).toISOString(),
  };
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`)
    .toLocaleDateString("en-CA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/\./g, "")
    .toUpperCase();
}

export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
  // when the CRON_SECRET env var is set. Reject everything else.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  // ?day=YYYY-MM-DD override for manual testing; defaults to today on site.
  const dayParam = request.nextUrl.searchParams.get("day");
  const day =
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)
      ? dayParam
      : edmontonToday();
  const { start, end } = edmontonDayBounds(day);

  const { data: sites, error: sitesErr } = await admin
    .from("sites")
    .select(
      "id, name, rig_name, well_number, lsd_location, muster_point, eod_recipient_email, project:projects(name, contract_name, operator:companies(name))",
    )
    .is("ended_at", null)
    .not("eod_recipient_email", "is", null);
  if (sitesErr) {
    return NextResponse.json({ error: sitesErr.message }, { status: 500 });
  }

  const results: Array<{ site: string; status: string }> = [];

  for (const site of sites ?? []) {
    const recipient = site.eod_recipient_email?.trim();
    if (!recipient) continue;

    // Exactly-once: skip if already sent for this site + day.
    const { data: already } = await admin
      .from("eod_sent_log")
      .select("id")
      .eq("site_id", site.id)
      .eq("report_day", day)
      .maybeSingle();
    if (already) {
      results.push({ site: site.name, status: "already sent" });
      continue;
    }

    // --- gather the day's records (direct table reads; service role) ---
    const [{ data: sessions }, { data: denialRows }, { data: incidents }] =
      await Promise.all([
        admin
          .from("sessions")
          .select("worker_id, check_in_at, check_out_at")
          .eq("site_id", site.id)
          .gte("check_in_at", start)
          .lt("check_in_at", end)
          .order("check_in_at", { ascending: true }),
        admin
          .from("audit_log")
          .select("entity_id, payload, created_at")
          .eq("event_type", "WORKER_DENIED")
          .eq("payload->>site_id", site.id)
          .gte("created_at", start)
          .lt("created_at", end),
        admin
          .from("incidents")
          .select("type, severity, description, occurred_at")
          .eq("site_id", site.id)
          .gte("occurred_at", start)
          .lt("occurred_at", end)
          .order("occurred_at", { ascending: true }),
      ]);

    const sess = sessions ?? [];
    const dens = denialRows ?? [];
    const incs = incidents ?? [];

    // Quiet day at a site → nothing to report, don't spam the operator.
    if (sess.length === 0 && dens.length === 0 && incs.length === 0) {
      results.push({ site: site.name, status: "no activity — skipped" });
      continue;
    }

    // Resolve worker names/companies in one query.
    const ids = [
      ...new Set([
        ...sess.map((s) => s.worker_id),
        ...dens.map((d) => d.entity_id).filter(Boolean),
      ]),
    ] as string[];
    const { data: workers } = ids.length
      ? await admin
          .from("workers")
          .select("id, full_name, contractor_company")
          .in("id", ids)
      : { data: [] };
    const wmap = new Map((workers ?? []).map((w) => [w.id, w]));

    const crew: EodCrewRow[] = sess.map((s) => {
      const w = wmap.get(s.worker_id);
      const mins =
        s.check_out_at != null
          ? Math.max(
              0,
              (new Date(s.check_out_at).getTime() -
                new Date(s.check_in_at).getTime()) /
                60000,
            )
          : null;
      return {
        name: w?.full_name ?? "Unnamed worker",
        company: w?.contractor_company ?? null,
        inAt: hhmm(s.check_in_at),
        outAt: s.check_out_at ? hhmm(s.check_out_at) : null,
        hours: mins != null ? (mins / 60).toFixed(1) : null,
      };
    });

    const denials: EodDenialRow[] = dens.map((d) => ({
      name: wmap.get(d.entity_id as string)?.full_name ?? "Unknown",
      reason: (d.payload as { reason?: string } | null)?.reason ?? null,
      at: hhmm(d.created_at),
    }));

    const incidentRows: EodIncidentRow[] = incs.map((i) => ({
      type: i.type,
      severity: i.severity,
      description: i.description,
      at: hhmm(i.occurred_at),
    }));

    const totalMinutes = sess.reduce((sum, s) => {
      if (!s.check_out_at) return sum;
      return (
        sum +
        Math.max(
          0,
          (new Date(s.check_out_at).getTime() -
            new Date(s.check_in_at).getTime()) /
            60000,
        )
      );
    }, 0);

    const proj = Array.isArray(site.project) ? site.project[0] : site.project;
    const oper = proj
      ? Array.isArray(proj.operator)
        ? proj.operator[0]
        : proj.operator
      : null;

    const html = buildEodEmailHtml({
      siteName: site.name,
      wellLsd: site.lsd_location || site.well_number || "—",
      operatorName: oper?.name ?? "—",
      contractName: proj?.contract_name ?? null,
      muster:
        site.muster_point?.trim() ||
        (site.rig_name ? `${site.rig_name} muster point` : "Per site plan"),
      dayLabel: dayLabel(day),
      admittedCount: sess.length,
      deniedCount: denials.length,
      crewHours: (totalMinutes / 60).toFixed(1),
      recordableCount: incs.filter(
        (i) => i.severity === "HIGH" || i.severity === "CRITICAL",
      ).length,
      crew,
      denials,
      incidents: incidentRows,
    });

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RigWise <noreply@rigwise.ca>",
        to: [recipient],
        subject: `Daily Safety Report · ${site.name} · ${dayLabel(day)}`,
        html,
      }),
    });

    if (!send.ok) {
      const detail = await send.text().catch(() => "");
      results.push({
        site: site.name,
        status: `send failed (${send.status}) ${detail.slice(0, 120)}`,
      });
      continue;
    }

    await admin
      .from("eod_sent_log")
      .insert({ site_id: site.id, report_day: day, recipient });
    results.push({ site: site.name, status: `sent → ${recipient}` });
  }

  return NextResponse.json({ day, results });
}
