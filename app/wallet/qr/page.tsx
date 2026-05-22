import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";

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
    width: 320,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-10">
      <Link
        href="/wallet"
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; Back to wallet
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">My QR</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Show this to the medic at the gate.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div
          className="mx-auto w-full max-w-xs"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="mt-4 font-medium">{worker?.full_name ?? user.email}</p>
        <p className="mt-1 font-mono text-xs text-zinc-500 break-all">
          {user.id}
        </p>
      </div>

      <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Phase 1 QR is static. Phase 2 will rotate this every 30 seconds with a
        signed token so a screenshot can't be reused.
      </div>
    </main>
  );
}
