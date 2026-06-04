import Link from "next/link";
import { redirect } from "next/navigation";
import { ScanLine, IdCard, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getCredentialLabel,
  getExpiryStatus,
} from "@/lib/credentials";
import { Avatar, Eyebrow, StatusPill, getInitials } from "@/lib/atoms";

function shortId(uuid: string): string {
  return `SW-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`;
}

export default async function WalletPage(props: PageProps<"/wallet">) {
  const sp = await props.searchParams;
  const justSaved = typeof sp.saved === "string" ? sp.saved : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: worker } = await supabase
    .from("workers")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: credentials } = await supabase
    .from("credentials")
    .select("*")
    .eq("worker_id", user.id)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  const credentialsList = credentials ?? [];

  const validCount = credentialsList.filter(
    (c) => getExpiryStatus(c.expiry_date) === "valid",
  ).length;
  const expiringCount = credentialsList.filter(
    (c) => getExpiryStatus(c.expiry_date) === "expiring_soon",
  ).length;
  const expiredCount = credentialsList.filter(
    (c) => getExpiryStatus(c.expiry_date) === "expired",
  ).length;

  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id, check_in_at, site:sites(name, rig_name, rig_number)")
    .eq("worker_id", user.id)
    .eq("status", "ACTIVE")
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeSite = activeSession?.site
    ? Array.isArray(activeSession.site)
      ? activeSession.site[0]
      : activeSession.site
    : null;

  const fullName = worker?.full_name ?? user.email ?? "Worker";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pb-10 pt-5">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow className="mb-1.5">Wallet</Eyebrow>
          <div className="truncate text-2xl font-bold leading-tight tracking-tight">
            {fullName}
          </div>
          <div className="mt-1 font-mono text-[12px] text-[color:var(--text-dim)]">
            {shortId(user.id)}
          </div>
        </div>
        <Avatar initials={getInitials(fullName)} size={46} />
      </header>

      {justSaved && (
        <div
          className="mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3"
          style={{
            background: "rgba(16,185,129,0.10)",
            borderColor: "rgba(16,185,129,0.32)",
          }}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(16,185,129,0.30)", color: "#10B981" }}
          >
            ✓
          </div>
          <div className="text-[13px]">
            <span className="font-semibold text-[color:#34D399]">
              {getCredentialLabel(justSaved)}
            </span>{" "}
            <span className="text-[color:var(--text-dim)]">
              added to your wallet.
            </span>
          </div>
        </div>
      )}

      {activeSession && (
        <Link
          href="/wallet/session"
          className="mb-5 flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 transition hover:brightness-110"
          style={{
            background: "rgba(16,185,129,0.10)",
            borderColor: "rgba(16,185,129,0.32)",
          }}
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{
              background: "#10B981",
              boxShadow: "0 0 0 6px rgba(16,185,129,0.18)",
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:#34D399]">
              On site now
            </div>
            <div className="mt-0.5 truncate text-[15px] font-semibold">
              {activeSite?.name}
              {activeSite?.rig_name && <> · {activeSite.rig_name}</>}
            </div>
          </div>
          <span className="text-[color:#34D399]">›</span>
        </Link>
      )}

      <div className="mb-3 grid grid-cols-[1.4fr_1fr] gap-2.5">
        <Link
          href="/wallet/qr"
          className="flex h-[124px] flex-col justify-between rounded-2xl bg-[color:var(--hi-yellow)] p-5 text-[color:var(--ink-1)] transition hover:brightness-95"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
            <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
            <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
            <path d="M14.5 14.5h2.5v2.5M20.5 14.5v3M14.5 18.5v2M17.5 20.5h3M20.5 17.5v3" />
          </svg>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-60">
              Gate
            </div>
            <div className="mt-0.5 text-[19px] font-bold leading-tight">
              Show my QR
            </div>
          </div>
        </Link>
        <Link
          href="/wallet/credentials/new"
          className="flex h-[124px] flex-col justify-between rounded-2xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-5 transition hover:bg-[color:var(--ink-3)]"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-faint)]">
              Wallet
            </div>
            <div className="mt-0.5 text-[19px] font-bold leading-tight">
              Add credential
            </div>
          </div>
        </Link>
      </div>

      <Link
        href="/wallet/credentials/scan"
        className="mb-6 flex items-center gap-3 rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-4 py-3 transition hover:bg-[color:var(--ink-3)]"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(250,204,21,0.15)", color: "#FACC15" }}
        >
          <ScanLine size={18} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">Scan a paper ticket</div>
          <div className="text-[11px] text-[color:var(--text-faint)]">
            Snap a photo, we auto-fill the form
          </div>
        </div>
        <ChevronRight size={16} className="text-[color:var(--text-dim)]" />
      </Link>

      <div className="mb-3 flex items-center justify-between">
        <Eyebrow>Credentials · {credentialsList.length}</Eyebrow>
        <div className="font-mono text-[11px] text-[color:var(--text-faint)]">
          {validCount} valid · {expiringCount} expiring · {expiredCount} expired
        </div>
      </div>

      {credentialsList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--ink-3)] text-[color:var(--hi-yellow)]">
            <IdCard size={28} strokeWidth={1.75} />
          </div>
          <p className="mt-3 text-[15px] font-semibold">
            Add your first ticket
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-dim)]">
            H2S Alive, First Aid, Ground Disturbance, CSO — whatever you carry
            in your wallet today. Type in the dates and certificate number,
            and you&apos;re set.
          </p>
          <Link
            href="/wallet/credentials/new"
            className="mt-4 inline-block rounded-lg bg-[color:var(--hi-yellow)] px-4 py-2.5 text-sm font-bold text-[color:var(--ink-1)] hover:brightness-95"
          >
            + Add credential
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {credentialsList.map((c) => {
            const status = getExpiryStatus(c.expiry_date);
            const accent =
              status === "valid"
                ? "#10B981"
                : status === "expiring_soon"
                  ? "#F59E0B"
                  : status === "expired"
                    ? "#EF4444"
                    : "#3F4651";
            const pillStatus =
              status === "expiring_soon"
                ? "expiring"
                : status === "no_expiry"
                  ? "info"
                  : status;
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-4"
                style={{ borderLeft: `3px solid ${accent}` }}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[16px] font-bold leading-snug">
                      {getCredentialLabel(c.credential_type)}
                    </div>
                    <div className="mt-0.5 text-[13px] text-[color:var(--text-dim)]">
                      {c.issuer ?? "Issuer not recorded"}
                    </div>
                  </div>
                  <StatusPill
                    status={pillStatus}
                    label={
                      status === "no_expiry"
                        ? "No expiry"
                        : status === "expiring_soon"
                          ? "Expiring"
                          : undefined
                    }
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-[color:var(--hair)] pt-2.5 font-mono text-[11px] text-[color:var(--text-faint)]">
                  <span>
                    {c.certificate_number ? `#${c.certificate_number}` : "—"}
                  </span>
                  <span>
                    {c.expiry_date
                      ? `EXP ${new Date(c.expiry_date)
                          .toLocaleDateString("en-CA", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                          .toUpperCase()}`
                      : "NO EXPIRY"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
