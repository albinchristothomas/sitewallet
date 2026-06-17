import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandMark, BrandWordmark } from "@/lib/atoms";
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
    "rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-[color:var(--text-dim)] transition-colors hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text)]";

  return (
    <nav className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[color:var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
        <Link
          href="/"
          className="rw-pressable flex items-center gap-2.5 rounded-md py-1"
        >
          <BrandMark size={22} />
          <BrandWordmark className="text-[14px] font-bold tracking-[-0.01em]" />
        </Link>
        <div className="flex items-center gap-0.5 text-sm">
          {type === "WORKER" && (
            <>
              <Link href="/wallet" className={linkCls}>
                Wallet
              </Link>
              <Link href="/wallet/profile" className={linkCls}>
                Profile
              </Link>
            </>
          )}
          {type === "MEDIC" && (
            <>
              <Link href="/medic" className={linkCls}>
                Medic
              </Link>
              <Link href="/admin" className={linkCls}>
                Setup
              </Link>
              <Link href="/medic/profile" className={linkCls}>
                Profile
              </Link>
            </>
          )}
          <form action={signOutAction} className="ml-1.5">
            <button
              type="submit"
              className="rw-pressable rounded-md border border-[color:var(--line)] bg-[color:var(--surface-1)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[color:var(--text-dim)] transition-colors hover:border-[color:var(--line-strong)] hover:text-[color:var(--text)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
