import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark, BrandWordmark, Eyebrow } from "@/lib/atoms";
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
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="rw-enter w-full max-w-[400px]">
        {/* Brand block */}
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={48} />
          <h1 className="mt-4 text-[26px] font-bold leading-none tracking-[-0.02em]">
            <BrandWordmark />
          </h1>
          {as ? (
            <>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-1)] px-3 py-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]" />
                <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
                  Signing in as {ROLE_LABELS[as]}
                </span>
              </div>
              <p className="mt-3 max-w-[300px] text-[13px] leading-relaxed text-[color:var(--text-dim)]">
                {INTENT_DESCRIPTION[as].long}
              </p>
            </>
          ) : (
            <Eyebrow className="mt-3.5">Sign in with your work email</Eyebrow>
          )}
        </div>

        {/* Form */}
        <LoginForm signupAs={as} />

        {/* Help link */}
        <p className="mt-8 text-center text-[11.5px] text-[color:var(--text-faint)]">
          Trouble signing in?{" "}
          <Link
            href="/help"
            className="font-medium text-[color:var(--text-dim)] underline-offset-4 transition-colors hover:text-[color:var(--text)] hover:underline"
          >
            Read the help guide
          </Link>
        </p>
      </div>
    </main>
  );
}
