// Shared design-system atoms. Mirror the prototype's components in CSS-var form.

export type StatusKind =
  | "valid"
  | "expiring"
  | "expired"
  | "ok"
  | "warn"
  | "bad"
  | "missing"
  | "info";

const STATUS_STYLE: Record<
  StatusKind,
  { bg: string; fg: string; dot: string; label: string }
> = {
  valid: {
    bg: "rgba(16,185,129,0.14)",
    fg: "#34D399",
    dot: "#10B981",
    label: "Valid",
  },
  ok: {
    bg: "rgba(16,185,129,0.14)",
    fg: "#34D399",
    dot: "#10B981",
    label: "OK",
  },
  expiring: {
    bg: "rgba(245,158,11,0.14)",
    fg: "#FBBF24",
    dot: "#F59E0B",
    label: "Expiring soon",
  },
  warn: {
    bg: "rgba(245,158,11,0.14)",
    fg: "#FBBF24",
    dot: "#F59E0B",
    label: "Warning",
  },
  expired: {
    bg: "rgba(239,68,68,0.14)",
    fg: "#F87171",
    dot: "#EF4444",
    label: "Expired",
  },
  bad: {
    bg: "rgba(239,68,68,0.14)",
    fg: "#F87171",
    dot: "#EF4444",
    label: "Failed",
  },
  missing: {
    bg: "rgba(239,68,68,0.14)",
    fg: "#F87171",
    dot: "#EF4444",
    label: "Missing",
  },
  info: {
    bg: "rgba(250,204,21,0.14)",
    fg: "#FACC15",
    dot: "#FACC15",
    label: "Info",
  },
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: StatusKind;
  label?: string;
  className?: string;
}) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${className ?? ""}`}
      style={{ background: s.bg, color: s.fg }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: s.dot, boxShadow: `0 0 0 3px ${s.bg}` }}
      />
      {label ?? s.label}
    </span>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-faint)] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function Avatar({
  initials,
  size = 44,
  tone = "dark",
  className,
}: {
  initials: string;
  size?: number;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center font-bold tracking-tight ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        background: tone === "dark" ? "#232830" : "#E4E4E0",
        color: tone === "dark" ? "#F4F5F7" : "#14171C",
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </div>
  );
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Brand mark — yellow safety chip with a derrick silhouette inside. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="RigWise"
      role="img"
      style={{ display: "block" }}
    >
      <rect width="32" height="32" rx={Math.max(4, size * 0.18)} fill="var(--hi-yellow)" />
      {/* Crown block (top of derrick) */}
      <rect x="13.6" y="3" width="4.8" height="2.2" fill="#0E1116" />
      {/* Derrick legs (tapered A-frame) */}
      <path
        d="M10.5 26 L14.7 5.6 L17.3 5.6 L21.5 26"
        stroke="#0E1116"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      {/* Cross beams */}
      <line x1="12.4" y1="22" x2="19.6" y2="22" stroke="#0E1116" strokeWidth="1.6" strokeLinecap="square" />
      <line x1="13.3" y1="17" x2="18.7" y2="17" stroke="#0E1116" strokeWidth="1.6" strokeLinecap="square" />
      <line x1="14.1" y1="12" x2="17.9" y2="12" stroke="#0E1116" strokeWidth="1.6" strokeLinecap="square" />
      {/* Ground line */}
      <line x1="7.5" y1="27.2" x2="24.5" y2="27.2" stroke="#0E1116" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

/** Wordmark — "Rig" + highlighted "Wise". Use when you want the brand
 *  as plain text. The brand convention is capital R and capital W. */
export function BrandWordmark({
  className,
  highlightClassName = "text-[color:var(--hi-yellow)]",
}: {
  className?: string;
  highlightClassName?: string;
}) {
  return (
    <span className={className}>
      Rig<span className={highlightClassName}>Wise</span>
    </span>
  );
}

// Legacy alias — kept so existing imports of SWMark keep compiling.
export const SWMark = BrandMark;
