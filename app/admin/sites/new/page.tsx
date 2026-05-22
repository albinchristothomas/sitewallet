import Link from "next/link";
import { SiteForm } from "./site-form";

export default function NewSitePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/admin"
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; Back to admin
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">New site</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Sets up the operator company, project, requirements profile, and the
        site in one form. Phase 2 will split these into separate workflows.
      </p>
      <div className="mt-8">
        <SiteForm />
      </div>
    </main>
  );
}
