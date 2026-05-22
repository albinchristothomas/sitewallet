import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/wallet");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">SiteWallet</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your safety credentials, in your pocket. Verified at the gate.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
