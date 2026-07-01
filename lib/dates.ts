// Site-local time helpers. Every RigWise pilot site is in the Alberta/BC oil
// patch, and the server (Vercel) runs in UTC — so any "today" or clock time
// computed naively is wrong for the gate (an evening check-in would land on
// tomorrow's report and print as a UTC time). All day-strings and displayed
// times go through these.
export const SITE_TZ = "America/Edmonton";

/** YYYY-MM-DD for "today" at the wellsite (America/Edmonton). */
export function siteToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SITE_TZ });
}

/** HH:MM (24h) at the wellsite for a timestamp. */
export function siteTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SITE_TZ,
  });
}

/**
 * UTC ISO bounds [start, end) of a wellsite-local calendar day, DST-correct.
 * Use these for timestamptz range queries (a naive `${day}T00:00:00` string
 * would be interpreted in the server's timezone — UTC on Vercel).
 */
export function siteDayBounds(day: string): { start: string; end: string } {
  const offsetAt = (isoDay: string): string => {
    // Probe midday UTC of that date, read the zone's offset (e.g. "GMT-06:00").
    const probe = new Date(`${isoDay}T12:00:00Z`);
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone: SITE_TZ,
      timeZoneName: "longOffset",
    })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")?.value;
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
