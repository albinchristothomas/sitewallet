import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
      <div className="w-full max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          For Canadian energy worksites
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          SiteWallet
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
          Carry your safety credentials in your pocket. Verified at the gate by
          a medic in seconds. Your wallet stays with you when you change
          employers.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/login"
            className="rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Sign in or sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
