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
    <main
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
      }}
    >
      <div className="flex items-center justify-between">
        <Link
          href={`/medic/${siteId}`}
          aria-label="Back to site"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-[22px] leading-none text-[color:var(--text-dim)] hover:bg-[color:var(--ink-2)] hover:text-[color:var(--text)]"
        >
          ←
        </Link>
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-faint)]">
          Scan
        </div>
        <div className="w-11" />
      </div>

      <Scanner siteId={siteId} />
    </main>
  );
}
