// Shared design-system atoms.
// Dark, professional, Linear/Vercel/Stripe-grade. Restrained palette,
// hairline borders, considered motion. New code should prefer these
// over ad-hoc Tailwind soup.

import * as React from "react";

/* ============================================================
   STATUS PILL
   ============================================================ */

export type StatusKind =
  | "valid"
  | "expiring"
  | "expired"
  | "ok"
  | "warn"
  | "bad"
  | "missing"
  | "info"
  | "neutral";

const STATUS_STYLE: Record<
  StatusKind,
  { fg: string; bg: string; line: string; dot: string; label: string }
> = {
  valid:    { fg: "#4ADE80", bg: "rgba(34,197,94,0.10)",  line: "rgba(34,197,94,0.35)",  dot: "#22C55E", label: "Valid" },
  ok:       { fg: "#4ADE80", bg: "rgba(34,197,94,0.10)",  line: "rgba(34,197,94,0.35)",  dot: "#22C55E", label: "OK" },
  expiring: { fg: "#FBBF24", bg: "rgba(245,158,11,0.10)", line: "rgba(245,158,11,0.35)", dot: "#F59E0B", label: "Expiring soon" },
  warn:     { fg: "#FBBF24", bg: "rgba(245,158,11,0.10)", line: "rgba(245,158,11,0.35)", dot: "#F59E0B", label: "Warning" },
  expired:  { fg: "#F87171", bg: "rgba(239,68,68,0.10)",  line: "rgba(239,68,68,0.35)",  dot: "#EF4444", label: "Expired" },
  bad:      { fg: "#F87171", bg: "rgba(239,68,68,0.10)",  line: "rgba(239,68,68,0.35)",  dot: "#EF4444", label: "Failed" },
  missing:  { fg: "#F87171", bg: "rgba(239,68,68,0.10)",  line: "rgba(239,68,68,0.35)",  dot: "#EF4444", label: "Missing" },
  info:     { fg: "#93C5FD", bg: "rgba(59,130,246,0.10)", line: "rgba(59,130,246,0.35)", dot: "#3B82F6", label: "Info" },
  neutral:  { fg: "#A1A1AA", bg: "rgba(255,255,255,0.04)", line: "rgba(255,255,255,0.10)", dot: "#71717A", label: "—" },
};

