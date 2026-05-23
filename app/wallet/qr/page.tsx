import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";

function shortId(uuid: string): string {
  return `SW-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`;
}

export default async function WalletQrPage() {
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

  const qrSvg = await QRCode.toString(user.id, {
    type: "svg",
    margin: 1,
    width: 300,
    color: { dark: "#0E1116", light: "#FACC15" },
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-2">
      <div className="flex h-12 items-center">
        <Link
          href="/wallet"
          className="flex items-center gap-1.5 text-[15px] font-medium text-[color:var(--text)]"
        >
          <span aria-hidden>←</span> Wallet
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-faint)]">
          Gate Pass
        </div>

        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "#FACC15",
            padding: 14,
            boxShadow: "0 20px 50px -10px rgba(250,204,21,0.35)",
          }}
        >
          <div
            className="mx-auto"
            style={{ width: 300, height: 300 }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>

        <div>
          <div className="text-[26px] font-bold leading-tight">
            {worker?.full_name ?? user.email}
          </div>
          <div className="mt-1.5 font-mono text-[13px] text-[color:var(--text-dim)]">
            {shortId(user.id)}
          </div>
        </div>

        <div className="inline-flex items-center gap-2.5 rounded-full border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-3.5 py-2 text-[12px] text-[color:var(--text-faint)]">
          <span
            className="sw-pulse inline-block h-2 w-2 rounded-full"
            style={{ background: "#FACC15" }}
          />
          Show this to the medic at the gate
        </div>

        <details className="w-full rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] text-left">
          <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-semibold text-[color:var(--text-dim)] hover:text-[color:var(--text)]">
            Camera not working? Tap here
          </summary>
          <div className="border-t border-[color:var(--hair)] px-4 py-3 text-[12px] leading-relaxed text-[color:var(--text-dim)]">
            <p>If the medic can&apos;t scan the QR, ask them to use Manual entry and read this code:</p>
            <div className="mt-2.5 select-all rounded-md bg-[color:var(--ink-1)] px-3 py-2 font-mono text-[11px] text-[color:var(--text)] break-all">
              {user.id}
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
