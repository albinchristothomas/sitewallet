import Link from "next/link";
import { Eyebrow } from "@/lib/atoms";
import { SiteForm } from "./site-form";

export default function NewSitePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-10 pt-6">
      <Link
        href="/admin"
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Admin
      </Link>
      <header className="mt-3">
        <Eyebrow className="mb-1">New site</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">
          Set up a worksite
        </h1>
        <p className="mt-2 text-sm text-[color:var(--text-dim)]">
          Creates the operator company, project, requirements profile, and the
          site in one go.
        </p>
      </header>
      <div className="mt-7">
        <SiteForm />
      </div>
    </main>
  );
}
