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
  valid:    { fg: "#7ff0a8", bg: "rgba(47,200,106,0.12)", line: "rgba(47,200,106,0.5)",  dot: "#2fd072", label: "Valid" },
  ok:       { fg: "#7ff0a8", bg: "rgba(47,200,106,0.12)", line: "rgba(47,200,106,0.5)",  dot: "#2fd072", label: "OK" },
  expiring: { fg: "#ffd27a", bg: "rgba(242,164,12,0.14)", line: "rgba(242,164,12,0.55)", dot: "#f2a40c", label: "Expiring" },
  warn:     { fg: "#ffd27a", bg: "rgba(242,164,12,0.14)", line: "rgba(242,164,12,0.55)", dot: "#f2a40c", label: "Warning" },
  expired:  { fg: "#ff9a8f", bg: "rgba(239,65,53,0.14)",  line: "rgba(239,65,53,0.55)",  dot: "#ef4135", label: "Expired" },
  bad:      { fg: "#ff9a8f", bg: "rgba(239,65,53,0.14)",  line: "rgba(239,65,53,0.55)",  dot: "#ef4135", label: "Failed" },
  missing:  { fg: "#ff9a8f", bg: "rgba(239,65,53,0.14)",  line: "rgba(239,65,53,0.55)",  dot: "#ef4135", label: "Missing" },
  info:     { fg: "#a9defc", bg: "rgba(110,200,255,0.12)", line: "rgba(110,200,255,0.4)", dot: "#6ec8ff", label: "Info" },
  neutral:  { fg: "#9aa3ab", bg: "rgba(255,255,255,0.04)", line: "rgba(255,255,255,0.10)", dot: "#5d666f", label: "—" },
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
        style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}` }}
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
  photoUrl,
  className,
}: {
  initials: string;
  size?: number;
  tone?: "dark" | "light" | "yellow";
  /** When set, the face photo is shown instead of initials. */
  photoUrl?: string | null;
  className?: string;
}) {
  const palette =
    tone === "yellow"
      ? { bg: "var(--brand)", fg: "var(--text-on-yellow)" }
      : tone === "light"
        ? { bg: "var(--surface-3)", fg: "var(--text)" }
        : { bg: "var(--surface-2)", fg: "var(--text)" };

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={initials}
        className={`shrink-0 object-cover ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
          background: palette.bg,
        }}
      />
    );
  }

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

/** The brand mark — a safety-orange rounded square with a dark inner square,
 *  exactly as in the approved design system. */
export function BrandMark({ size = 28 }: { size?: number; variant?: "chip" | "ghost" }) {
  return (
    <div
      aria-label="RigWise"
      role="img"
      style={{
        width: size,
        height: size,
        background: "var(--brand)",
        borderRadius: Math.max(3, size * 0.16),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.12) inset",
        flex: "none",
      }}
    >
      <div
        style={{
          width: size * 0.36,
          height: size * 0.36,
          background: "var(--on-brand)",
        }}
      />
    </div>
  );
}

/** Wordmark: "RIG" in text color + "WISE" muted, matching the design system. */
export function BrandWordmark({
  className,
  highlightClassName = "text-[color:var(--wordmark-muted)] font-semibold",
}: {
  className?: string;
  highlightClassName?: string;
}) {
  return (
    <span className={className} style={{ fontWeight: 800, letterSpacing: "-0.01em" }}>
      RIG<span className={highlightClassName}>WISE</span>
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
      "bg-[color:var(--brand)] text-[color:var(--on-brand)] border border-[color:var(--brand-press)] shadow-[var(--shadow-brand)] hover:bg-[color:var(--brand-hover)]",
    secondary:
      "bg-[color:var(--surface-2)] text-[color:var(--text)] border border-[color:var(--line-strong)] hover:bg-[color:var(--surface-hover)]",
    ghost:
      "bg-transparent text-[color:var(--text-dim)] border border-transparent hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]",
    danger:
      "bg-[color:var(--bad)] text-[#2a0d0a] border border-[color:var(--bad-line)] hover:brightness-110",
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
