import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Eyebrow, getInitials } from "@/lib/atoms";
import { GeneratedAvatar } from "@/lib/avatar-gen";
import { isOwner } from "@/lib/owner";
import { SITE_TZ } from "@/lib/dates";

export const metadata = { title: "People" };

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso)
    .toLocaleString("en-CA", {
      timeZone: SITE_TZ,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .toUpperCase();
}

// Owner-only roster of everyone who has signed up: who they are, how to reach
// them, what they've loaded, and whether they've actually been through a gate.
// This is the pilot dashboard — the answer to "is anyone really using it?"
export default async function PeoplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwner(user.email)) redirect("/");

  const admin = createAdminClient();

  const [{ data: authUsers }, { data: workers }, { data: creds }, { data: sessions }] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin
        .from("workers")
        .select(
          "id, full_name, account_type, contractor_company, phone, photo_url, profile_completed_at, created_by_medic_id, created_at",
        )
        .order("created_at", { ascending: false }),
      admin.from("credentials").select("worker_id, verification_status"),
      admin.from("sessions").select("worker_id, check_in_at"),
    ]);

  const emailById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );
  const lastSignInById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
  );

  const ticketCount = new Map<string, number>();
  const verifiedCount = new Map<string, number>();
  for (const c of creds ?? []) {
    ticketCount.set(c.worker_id, (ticketCount.get(c.worker_id) ?? 0) + 1);
    if (
      c.verification_status === "MANUALLY_VERIFIED" ||
      c.verification_status === "VERIFIED_BY_ISSUER"
    ) {
      verifiedCount.set(c.worker_id, (verifiedCount.get(c.worker_id) ?? 0) + 1);
    }
  }

  const lastGate = new Map<string, string>();
  for (const s of sessions ?? []) {
    const cur = lastGate.get(s.worker_id);
    if (!cur || s.check_in_at > cur) lastGate.set(s.worker_id, s.check_in_at);
  }

  const rows = (workers ?? []).map((w) => ({
    ...w,
    email: emailById.get(w.id) ?? "",
    lastSignIn: lastSignInById.get(w.id) ?? null,
    tickets: ticketCount.get(w.id) ?? 0,
    verified: verifiedCount.get(w.id) ?? 0,
    lastGate: lastGate.get(w.id) ?? null,
  }));

  const medics = rows.filter((r) => r.account_type === "MEDIC");
  const workerRows = rows.filter((r) => r.account_type !== "MEDIC");
  const withTickets = workerRows.filter((r) => r.tickets > 0).length;
  const everScanned = workerRows.filter((r) => r.lastGate).length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-12 pt-6">
      <Link
        href="/admin"
        className="mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Setup
      </Link>

      <header className="mt-3">
        <Eyebrow className="mb-1">Owner</Eyebrow>
        <h1 className="text-3xl font-bold tracking-tight">People</h1>
        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
          Everyone who has signed up, what they&apos;ve loaded, and whether
          they&apos;ve been through a gate.
        </p>
      </header>

      {/* pilot funnel */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Signed up" value={workerRows.length} tone="#f4f6f7" />
        <Stat label="Added tickets" value={withTickets} tone="#7ff0a8" />
        <Stat label="Scanned at a gate" value={everScanned} tone="#6ec8ff" />
        <Stat label="Medics" value={medics.length} tone="#ffd27a" />
      </div>

      <Section title={`Workers · ${workerRows.length}`} rows={workerRows} />
      {medics.length > 0 && (
        <Section title={`Medics · ${medics.length}`} rows={medics} />
      )}
    </main>
  );
}

type Row = {
  id: string;
  full_name: string | null;
  account_type: string;
  contractor_company: string | null;
  phone: string | null;
  photo_url: string | null;
  profile_completed_at: string | null;
  created_by_medic_id: string | null;
  created_at: string;
  email: string;
  lastSignIn: string | null;
  tickets: number;
  verified: number;
  lastGate: string | null;
};

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="mt-8">
      <Eyebrow className="mb-3">{title}</Eyebrow>
      {rows.length === 0 ? (
        <p className="text-sm text-[color:var(--text-faint)]">Nobody yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-[color:var(--hair)] p-3.5"
              style={{ background: "#15191e" }}
            >
              <div className="flex items-start gap-3">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9,
                    overflow: "hidden",
                    flex: "none",
                  }}
                >
                  <GeneratedAvatar
                    seed={r.id}
                    initials={getInitials(r.full_name)}
                    size={40}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[15px] font-bold">
                      {r.full_name ?? "Unnamed"}
                    </span>
                    {r.created_by_medic_id && (
                      <Chip tone="#ffd27a" bg="rgba(242,164,12,0.14)">
                        WALK-IN
                      </Chip>
                    )}
                    {!r.profile_completed_at && (
                      <Chip tone="#ff9a8f" bg="rgba(239,65,53,0.14)">
                        SETUP UNFINISHED
                      </Chip>
                    )}
                  </div>

                  <div className="mono mt-1 text-[11px] text-[color:var(--text-dim)]">
                    {r.email || "no email (walk-in)"}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-[color:var(--text-dim)]">
                    {r.contractor_company ?? "—"}
                    {r.phone && <> · {r.phone}</>}
                  </div>

                  <div className="mono mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] tracking-[0.06em] text-[color:var(--text-faint)]">
                    <span>
                      TICKETS{" "}
                      <span style={{ color: r.tickets ? "#7ff0a8" : "#5d666f" }}>
                        {r.tickets}
                      </span>
                      {r.verified > 0 && (
                        <span style={{ color: "#7ff0a8" }}>
                          {" "}
                          · {r.verified} VERIFIED
                        </span>
                      )}
                    </span>
                    <span>JOINED {fmtWhen(r.created_at)}</span>
                    <span>LAST SIGN-IN {fmtWhen(r.lastSignIn)}</span>
                    <span
                      style={{ color: r.lastGate ? "#6ec8ff" : "#5d666f" }}
                    >
                      LAST GATE {fmtWhen(r.lastGate)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div
      className="rounded-xl border border-[color:var(--hair)] px-4 py-3"
      style={{ background: "#15191e" }}
    >
      <div className="mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--text-faint)]">
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-archivo), sans-serif",
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: tone,
          lineHeight: 1.1,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Chip({
  children,
  tone,
  bg,
}: {
  children: React.ReactNode;
  tone: string;
  bg: string;
}) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: "0.1em",
        color: tone,
        background: bg,
        borderRadius: 999,
        padding: "2px 7px",
      }}
    >
      {children}
    </span>
  );
}
