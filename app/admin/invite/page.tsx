import Link from "next/link";
import { InviteForm } from "./invite-form";

export default function InvitePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/admin"
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; Admin
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Invite worker
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Sends a sign-in link to the worker's email. They tap the link, set up
        their wallet, and they're in. No password.
      </p>
      <div className="mt-8">
        <InviteForm />
      </div>
    </main>
  );
}
