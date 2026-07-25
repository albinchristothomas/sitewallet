import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandMark, BrandWordmark, getInitials } from "@/lib/atoms";
import { faceUrl } from "@/lib/photos";
import { GeneratedAvatar } from "@/lib/avatar-gen";
import { NavMenu } from "@/lib/nav-menu";
import { type AccountType } from "@/lib/roles";

// Top nav: brand on the left; professional SVG icon links + the avatar menu on
// the right. The avatar shows the person's photo when they have one, otherwise
// a generated geometric mark with their initials. Sign out lives inside the
// avatar menu. No text-link clutter, no emoji — ever.
export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: worker } = await supabase
    .from("workers")
    .select("account_type, full_name, photo_url")
    .eq("id", user.id)
    .single();

  const type: AccountType = (worker?.account_type ?? "WORKER") as AccountType;
  const name = worker?.full_name ?? "Account";
  const photo = await faceUrl(worker?.photo_url);

  const iconLinkCls =
    "rw-pressable flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--text-dim)] transition-colors hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text)]";

  const avatar = photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={name}
      width={32}
      height={32}
      style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 8, display: "block" }}
    />
  ) : (
    <GeneratedAvatar seed={user.id} initials={getInitials(name)} size={32} />
  );

  return (
    <nav className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[color:var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
        <Link
          href="/"
          className="rw-pressable flex items-center gap-2.5 rounded-md py-1"
        >
          <BrandMark size={22} />
          <BrandWordmark className="text-[14px] font-bold tracking-[-0.01em]" />
        </Link>

        <div className="flex items-center gap-1.5">
          {type === "WORKER" && (
            <Link href="/wallet" aria-label="Wallet" title="Wallet" className={iconLinkCls}>
              {/* wallet */}
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 7H5a2 2 0 0 1 0-4h13v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1" />
                <path d="M16 13.5h.01" />
              </svg>
            </Link>
          )}
          {type === "MEDIC" && (
            <>
              <Link href="/medic" aria-label="Gate station" title="Gate station" className={iconLinkCls}>
                {/* shield-check: the gate */}
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l8 3.5v5.2c0 5-3.4 9.2-8 11.3-4.6-2.1-8-6.3-8-11.3V5.5L12 2z" />
                  <path d="M8.8 12l2.2 2.2 4.2-4.4" />
                </svg>
              </Link>
              <Link href="/admin" aria-label="Site setup" title="Site setup" className={iconLinkCls}>
                {/* sliders: setup */}
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2" />
                  <circle cx="16" cy="6" r="2" />
                  <circle cx="8" cy="12" r="2" />
                  <circle cx="16" cy="18" r="2" />
                </svg>
              </Link>
            </>
          )}

          <div className="ml-1">
            <NavMenu
              name={name}
              roleLabel={type === "MEDIC" ? "Medic · Gate station" : "Worker · Wallet"}
              profileHref={type === "MEDIC" ? "/medic/profile" : "/wallet/profile"}
            >
              {avatar}
            </NavMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
