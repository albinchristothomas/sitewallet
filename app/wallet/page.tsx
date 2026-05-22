import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCredentialLabel,
  getExpiryStatus,
  type ExpiryStatus,
} from "@/lib/credentials";
import { signOut } from "./actions";

const STATUS_STYLES: Record<ExpiryStatus, string> = {
  valid:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  expiring_soon:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  expired: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  no_expiry:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const STATUS_LABELS: Record<ExpiryStatus, string> = {
  valid: "Valid",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  no_expiry: "No expiry on file",
};

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const { data: activeSession } = await supabase
    .from("sessions")
    .select("id, check_in_at, site:sites(name, rig_name)")
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Signed in as {user.email}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {worker?.full_name ?? "Your wallet"}
          </h1>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </header>

      {activeSession && (
        <Link
          href="/wallet/session"
          className="mb-6 block rounded-xl bg-emerald-50 p-4 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            On site now
          </p>
          <p className="mt-1 font-medium">
            {activeSite?.name}
            {activeSite?.rig_name && <> — {activeSite.rig_name}</>}
          </p>
          <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
            Since {new Date(activeSession.check_in_at).toLocaleString()} · tap
            to check out
          </p>
        </Link>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link
          href="/wallet/qr"
          className="rounded-lg border border-zinc-200 bg-white p-4 text-center hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        >
          <p className="text-sm font-medium">Show my QR</p>
          <p className="mt-0.5 text-xs text-zinc-500">For the gate medic</p>
        </Link>
        <Link
          href="/wallet/credentials/new"
          className="rounded-lg bg-zinc-900 p-4 text-center text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <p className="text-sm font-medium">+ Add credential</p>
          <p className="mt-0.5 text-xs opacity-70">Ticket, card, or cert</p>
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Credentials</h2>
      </div>

      {credentialsList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-zinc-600 dark:text-zinc-400">
            No credentials yet. Add your first safety ticket to get started.
          </p>
          <Link
            href="/wallet/credentials/new"
            className="mt-4 inline-block text-sm font-medium underline"
          >
            Add a credential
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {credentialsList.map((c) => {
            const status = getExpiryStatus(c.expiry_date);
            return (
              <li
                key={c.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">
                      {getCredentialLabel(c.credential_type)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {c.issuer ?? "Issuer not recorded"}
                      {c.certificate_number && (
                        <>
                          {" · "}
                          <span className="font-mono">
                            {c.certificate_number}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                      {c.issue_date && (
                        <>Issued {new Date(c.issue_date).toLocaleDateString()}</>
                      )}
                      {c.expiry_date && (
                        <>
                          {c.issue_date && " · "}Expires{" "}
                          {new Date(c.expiry_date).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
                  >
                    {STATUS_LABELS[status]}
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
