"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/lib/auth-actions";

// Avatar dropdown for the top nav: tap the profile picture → panel with
// profile, help, and sign out. The avatar node (photo <img> or generated SVG)
// is rendered server-side and passed in as children.
export function NavMenu({
  name,
  roleLabel,
  profileHref,
  children,
}: {
  name: string;
  roleLabel: string;
  profileHref: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const itemCls =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[color:var(--text-dim)] transition-colors hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text)]";

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rw-pressable"
        style={{
          display: "block",
          padding: 0,
          border: open
            ? "2px solid #f2581c"
            : "2px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          background: "none",
          cursor: "pointer",
          lineHeight: 0,
        }}
      >
        {children}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 220,
            zIndex: 60,
            borderRadius: 12,
            background: "#15191e",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 18px 40px -12px rgba(0,0,0,0.7)",
            padding: 8,
          }}
        >
          <div style={{ padding: "8px 12px 10px" }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#f4f6f7",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "#5d666f",
                marginTop: 3,
                textTransform: "uppercase",
              }}
            >
              {roleLabel}
            </div>
          </div>
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.08)",
              margin: "0 4px 6px",
            }}
          />
          <Link href={profileHref} className={itemCls} onClick={() => setOpen(false)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
            </svg>
            My profile
          </Link>
          <Link href="/help" className={itemCls} onClick={() => setOpen(false)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.4-3 4" />
              <path d="M12 17.5h.01" />
            </svg>
            Help
          </Link>
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.08)",
              margin: "6px 4px",
            }}
          />
          <form action={signOutAction}>
            <button type="submit" className={itemCls} style={{ color: "#ff9a8f" }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
