import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredentialLabel } from "@/lib/credentials";
import { Avatar, Eyebrow, StatusPill, getInitials } from "@/lib/atoms";
import { assignSelfAsMedic } from "./actions";

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
      "id, name, rig_name, rig_number, lsd_location, project:projects(id, name, requirements_profile:requirements_profiles(id, required_credential_types), operator:companies(id, name))",
    )
    .eq("id", siteId)
    .single();

  if (!site) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <p>Site not found.</p>
        <Link href="/admin" className="text-sm underline">
          Back
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

  const meAssigned = assignments?.some((a) => a.medic_id === user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-6">
      <Link
        href="/admin"
        className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]"
      >
        ← All sites
      </Link>

      {justCreated && (
        <div
          className="mt-3 flex items-center gap-3 rounded-2xl border px-4 py-3"
          style={{
            background: "rgba(16,185,129,0.10)",
            borderColor: "rgba(16,185,129,0.32)",
          }}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(16,185,129,0.30)", color: "#10B981" }}
          >
            ✓
          </div>
          <div className="text-[13px]">
            <span className="font-semibold text-[color:#34D399]">
              Site created.
            </span>{" "}
            <span className="text-[color:var(--text-dim)]">
              Now assign a medic and you&apos;re ready to scan workers in.
            </span>
          </div>
        </div>
      )}

      <header className="mt-3">
        <Eyebrow className="mb-1">Site</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">{site.name}</h1>
        <p className="mt-1 text-sm text-[color:var(--text-dim)]">
          {operator?.name}
          {project?.name && <> · {project.name}</>}
        </p>
        <p className="mt-1 font-mono text-[12px] text-[color:var(--text-faint)]">
          {site.rig_name && <>Rig {site.rig_name} </>}
          {site.rig_number && <>#{site.rig_number} </>}
          {site.lsd_location && <>· {site.lsd_location}</>}
        </p>
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
                className="flex items-center justify-between rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-4 py-2.5 text-sm"
              >
                <span>{getCredentialLabel(r)}</span>
                <StatusPill status="info" label="Required" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-2.5 flex items-center justify-between">
          <Eyebrow>Medics · {assignments?.length ?? 0}</Eyebrow>
          {!meAssigned && (
            <form action={assignSelfAsMedic.bind(null, siteId)}>
              <button
                type="submit"
                className="rounded-lg border border-[color:var(--hair-strong)] px-3 py-1.5 text-sm font-semibold hover:bg-[color:var(--ink-2)]"
              >
                Assign myself
              </button>
            </form>
          )}
        </div>

        {assignments && assignments.length > 0 ? (
          <ul className="space-y-2">
            {assignments.map((a) => {
              const medic = Array.isArray(a.medic) ? a.medic[0] : a.medic;
              const isMe = a.medic_id === user.id;
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
                  {isMe && <StatusPill status="info" label="You" />}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[color:var(--text-faint)]">
            No medics assigned yet.
          </p>
        )}
        <p className="mt-2 text-[12px] text-[color:var(--text-faint)]">
          To add another medic for now: ask them to sign in first, then come
          back here and tell us — we&apos;ll wire up email invites for medics
          next.
        </p>
      </section>

      <section className="mt-8 flex gap-3">
        <Link
          href={`/medic/${siteId}/scan`}
          className="rounded-xl bg-[color:var(--hi-yellow)] px-5 py-3 text-sm font-bold text-[color:var(--ink-1)] hover:brightness-95"
        >
          Open scanner
        </Link>
        <Link
          href={`/medic/${siteId}/roster`}
          className="rounded-xl border border-[color:var(--hair-strong)] px-5 py-3 text-sm font-semibold hover:bg-[color:var(--ink-2)]"
        >
          Daily roster
        </Link>
      </section>
    </main>
  );
}
