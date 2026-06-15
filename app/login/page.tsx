import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark, BrandWordmark } from "@/lib/atoms";
import { INTENT_DESCRIPTION, type SignupIntent, homeForType, type AccountType } from "@/lib/roles";
import { LoginForm } from "./login-form";

function isIntent(s: string | string[] | undefined): s is SignupIntent {
  return s === "worker" || s === "medic";
}

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const as: SignupIntent | null = isIntent(sp.as) ? sp.as : null;

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

  const ROLE_LABELS: Record<SignupIntent, string> = {
    worker: "Worker · Wallet",
    medic: "Medic · Gate scanner",
  };

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <BrandMark size={56} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <BrandWordmark />
          </h1>
          {as ? (
            <>
              <p className="mt-3 inline-block rounded-full border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--hi-yellow)]">
                Signing in as {ROLE_LABELS[as]}
              </p>
              <p className="mt-3 text-sm text-[color:var(--text-dim)]">
                {INTENT_DESCRIPTION[as].long}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[color:var(--text-dim)]">
              Your safety credentials, in your pocket. Verified at the gate.
            </p>
          )}
        </div>
        <LoginForm signupAs={as} />
      </div>
    </main>
  );
}
