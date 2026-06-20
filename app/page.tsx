import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForType, type SignupIntent, type AccountType } from "@/lib/roles";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: w } = await supabase
      .from("workers")
      .select("account_type")
      .eq("id", user.id)
      .single();
    const type = (w?.account_type ?? "WORKER") as AccountType;
    redirect(homeForType(type));
  }

  // Arrow glyph reused on both role cards (safety-orange CTA chevron).
  const arrow = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#f2581c"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );

  const roles: Array<{
    key: SignupIntent;
    spine: string;
    icon: React.ReactNode;
    title: string;
    sub: string;
  }> = [
    {
      key: "worker",
      spine: "#f2581c",
      icon: (
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9aa3ab"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      ),
      title: "I'm a worker",
      sub: "Carry your tickets. Show one QR pass at the gate.",
    },
    {
      key: "medic",
      spine: "#2fd072",
      icon: (
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9aa3ab"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 12l2 2 4-4" />
          <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" />
        </svg>
      ),
      title: "I'm a medic",
      sub: "Run the gate. Admit, deny, file the day.",
    },
  ];

  return (
    <main className="relative flex flex-1 flex-col px-6 py-10 sm:px-12 sm:py-14">
      {/* Guilloché security overlay — matches the approved landing block. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.4,
          backgroundImage:
            "repeating-radial-gradient(circle at 78% 30%, transparent 0 9px, rgba(255,255,255,0.04) 9px 10px),conic-gradient(from 40deg at 72% 45%, rgba(255,255,255,0.04), transparent 35%, rgba(255,255,255,0.03) 65%, transparent 95%)",
        }}
      />

      {/* Giant ghost wordmark */}
      <div
        aria-hidden
        className="pointer-events-none absolute select-none text-[120px] leading-[0.8] sm:text-[230px]"
        style={{
          right: -30,
          bottom: -40,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          color: "rgba(255,255,255,0.03)",
        }}
      >
        RW
      </div>

      <div className="rw-enter relative mx-auto flex w-full max-w-[1000px] flex-1 flex-col">
        {/* top brand */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-[13px]">
            <div
              className="flex items-center justify-center"
              style={{
                width: 30,
                height: 30,
                background: "#f2581c",
                borderRadius: 4,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.12) inset",
              }}
            >
              <div style={{ width: 11, height: 11, background: "#0d0f12" }} />
            </div>
            <div style={{ lineHeight: 1 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 21,
                  letterSpacing: "-0.01em",
                  color: "#eef1f3",
                }}
              >
                RIG
                <span style={{ color: "#8b949c", fontWeight: 600 }}>WISE</span>
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: "#5d666f",
                  marginTop: 3,
                }}
              >
                GATE STATION
              </div>
            </div>
          </div>
          <div
            className="mono text-right"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "#9aa3ab" }}
          >
            EST · ALBERTA · BC · SK
          </div>
        </div>

        {/* value prop */}
        <div className="mt-12 max-w-[560px] sm:mt-auto">
          <div
            className="mono text-[10px] sm:text-[11px]"
            style={{ letterSpacing: "0.2em", color: "#f2581c" }}
          >
            SAFETY CREDENTIALS · VERIFIED AT THE GATE
          </div>
          <div
            className="mt-4 text-[34px] sm:mt-[18px] sm:text-[56px]"
            style={{
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              color: "#f4f6f7",
              textWrap: "balance",
            }}
          >
            Every ticket, every worker, checked before the boot hits the lease.
          </div>
        </div>

        {/* role choices — stacked on mobile, side-by-side on desktop */}
        <div className="mt-9 flex flex-col gap-[18px] sm:mt-[42px] sm:flex-row">
          {roles.map(({ key, spine, icon, title, sub }) => (
            <Link
              key={key}
              href={`/login?as=${key}`}
              className="rw-pressable relative flex-1 overflow-hidden"
              style={{
                borderRadius: 12,
                background:
                  "linear-gradient(152deg,#222831 0%,#191d23 52%,#14171c 100%)",
                boxShadow:
                  "0 20px 40px -22px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.07)",
                padding: "24px 26px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  background: spine,
                }}
              />
              <div className="flex items-center justify-between">
                {icon}
                {arrow}
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 23,
                  letterSpacing: "-0.01em",
                  color: "#eef1f3",
                  marginTop: 16,
                }}
              >
                {title}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "#9aa3ab",
                  marginTop: 6,
                  letterSpacing: "0.04em",
                  lineHeight: 1.5,
                }}
              >
                {sub}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
