import Link from "next/link";
import { AddCredentialForm } from "./add-credential-form";

export default function NewCredentialPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/wallet"
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; Back to wallet
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Add credential
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Enter the details from your safety ticket. You can upload a photo later.
        Credentials are append-only: a renewal creates a new entry instead of
        replacing the old one.
      </p>
      <div className="mt-8">
        <AddCredentialForm />
      </div>
    </main>
  );
}
