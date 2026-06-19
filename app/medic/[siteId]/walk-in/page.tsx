import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/lib/atoms";
import { WalkInForm } from "./walk-in-form";

export const metadata = { title: "Add walk-in" };

export default async function WalkInPage(
  props: PageProps<"/medic/[siteId]/walk-in">,
) {
  const { siteId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Confirm the caller is a medic for this site before showing the form.
  const { data: isMedic } = await supabase.rpc("is_medic_for_site", {
    target_site_id: siteId,
  });
  if (!isMedic) redirect(`/medic/${siteId}`);

  const { data: site } = await supabase
    .from("sites")
    .select("name, rig_name, well_number")
    .eq("id", siteId)
    .single();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-12 pt-4">
      <Link
        href={`/medic/${siteId}`}
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Site
      </Link>

      <header className="mt-3 mb-6">
        <Eyebrow tone="brand">Walk-in · no app</Eyebrow>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-[-0.015em]">
          Add a worker at the gate
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--text-dim)]">
          For someone who doesn&apos;t have RigWise yet.{" "}
          {site?.well_number ? `${site.well_number} · ` : ""}
          {site?.name}
          {site?.rig_name ? ` · ${site.rig_name}` : ""}.
        </p>
      </header>

      <WalkInForm siteId={siteId} />
    </main>
  );
}
