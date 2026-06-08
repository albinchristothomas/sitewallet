import Link from "next/link";
import { redirect } from "next/navigation";
import { HardHat, Stethoscope, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SWMark } from "@/lib/atoms";
import { homeForType, INTENT_DESCRIPTION, type SignupIntent, type AccountType } from "@/lib/roles";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: w } = await supabase
      .from("workers")
      .select("account_type")
      .eq("id", user.id)
      .single();
    const type = (w?.account_type ?? "WORKER") as AccountType;
    redirect(homeForType(type));
  }

  const intents: Array<{ key: SignupIntent; icon: React.ReactNode }> = [
    { key: "worker", icon: <HardHat size={24} strokeWidth={1.75} /> },
    { key: "medic", icon: <Stethoscope size={24} strokeWidth={1.75} /> },
  ];

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex justify-center">
          <SWMark size={56} />
        </div>
        <p className="mb-2 text-center font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--text-faint)]">
          For Canadian energy worksites
        </p>
        <h1 className="text-center text-4xl font-bold tracking-tight">
          SiteWallet
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[15px] text-[color:var(--text-dim)]">
          Pick how you&apos;ll use SiteWallet.
        </p>

        <div className="mt-8 space-y-2.5">
          {intents.map(({ key, icon }) => {
            const meta = INTENT_DESCRIPTION[key];
            return (
              <Link
                key={key}
                href={`/login?as=${key}`}
                className="group flex items-center gap-4 rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-5 transition hover:border-[color:var(--hair-strong)] hover:bg-[color:var(--ink-3)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[color:var(--ink-3)] text-[color:var(--hi-yellow)] group-hover:bg-[color:var(--hi-yellow)] group-hover:text-[color:var(--ink-1)]">
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-semibold">{meta.short}</div>
                  <div className="mt-1 text-[12px] leading-snug text-[color:var(--text-dim)]">
                    {meta.long}
                  </div>
                </div>
                <ArrowRight size={18} className="shrink-0 text-[color:var(--text-faint)] group-hover:text-[color:var(--text)]" />
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[12px] text-[color:var(--text-faint)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[color:var(--text-dim)] underline-offset-2 hover:text-[color:var(--text)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
