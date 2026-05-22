import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";
import { Scanner } from "./scanner";

export default async function ScanPage(props: PageProps<"/medic/[siteId]/scan">) {
  const { siteId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-6 pt-5">
      <Link
        href={`/medic/${siteId}`}
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Site
      </Link>
      <header className="mt-3">
        <Eyebrow className="mb-1">Gate scan</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Scan worker QR</h1>
        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
          Hold the worker's phone in front of the camera, or type their ID
          below.
        </p>
      </header>
      <div className="mt-5 flex-1">
        <Scanner siteId={siteId} />
      </div>
    </main>
  );
}
