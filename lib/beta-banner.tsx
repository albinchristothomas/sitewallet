import Link from "next/link";

export function BetaBanner() {
  return (
    <footer className="sticky bottom-0 z-10 border-t border-[color:var(--hair)] bg-[color:var(--ink-1)]/90 px-4 py-2 text-center text-[11px] text-[color:var(--text-dim)] backdrop-blur">
      <span className="font-semibold uppercase tracking-[0.08em] text-[color:var(--hi-yellow)]">
        Pilot
      </span>
      <span className="mx-2 text-[color:var(--text-faint)]">·</span>
      <span>We&apos;re improving SiteWallet — tell us what works</span>
      <span className="mx-2 text-[color:var(--text-faint)]">·</span>
      <Link href="/help" className="font-medium hover:text-[color:var(--text)]">
        Help
      </Link>
      <span className="mx-2 text-[color:var(--text-faint)]">·</span>
      <a
        href="mailto:feedback@sitewallet.ca?subject=SiteWallet%20pilot%20feedback"
        className="font-medium hover:text-[color:var(--text)]"
      >
        Report issue
      </a>
    </footer>
  );
}
