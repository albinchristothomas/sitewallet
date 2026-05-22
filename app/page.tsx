import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SWMark } from "@/lib/atoms";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/wallet");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <SWMark size={64} />
        </div>
        <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--text-faint)]">
          For Canadian energy worksites
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          SiteWallet
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-[color:var(--text-dim)] sm:text-lg">
          Carry your safety credentials in your pocket. Verified at the gate by
          a medic in seconds. Your wallet stays with you when you change
          employers.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-[color:var(--hi-yellow)] px-7 py-4 text-base font-bold text-[color:var(--ink-1)] transition hover:brightness-95"
          >
            Sign in or sign up
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 text-left">
          {[
            {
              n: "01",
              title: "Worker",
              body: "Wallet on your phone. Show QR at the gate.",
            },
            {
              n: "02",
              title: "Medic",
              body: "Scan, see green or red, admit or deny.",
            },
            {
              n: "03",
              title: "Operator",
              body: "Set required tickets. See daily roster.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-4"
            >
              <div className="font-mono text-[11px] font-medium text-[color:var(--hi-yellow)]">
                {s.n}
              </div>
              <div className="mt-2 text-sm font-bold">{s.title}</div>
              <div className="mt-1 text-[12px] text-[color:var(--text-dim)]">
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
