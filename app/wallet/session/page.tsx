import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SITE_TZ, siteTime } from "@/lib/dates";
import { checkOut } from "./actions";
import { CheckoutButton } from "./checkout-button";

function formatDuration(checkIn: string): string {
  const minutes = Math.floor(
    (Date.now() - new Date(checkIn).getTime()) / 60000,
  );
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, "0")}m`;
}

export default async function ActiveSessionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, check_in_at, status, check_in_medic_id, site:sites(name, rig_name, rig_number, lsd_location, project:projects(name, operator:companies(name)))",
    )
    .eq("worker_id", user.id)
    .eq("status", "ACTIVE")
    .order("check_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <h1
          style={{
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: "#f4f6f7",
          }}
        >
          Not checked in
        </h1>
        <div
          className="mono"
          style={{
            fontSize: 9.5,
            color: "#9aa3ab",
            letterSpacing: "0.04em",
            marginTop: 8,
            lineHeight: 1.6,
          }}
        >
          SCAN YOUR PASS AT THE GATE TO CHECK IN
        </div>
        <Link
          href="/wallet/qr"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 16,
            height: 52,
            padding: "0 18px",
            borderRadius: 9,
            background: "#f2581c",
            boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
            fontWeight: 800,
            fontSize: 14,
            color: "#0d0f12",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0d0f12"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h3v3M21 21v.01M17 21h.01M21 17v.01" />
          </svg>
          Show gate pass
        </Link>
      </main>
    );
  }

  const site = Array.isArray(session.site) ? session.site[0] : session.site;
  const project = site?.project
    ? Array.isArray(site.project)
      ? site.project[0]
      : site.project
    : null;
  const operator = project
    ? Array.isArray(project.operator)
      ? project.operator[0]
      : project.operator
    : null;

  const checkInTime = siteTime(session.check_in_at);
  const checkInDate = new Date(session.check_in_at)
    .toLocaleDateString("en-CA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: SITE_TZ,
    })
    .toUpperCase();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6 pt-2">
      <div className="flex h-14 items-center justify-between">
        <Link
          href="/wallet"
          className="flex items-center gap-1.5 text-[15px] font-medium text-[color:var(--text)]"
        >
          <span aria-hidden>←</span> Wallet
        </Link>
        <div className="text-[16px] font-bold">Session</div>
        <div className="w-5" />
      </div>

      {/* Same green panel as the wallet's ON SITE NOW banner, card-sized. */}
      <div
        style={{
          marginBottom: 14,
          borderRadius: 12,
          background: "rgba(47,200,106,0.07)",
          border: "1px solid rgba(47,200,106,0.25)",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              flex: "none",
              borderRadius: "50%",
              background: "#2fd072",
              boxShadow: "0 0 6px #2fd072",
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "#7ff0a8",
              fontWeight: 700,
            }}
          >
            CHECKED IN · {formatDuration(session.check_in_at)}
          </span>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.1em",
            color: "#5d666f",
            marginBottom: 6,
          }}
        >
          SITE
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: "#f4f6f7",
          }}
        >
          {site?.name}
        </div>
        <div style={{ marginTop: 2, fontSize: 15, color: "#9aa3ab" }}>
          {site?.rig_name && <>{site.rig_name} · </>}
          {operator?.name}
        </div>
        {project?.name && (
          <div
            style={{
              marginTop: 14,
              fontSize: 13,
              lineHeight: 1.4,
              color: "#9aa3ab",
            }}
          >
            {project.name}
          </div>
        )}

        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.1em",
                color: "#5d666f",
                marginBottom: 4,
              }}
            >
              CHECK-IN
            </div>
            <div
              className="mono"
              style={{ fontSize: 17, fontWeight: 700, color: "#f4f6f7" }}
            >
              {checkInTime}
            </div>
            <div
              className="mono"
              style={{ marginTop: 2, fontSize: 12, color: "#9aa3ab" }}
            >
              {checkInDate}
            </div>
          </div>
          {site?.lsd_location && (
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  color: "#5d666f",
                  marginBottom: 4,
                }}
              >
                LSD
              </div>
              <div
                className="mono"
                style={{ fontSize: 14, fontWeight: 600, color: "#f4f6f7" }}
              >
                {site.lsd_location}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <CheckoutButton action={checkOut.bind(null, session.id)} />
    </main>
  );
}