export function StatusPill({
  status,
  label,
  className,
  size = "md",
}: {
  status: StatusKind;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const s = STATUS_STYLE[status];
  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.06em] ${px} ${className ?? ""}`}
      style={{ background: s.bg, color: s.fg, borderColor: s.line }}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: s.dot }}
      />
      {label ?? s.label}
    </span>
  );
}

/* ============================================================
   EYEBROW — small uppercase mono label
   ============================================================ */

export function Eyebrow({
  children,
  className,
  tone = "faint",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "faint" | "brand" | "dim";
}) {
  const color =
    tone === "brand"
      ? "text-[color:var(--brand)]"
      : tone === "dim"
        ? "text-[color:var(--text-dim)]"
        : "text-[color:var(--text-faint)]";
  return (
    <div
      className={`mono text-[11px] font-semibold uppercase tracking-[0.14em] ${color} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/* ============================================================
   AVATAR
   ============================================================ */

export function Avatar({
  initials,
  size = 40,
  tone = "dark",
  className,
}: {
  initials: string;
  size?: number;
  tone?: "dark" | "light" | "yellow";
  className?: string;
}) {
  const palette =
    tone === "yellow"
      ? { bg: "var(--brand)", fg: "var(--text-on-yellow)" }
      : tone === "light"
        ? { bg: "var(--surface-3)", fg: "var(--text)" }
        : { bg: "var(--surface-2)", fg: "var(--text)" };
  return (
    <div
      className={`flex shrink-0 items-center justify-center font-bold tracking-tight ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        background: palette.bg,
        color: palette.fg,
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

/* ============================================================
   BRAND
   ============================================================ */

/** The yellow safety chip with a derrick silhouette. */
export function BrandMark({
  size = 32,
  variant = "chip",
}: {
  size?: number;
  /** "chip" = yellow square; "ghost" = monochrome on dark bg. */
  variant?: "chip" | "ghost";
}) {
  const isChip = variant === "chip";
  const bg = isChip ? "var(--brand)" : "transparent";
  const stroke = isChip ? "#0A0A0A" : "var(--text)";
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
      <rect
        width="32"
        height="32"
        rx={Math.max(4, size * 0.18)}
        fill={bg}
        stroke={isChip ? "none" : "var(--line)"}
        strokeWidth={isChip ? 0 : 1}
      />
      {/* Crown block (top of derrick) */}
      <rect x="13.6" y="3" width="4.8" height="2.2" fill={stroke} />
      {/* Derrick legs (tapered A-frame) */}
      <path
        d="M10.5 26 L14.7 5.6 L17.3 5.6 L21.5 26"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      {/* Cross beams */}
      <line x1="12.4" y1="22" x2="19.6" y2="22" stroke={stroke} strokeWidth="1.6" strokeLinecap="square" />
      <line x1="13.3" y1="17" x2="18.7" y2="17" stroke={stroke} strokeWidth="1.6" strokeLinecap="square" />
      <line x1="14.1" y1="12" x2="17.9" y2="12" stroke={stroke} strokeWidth="1.6" strokeLinecap="square" />
      {/* Ground line */}
      <line x1="7.5" y1="27.2" x2="24.5" y2="27.2" stroke={stroke} strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

/** Plain-text wordmark: "Rig" + "Wise". "Wise" gets the brand color. */
export function BrandWordmark({
  className,
  highlightClassName = "text-[color:var(--brand)]",
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

// Legacy alias — kept so existing screens still compile.
export const SWMark = BrandMark;

/* ============================================================
   BUTTON
   ============================================================ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
};

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  iconLeft,
  iconRight,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    sm: "h-8 px-3 text-[12.5px] gap-1.5 rounded-[6px]",
    md: "h-10 px-4 text-[14px] gap-2 rounded-[7px]",
    lg: "h-12 px-5 text-[15px] gap-2 rounded-[8px]",
  };
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-[color:var(--brand)] text-[color:var(--text-on-yellow)] border border-[color:var(--brand-press)] hover:bg-[color:var(--brand-hover)]",
    secondary:
      "bg-[color:var(--surface-1)] text-[color:var(--text)] border border-[color:var(--line)] hover:bg-[color:var(--surface-2)] hover:border-[color:var(--line-strong)]",
    ghost:
      "bg-transparent text-[color:var(--text-dim)] border border-transparent hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text)]",
    danger:
      "bg-[color:var(--bad-bg)] text-[#FCA5A5] border border-[color:var(--bad-line)] hover:bg-[rgba(239,68,68,0.18)] hover:text-[#FECACA]",
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        "rw-pressable inline-flex select-none items-center justify-center font-semibold",
        "disabled:cursor-not-allowed disabled:opacity-60",
        sizes[size],
        variants[variant],
        fullWidth ? "w-full" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <Spinner size={size === "lg" ? 18 : size === "sm" ? 12 : 14} />
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="animate-spin"
      style={{ animationDuration: "700ms" }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* ============================================================
   CARD — flat surface with hairline border. Optional hover.
   ============================================================ */

export function Card({
  children,
  className,
  hoverable = false,
  padded = true,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padded?: boolean;
  as?: React.ElementType;
}) {
  return (
    <As
      className={[
        "rounded-[10px] border border-[color:var(--line)] bg-[color:var(--surface-1)]",
        padded ? "p-5" : "",
        hoverable
          ? "rw-hoverable hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-2)]"
          : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </As>
  );
}

/* ============================================================
   SECTION — eyebrow + optional title + content
   ============================================================ */

export function Section({
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className ?? ""}>
      {(eyebrow || title || action) && (
        <header className="mb-3 flex items-end justify-between gap-3">
          <div>
            {eyebrow && <Eyebrow tone="faint">{eyebrow}</Eyebrow>}
            {title && (
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.01em] text-[color:var(--text)]">
                {title}
              </h2>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/* ============================================================
   STAT — large mono number + small label
   ============================================================ */

export function Stat({
  value,
  label,
  tone = "neutral",
  className,
}: {
  value: React.ReactNode;
  label: string;
  tone?: "neutral" | "ok" | "warn" | "bad" | "brand";
  className?: string;
}) {
  const colors: Record<NonNullable<typeof tone>, string> = {
    neutral: "text-[color:var(--text)]",
    ok: "text-[color:#4ADE80]",
    warn: "text-[color:#FBBF24]",
    bad: "text-[color:#F87171]",
    brand: "text-[color:var(--brand)]",
  };
  return (
    <div className={className ?? ""}>
      <div
        className={`tabular text-[28px] font-bold leading-none tracking-[-0.02em] ${colors[tone]}`}
      >
        {value}
      </div>
      <div className="mt-1.5 mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-faint)]">
        {label}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE HEADER — back button + title + actions
   ============================================================ */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  back,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label?: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="rw-enter flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && <BackLink href={back.href} label={back.label} />}
        {eyebrow && (
          <Eyebrow tone="faint" className="mb-1.5">
            {eyebrow}
          </Eyebrow>
        )}
        <h1 className="truncate text-[26px] font-bold leading-tight tracking-[-0.015em] text-[color:var(--text)] sm:text-[28px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--text-dim)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[color:var(--text-dim)] transition-colors hover:text-[color:var(--text)]"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </a>
  );
}

/* ============================================================
   DIVIDER — hairline
   ============================================================ */

export function Divider({ className }: { className?: string }) {
  return (
    <hr
      className={`border-0 border-t border-[color:var(--line)] ${className ?? ""}`}
    />
  );
}

/* ============================================================
   KEY-VALUE ROW — used in dense, factual layouts
   ============================================================ */

export function KV({
  k,
  v,
  mono = false,
  className,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-[color:var(--line)] py-2.5 last:border-b-0 ${className ?? ""}`}
    >
      <span className="text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-faint)]">
        {k}
      </span>
      <span
        className={`min-w-0 truncate text-right text-[13.5px] text-[color:var(--text)] ${mono ? "mono" : ""}`}
      >
        {v}
      </span>
    </div>
  );
}
