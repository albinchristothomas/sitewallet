import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredentialLabel } from "@/lib/credentials";
import { Avatar, Eyebrow, getInitials } from "@/lib/atoms";
import { AssignMedicForm } from "./assign-medic-form";

export default async function SiteDetailPage(
  props: PageProps<"/admin/sites/[siteId]">,
) {
  const { siteId } = await props.params;
  const sp = await props.searchParams;
  const justCreated = sp.created === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, name, rig_name, rig_number, well_number, lsd_location, project:projects(id, name, contract_name, contractor_company_name, requirements_profile:requirements_profiles(id, required_credential_types), operator:companies(id, name))",
    )
    .eq("id", siteId)
    .single();

  if (!site) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <p>Site not found.</p>
        <Link
          href="/admin"
          className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
        >
          ← Admin
        </Link>
      </main>
    );
  }

  const project = Array.isArray(site.project) ? site.project[0] : site.project;
  const reqProfile = project
    ? Array.isArray(project.requirements_profile)
      ? project.requirements_profile[0]
      : project.requirements_profile
    : null;
  const operator = project
    ? Array.isArray(project.operator)
      ? project.operator[0]
      : project.operator
    : null;
  const required: string[] = reqProfile?.required_credential_types ?? [];

  const { data: assignments } = await supabase
    .from("medic_assignments")
    .select("id, medic_id, assigned_at, expires_at, medic:workers(id, full_name)")
    .eq("site_id", siteId);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-6">
      <Link
        href="/admin"
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← Admin
      </Link>

      {justCreated && (
        <div
          className="mt-3 rounded-2xl border px-4 py-3 text-[13px]"
          style={{
            background: "var(--ok-bg)",
            borderColor: "var(--ok-line)",
          }}
        >
          <span className="font-semibold text-[color:var(--ok-text)]">
            Site created.
          </span>{" "}
          <span className="text-[color:var(--text-dim)]">
            Assign a medic before the first shift.
          </span>
        </div>
      )}

      <header className="mt-3">
        <Eyebrow className="mb-1">Site</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
          {operator?.name}
          {project?.name && <> · {project.name}</>}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[12px]">
          {site.rig_name && (
            <Detail label="Rig" value={`${site.rig_name}${site.rig_number ? ` · #${site.rig_number}` : ""}`} />
          )}
          {site.well_number && <Detail label="Well" value={site.well_number} />}
          {site.lsd_location && <Detail label="LSD" value={site.lsd_location} />}
          {project?.contract_name && <Detail label="Contract" value={project.contract_name} />}
          {project?.contractor_company_name && (
            <Detail label="Contractor" value={project.contractor_company_name} />
          )}
        </dl>
      </header>

      <section className="mt-7">
        <Eyebrow className="mb-2.5">Required credentials</Eyebrow>
        {required.length === 0 ? (
          <p className="text-sm text-[color:var(--text-faint)]">
            No credentials required.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {required.map((r) => (
              <li
                key={r}
                className="flex items-center rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-4 py-2.5 text-sm"
              >
                <span>{getCredentialLabel(r)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-2.5">
          <Eyebrow>Medics · {assignments?.length ?? 0}</Eyebrow>
        </div>

        {assignments && assignments.length > 0 ? (
          <ul className="space-y-2">
            {assignments.map((a) => {
              const medic = Array.isArray(a.medic) ? a.medic[0] : a.medic;
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-4 py-2.5"
                >
                  <Avatar
                    initials={getInitials(medic?.full_name)}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {medic?.full_name ?? "—"}
                    </div>
                    <div className="font-mono text-[11px] text-[color:var(--text-faint)]">
                      since{" "}
                      {new Date(a.assigned_at)
                        .toLocaleDateString("en-CA", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        .toUpperCase()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[color:var(--text-faint)]">
            No medics assigned yet.
          </p>
        )}
        <AssignMedicForm siteId={siteId} />
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/medic/${siteId}/scan`}
          className="inline-flex h-10 items-center rounded-[7px] bg-[color:var(--hi-yellow)] px-4 text-[14px] font-bold text-[color:var(--ink-1)] hover:brightness-95"
        >
          Open scanner
        </Link>
        <Link
          href={`/medic/${siteId}/roster`}
          className="inline-flex h-10 items-center rounded-[7px] border border-[color:var(--hair-strong)] px-4 text-[14px] font-semibold hover:bg-[color:var(--ink-2)]"
        >
          Daily roster
        </Link>
        <Link
          href={`/medic/${siteId}/report`}
          className="inline-flex h-10 items-center rounded-[7px] border border-[color:var(--hair-strong)] px-4 text-[14px] font-semibold hover:bg-[color:var(--ink-2)]"
        >
          End-of-day report
        </Link>
        <Link
          href={`/medic/${siteId}/incidents`}
          className="inline-flex h-10 items-center rounded-[7px] border border-[color:var(--hair-strong)] px-4 text-[14px] font-semibold hover:bg-[color:var(--ink-2)]"
        >
          Incidents
        </Link>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-faint)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[color:var(--text-dim)]">{value}</dd>
    </div>
  );
}
