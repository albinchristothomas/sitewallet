import Link from "next/link";

export function BetaBanner() {
  return (
    <footer className="sticky bottom-0 border-t border-amber-300/30 bg-amber-50/90 px-4 py-2 text-center text-xs text-amber-900 backdrop-blur dark:border-amber-900/40 dark:bg-amber-950/70 dark:text-amber-200">
      <span className="font-semibold uppercase tracking-wide">Pilot</span>
      <span className="mx-2">·</span>
      <span>Phase 1 — not for production safety decisions.</span>
      <span className="mx-2">·</span>
      <Link
        href="/help"
        className="font-medium underline-offset-2 hover:underline"
      >
        Help
      </Link>
      <span className="mx-2">·</span>
      <a
        href="mailto:feedback@sitewallet.ca?subject=SiteWallet%20pilot%20feedback"
        className="font-medium underline-offset-2 hover:underline"
      >
        Report issue
      </a>
    </footer>
  );
}
