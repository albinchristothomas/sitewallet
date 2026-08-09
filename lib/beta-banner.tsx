import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/brand";

// Quiet footer. No "PILOT" or "BETA" framing.
export function BetaBanner() {
  return (
    <footer className="border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-3 text-center text-[11px] text-[color:var(--text-faint)]">
      <Link
        href="/help"
        className="transition-colors hover:text-[color:var(--text-dim)]"
      >
        Help
      </Link>
      <span className="mx-2 text-[color:var(--text-mute)]">·</span>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="transition-colors hover:text-[color:var(--text-dim)]"
      >
        Contact
      </a>
      <span className="mx-2 text-[color:var(--text-mute)]">·</span>
      <span>© RigVise</span>
    </footer>
  );
}
