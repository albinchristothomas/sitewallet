import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SWMark } from "@/lib/atoms";
import { signOutAction } from "@/lib/auth-actions";
import { type AccountType } from "@/lib/roles";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: worker } = await supabase
    .from("workers")
    .select("account_type, full_name")
    .eq("id", user.id)
    .single();

  const type: AccountType = (worker?.account_type ?? "WORKER") as AccountType;

  const linkCls =
    "rounded-md px-2.5 py-1.5 text-sm font-medium text-[color:var(--text-dim)] hover:bg-[color:var(--ink-2)] hover:text-[color:var(--text)]";

  return (
    <nav className="sticky top-0 z-20 border-b border-[color:var(--hair)] bg-[color:var(--ink-1)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <SWMark size={28} />
          <span className="text-sm font-bold tracking-tight">SiteWallet</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {type === "WORKER" && (
            <Link href="/wallet" className={linkCls}>
              Wallet
            </Link>
          )}
          {type === "MEDIC" && (
            <>
              <Link href="/medic" className={linkCls}>
                Medic
              </Link>
              <Link href="/admin" className={linkCls}>
                Setup
              </Link>
            </>
          )}
          <form action={signOutAction} className="ml-2">
            <button
              type="submit"
              className="rounded-md border border-[color:var(--hair-strong)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--text-dim)] hover:bg-[color:var(--ink-2)] hover:text-[color:var(--text)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
