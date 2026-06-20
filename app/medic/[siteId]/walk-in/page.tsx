import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    <main
      className="mx-auto flex w-full max-w-[420px] flex-1 flex-col"
      style={{ color: "#f4f6f7" }}
    >
      <div style={{ padding: "14px 22px 0" }}>
        <Link
          href={`/medic/${siteId}`}
          className="mono"
          style={{
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "#9aa3ab",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          &larr; Site
        </Link>
        <div
          style={{
            fontWeight: 800,
            fontSize: "24px",
            letterSpacing: "-0.02em",
            color: "#f4f6f7",
            marginTop: "10px",
          }}
        >
          Walk-in intake
        </div>
        <div
          className="mono"
          style={{
            fontSize: "10px",
            letterSpacing: "0.06em",
            color: "#9aa3ab",
            marginTop: "5px",
            textTransform: "uppercase",
          }}
        >
          No app &middot; capture face, details, cards
        </div>
        {(site?.well_number || site?.name || site?.rig_name) && (
          <div
            className="mono"
            style={{
              fontSize: "10px",
              letterSpacing: "0.06em",
              color: "#5d666f",
              marginTop: "4px",
              textTransform: "uppercase",
            }}
          >
            {[site?.well_number, site?.name, site?.rig_name]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </div>

      <WalkInForm siteId={siteId} />
    </main>
  );
}
