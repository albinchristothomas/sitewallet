import Link from "next/link";
import { Eyebrow } from "@/lib/atoms";
import { InviteForm } from "./invite-form";

export default function InvitePage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pb-10 pt-6">
      <Link
        href="/admin"
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Admin
      </Link>
      <header className="mt-3">
        <Eyebrow className="mb-1">Invite</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Invite worker</h1>
        <p className="mt-2 text-sm text-[color:var(--text-dim)]">
          Sends a sign-in link to the worker's email. They tap, set up their
          wallet, and they're in. No password.
        </p>
      </header>
      <div className="mt-7">
        <InviteForm />
      </div>
    </main>
  );
}
