import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: worker } = await supabase
    .from("workers")
    .select("roles, full_name")
    .eq("id", user.id)
    .single();

  const roles: string[] = worker?.roles ?? ["WORKER"];
  const isMedic = roles.includes("MEDIC");

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          SiteWallet
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/wallet" className="hover:underline">
            Wallet
          </Link>
          <Link href="/wallet/qr" className="hover:underline">
            My QR
          </Link>
          {isMedic && (
            <Link href="/medic" className="hover:underline">
              Medic
            </Link>
          )}
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
          <span className="hidden text-zinc-500 sm:inline">
            {worker?.full_name ?? user.email}
          </span>
        </div>
      </div>
    </nav>
  );
}
