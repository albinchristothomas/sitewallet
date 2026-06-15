import Link from "next/link";
import { redirect } from "next/navigation";
import { HardHat, Stethoscope, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandMark, BrandWordmark } from "@/lib/atoms";
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

  const intents: Array<{
    key: SignupIntent;
    icon: React.ReactNode;
    label: string;
    sub: string;
  }> = [
    {
      key: "worker",
      icon: <HardHat size={26} strokeWidth={1.75} />,
      label: "I'm a worker",
      sub: "Carry my tickets",
    },
    {
      key: "medic",
      icon: <Stethoscope size={26} strokeWidth={1.75} />,
      label: "I'm a medic",
      sub: "Scan at the gate",
    },
  ];

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14">
      {/* Engineered grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center">
          <BrandMark size={64} />
          <h1 className="mt-5 text-[40px] font-extrabold leading-none tracking-tight">
            <BrandWordmark />
          </h1>
          <p className="mt-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-faint)]">
            Safety credentials · verified at the gate
          </p>
        </div>

        {/* Visual flow: phone QR → scanner → checkmark */}
        <FlowDiagram />

        {/* Two strong CTAs */}
        <div className="mt-7 grid grid-cols-2 gap-2.5">
          {intents.map(({ key, icon, label, sub }) => (
            <Link
              key={key}
              href={`/login?as=${key}`}
              className="group relative flex flex-col items-start gap-3 rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-5 transition hover:border-[color:var(--hi-yellow)] hover:bg-[color:var(--ink-3)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color:var(--ink-3)] text-[color:var(--hi-yellow)] transition group-hover:bg-[color:var(--hi-yellow)] group-hover:text-[color:var(--ink-1)]">
                {icon}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-bold leading-tight">
                  {label}
                </div>
                <div className="mt-1 text-[12px] leading-snug text-[color:var(--text-dim)]">
                  {sub}
                </div>
              </div>
              <ArrowRight
                size={16}
                className="absolute right-3 top-3 text-[color:var(--text-faint)] transition group-hover:text-[color:var(--hi-yellow)]"
              />
            </Link>
          ))}
        </div>

        <p className="mt-7 text-center text-[12px] text-[color:var(--text-faint)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[color:var(--text-dim)] underline-offset-2 hover:text-[color:var(--text)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

/** Worker → Scanner → Admitted. Communicates the product in one glance. */
function FlowDiagram() {
  return (
    <div className="mt-9 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
      <FlowNode label="Worker" sub="QR code">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          {/* Phone outline */}
          <rect x="12" y="6" width="16" height="28" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
          {/* QR squares inside */}
          <rect x="15" y="11" width="3" height="3" fill="currentColor" />
          <rect x="22" y="11" width="3" height="3" fill="currentColor" />
          <rect x="15" y="18" width="3" height="3" fill="currentColor" />
          <rect x="20" y="18" width="2" height="2" fill="currentColor" />
          <rect x="23.5" y="18" width="1.5" height="3" fill="currentColor" />
          <rect x="15" y="22.5" width="2" height="2" fill="currentColor" />
          <rect x="19" y="22.5" width="3" height="2" fill="currentColor" />
          <rect x="23" y="22.5" width="2" height="2" fill="currentColor" />
          <rect x="15" y="26" width="3" height="3" fill="currentColor" />
        </svg>
      </FlowNode>
      <FlowArrow />
      <FlowNode label="Medic" sub="Scans QR" accent>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          {/* Camera viewfinder corners */}
          <path d="M8 14 L8 10 L12 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
          <path d="M28 10 L32 10 L32 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
          <path d="M8 26 L8 30 L12 30" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
          <path d="M28 30 L32 30 L32 26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
          {/* Reticle */}
          <line x1="20" y1="13" x2="20" y2="27" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
          <line x1="13" y1="20" x2="27" y2="20" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
          <circle cx="20" cy="20" r="3" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </FlowNode>
      <FlowArrow />
      <FlowNode label="Gate" sub="Admit · deny">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          {/* Shield silhouette */}
          <path
            d="M20 6 L31 10 L31 20 C31 27 26 31.5 20 34 C14 31.5 9 27 9 20 L9 10 Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="miter"
            fill="none"
          />
          {/* Inner checkmark */}
          <path
            d="M15 20.5 L18.5 24 L25 16.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
            fill="none"
          />
        </svg>
      </FlowNode>
    </div>
  );
}

function FlowNode({
  children,
  label,
  sub,
  accent = false,
}: {
  children: React.ReactNode;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-xl border ${
          accent
            ? "border-[color:var(--hi-yellow)] bg-[color:var(--ink-2)] text-[color:var(--hi-yellow)]"
            : "border-[color:var(--hair)] bg-[color:var(--ink-2)] text-[color:var(--text-dim)]"
        }`}
      >
        {children}
      </div>
      <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--text)]">
        {label}
      </div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--text-faint)]">
        {sub}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <svg width="22" height="12" viewBox="0 0 22 12" fill="none" aria-hidden>
      <line
        x1="2"
        y1="6"
        x2="18"
        y2="6"
        stroke="var(--text-faint)"
        strokeWidth="1.4"
        strokeDasharray="2 2"
      />
      <path
        d="M14 2 L20 6 L14 10"
        stroke="var(--text-faint)"
        strokeWidth="1.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
}
