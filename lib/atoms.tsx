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

export function SWMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center font-extrabold tracking-tight"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: "var(--hi-yellow)",
        color: "#0E1116",
        fontSize: size * 0.45,
      }}
    >
      SW
    </div>
  );
}
