import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredentialLabel } from "@/lib/credentials";
import { admitWorker } from "./actions";

type Compliance = {
  credential_type: string;
  status: "VALID" | "EXPIRED" | "MISSING";
  expiry_date: string | null;
  credential_id: string | null;
};

type CompliancePayload = {
  worker: { id: string; full_name: string | null; photo_url: string | null };
  required: string[];
  credentials: Array<{
    id: string;
    credential_type: string;
    issuer: string | null;
    certificate_number: string | null;
    expiry_date: string | null;
  }>;
  compliance: Compliance[];
  evaluated_at: string;
};

const STATUS_COPY: Record<Compliance["status"], { label: string; cls: string }> = {
  VALID: {
    label: "Valid",
    cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  EXPIRED: {
    label: "Expired",
    cls: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  },
  MISSING: {
    label: "Missing",
    cls: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  },
};

export default async function VerifyWorkerPage(
  props: PageProps<"/medic/[siteId]/verify/[workerId]">,
) {
  const { siteId, workerId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("worker_compliance_for_site", {
    p_worker_id: workerId,
    p_site_id: siteId,
  });

  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href={`/medic/${siteId}/scan`}
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          &larr; Scan
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Couldn't verify
        </h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error?.message ?? "Worker not found."}
        </p>
      </main>
    );
  }

  const payload = data as CompliancePayload;
  const allPass = payload.compliance.every((c) => c.status === "VALID");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <Link
        href={`/medic/${siteId}/scan`}
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; Scan another
      </Link>

      <div
        className={`mt-4 rounded-2xl p-6 ${
          allPass
            ? "bg-emerald-50 dark:bg-emerald-950/30"
            : "bg-red-50 dark:bg-red-950/30"
        }`}
      >
        <p
          className={`text-xs font-bold uppercase tracking-widest ${
            allPass
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-red-700 dark:text-red-300"
          }`}
        >
          {allPass ? "Compliant" : "Not compliant"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {payload.worker.full_name ?? "Unnamed worker"}
        </h1>
        <p className="mt-1 font-mono text-xs text-zinc-500 break-all">
          {payload.worker.id}
        </p>
      </div>

      <h2 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Required credentials
      </h2>
      <ul className="space-y-2">
        {payload.compliance.map((c) => {
          const style = STATUS_COPY[c.status];
          return (
            <li
              key={c.credential_type}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div>
                <p className="font-medium">
                  {getCredentialLabel(c.credential_type)}
                </p>
                {c.expiry_date && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Expires {new Date(c.expiry_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${style.cls}`}
              >
                {style.label}
              </span>
            </li>
          );
        })}
        {payload.compliance.length === 0 && (
          <li className="text-sm text-zinc-500">
            This site has no required credentials.
          </li>
        )}
      </ul>

      <form
        action={admitWorker.bind(null, siteId, workerId, payload)}
        className="mt-8"
      >
        <button
          type="submit"
          className={`w-full rounded-md px-4 py-4 text-base font-semibold ${
            allPass
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          }`}
        >
          {allPass ? "Admit worker" : "Admit anyway (override)"}
        </button>
      </form>
      {!allPass && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Override is recorded in the audit log with your medic ID.
        </p>
      )}
    </main>
  );
}
