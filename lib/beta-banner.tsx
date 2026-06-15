import Link from "next/link";

// A quiet footer. No "PILOT" or "BETA" framing — testers reported the
// previous version made the app feel unfinished and scammy.
export function BetaBanner() {
  return (
    <footer className="border-t border-[color:var(--hair)] bg-[color:var(--ink-1)] px-4 py-3 text-center text-[11px] text-[color:var(--text-faint)]">
      <Link href="/help" className="hover:text-[color:var(--text-dim)]">
        Help
      </Link>
      <span className="mx-2 text-[color:var(--text-faint)]/40">·</span>
      <a
        href="mailto:hello@rigwise.ca"
        className="hover:text-[color:var(--text-dim)]"
      >
        Contact
      </a>
      <span className="mx-2 text-[color:var(--text-faint)]/40">·</span>
      <span>© RigWise</span>
    </footer>
  );
}
