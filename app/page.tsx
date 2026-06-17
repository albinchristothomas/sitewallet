import Link from "next/link";
import { redirect } from "next/navigation";
import { HardHat, Stethoscope, ArrowRight, ShieldCheck, QrCode, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BrandMark, BrandWordmark, Eyebrow } from "@/lib/atoms";
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
    title: string;
    sub: string;
  }> = [
    {
      key: "worker",
      icon: <HardHat size={22} strokeWidth={1.6} />,
      title: "I'm a worker",
      sub: "Carry my tickets",
    },
    {
      key: "medic",
      icon: <Stethoscope size={22} strokeWidth={1.6} />,
      title: "I'm a medic",
      sub: "Scan at the gate",
    },
  ];

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-10">
      <GridBackdrop />

      <div className="rw-enter relative w-full max-w-[420px]">
        {/* Brand block */}
        <div className="flex flex-col items-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[40px] font-bold leading-none tracking-[-0.025em]">
            <BrandWordmark />
          </h1>
          <Eyebrow className="mt-3.5">
            Safety credentials · verified at the gate
          </Eyebrow>
        </div>

        {/* Flow strip — Worker → Scanner → Admitted */}
        <FlowStrip />

        {/* Two CTAs */}
        <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {intents.map(({ key, icon, title, sub }) => (
            <Link
              key={key}
              href={`/login?as=${key}`}
              className="group rw-hoverable relative flex items-center gap-3.5 rounded-[10px] border border-[color:var(--line)] bg-[color:var(--surface-1)] p-4 hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-2)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] border border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--text-dim)] transition-colors group-hover:border-[color:var(--brand)] group-hover:bg-[color:var(--brand)] group-hover:text-[color:var(--text-on-yellow)]">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold leading-tight text-[color:var(--text)]">
                  {title}
                </div>
                <div className="mt-1 text-[12px] leading-snug text-[color:var(--text-faint)]">
                  {sub}
                </div>
              </div>
              <ArrowRight
                size={15}
                strokeWidth={1.8}
                className="shrink-0 text-[color:var(--text-faint)] transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[color:var(--text)]"
              />
            </Link>
          ))}
        </div>

        {/* Sign in link */}
        <p className="mt-7 text-center text-[12px] text-[color:var(--text-faint)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[color:var(--text-dim)] underline-offset-4 transition-colors hover:text-[color:var(--text)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Bottom corner pill — trust signal */}
      <div className="relative mt-12 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface-1)] px-3 py-1.5 mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--text-faint)]">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--ok)]" />
        Built for Canadian energy worksites
      </div>
    </main>
  );
}

/* ============================================================
   Backdrop: subtle engineered grid, masked to a radial fade.
   No gradients, no blobs — just hairlines.
   ============================================================ */
function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          "linear-gradient(var(--text) 1px, transparent 1px), linear-gradient(90deg, var(--text) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        maskImage:
          "radial-gradient(ellipse at center, black 35%, transparent 75%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 35%, transparent 75%)",
      }}
    />
  );
}

/* ============================================================
   FlowStrip — Worker → Scanner → Admitted in a single rail.
   Compact, hairline, no decoration beyond the icons themselves.
   ============================================================ */
function FlowStrip() {
  return (
    <div className="mt-9 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1.5">
      <FlowCell icon={<QrCode size={20} strokeWidth={1.6} />} label="Worker" sub="QR ID" />
      <FlowDash />
      <FlowCell icon={<ScanLine size={20} strokeWidth={1.6} />} label="Medic" sub="Scans" accent />
      <FlowDash />
      <FlowCell icon={<ShieldCheck size={20} strokeWidth={1.6} />} label="Gate" sub="Admit" />
    </div>
  );
}

function FlowCell({
  icon,
  label,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-[8px] border bg-[color:var(--surface-1)] px-2 py-3 ${
        accent
          ? "border-[color:var(--brand)]"
          : "border-[color:var(--line)]"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-[6px] ${
          accent
            ? "bg-[color:var(--brand)] text-[color:var(--text-on-yellow)]"
            : "bg-[color:var(--surface-2)] text-[color:var(--text-dim)]"
        }`}
      >
        {icon}
      </div>
      <div className="text-center">
        <div className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[color:var(--text)]">
          {label}
        </div>
        <div className="mono mt-0.5 text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--text-faint)]">
          {sub}
        </div>
      </div>
    </div>
  );
}

function FlowDash() {
  return (
    <svg
      width="20"
      height="40"
      viewBox="0 0 20 40"
      fill="none"
      aria-hidden
      className="self-center"
    >
      <line
        x1="2"
        y1="20"
        x2="18"
        y2="20"
        stroke="var(--line-strong)"
        strokeWidth="1.2"
        strokeDasharray="2 3"
      />
    </svg>
  );
}
