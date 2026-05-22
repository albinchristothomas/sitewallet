import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Scanner } from "./scanner";

export default async function ScanPage(props: PageProps<"/medic/[siteId]/scan">) {
  const { siteId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <Link
        href={`/medic/${siteId}`}
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        &larr; Site
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Scan worker QR
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Hold the worker's phone in front of the camera, or type their ID below.
      </p>
      <div className="mt-6">
        <Scanner siteId={siteId} />
      </div>
    </main>
  );
}
