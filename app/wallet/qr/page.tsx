import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { QrActions } from "./qr-actions";

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
    width: 400,
    color: { dark: "#0E1116", light: "#FACC15" },
  });

  const fullName = worker?.full_name ?? user.email ?? "Worker";

  return (
    <main
      className="flex flex-1 flex-col px-5 pb-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
      }}
    >
      {/* Top: just a back button, big enough for thumb */}
      <div className="flex items-center">
        <Link
          href="/wallet"
          aria-label="Back to wallet"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-[22px] leading-none text-[color:var(--text-dim)] hover:bg-[color:var(--ink-2)] hover:text-[color:var(--text)]"
        >
          ←
        </Link>
      </div>

      {/* QR hero — fills the screen, centered vertically */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-faint)]">
          Gate pass
        </div>

        <div
          className="overflow-hidden rounded-[28px] bg-[color:var(--hi-yellow)] p-4"
          style={{
            width: "min(82vw, 360px)",
            aspectRatio: "1 / 1",
            boxShadow:
              "0 24px 60px -12px rgba(250,204,21,0.45), 0 8px 18px -8px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="qr-svg h-full w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>

        <div>
          <div className="text-[28px] font-bold leading-tight tracking-tight">
            {fullName}
          </div>
          <div className="mt-1.5 font-mono text-[13px] text-[color:var(--text-dim)]">
            {shortId(user.id)}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ink-2)] px-4 py-2 text-[12px] text-[color:var(--text-dim)]">
          <span className="sw-pulse inline-block h-2 w-2 rounded-full bg-[color:var(--hi-yellow)]" />
          Show this screen to the medic
        </div>
      </div>

      {/* Bottom actions: ID disclosure for camera-fails. Touch-friendly. */}
      <QrActions workerId={user.id} workerName={fullName} />

      {/* SVG fills its container, no inline width/height clobbering */}
      <style>{`.qr-svg svg { width: 100%; height: 100%; display: block; }`}</style>
    </main>
  );
}
