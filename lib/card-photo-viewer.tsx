"use client";

import { useEffect, useState } from "react";

// A medic-facing thumbnail of the physical safety card. Tapping it opens a
// full-screen lightbox so the medic can read the real card (name, dates,
// stamps) at the gate — the whole point of "show me the card, don't just say
// VALID." Server component signs the URL; this only handles the view.
export function CardPhotoViewer({
  src,
  label,
}: {
  src: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  // Lock body scroll + allow Escape to close while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${label} card photo`}
        className="rw-pressable"
        style={{
          position: "relative",
          width: 46,
          height: 32,
          borderRadius: 6,
          overflow: "hidden",
          flex: "none",
          border: "1px solid rgba(255,255,255,0.18)",
          background: "#15191e",
          padding: 0,
          cursor: "pointer",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${label} card`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* magnifier hint */}
        <span
          style={{
            position: "absolute",
            right: 2,
            bottom: 2,
            width: 13,
            height: 13,
            borderRadius: 4,
            background: "rgba(13,15,18,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f2581c"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </span>
      </button>

      {/* lightbox */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(6,7,9,0.92)",
            backdropFilter: "blur(3px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
            gap: 14,
          }}
        >
          {/* label */}
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#c4ccd2",
              textAlign: "center",
            }}
          >
            {label} · CARD ON FILE
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`${label} card`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "94vw",
              maxHeight: "74vh",
              objectFit: "contain",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 24px 60px -16px rgba(0,0,0,0.8)",
            }}
          />

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mono rw-pressable"
            style={{
              height: 44,
              padding: "0 26px",
              borderRadius: 9,
              background: "#15191e",
              border: "1px solid rgba(255,255,255,0.16)",
              color: "#eef1f3",
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.08em",
              color: "#5d666f",
              textTransform: "uppercase",
            }}
          >
            Pinch to zoom · compare to the worker&apos;s physical card
          </div>
        </div>
      )}
    </>
  );
}
