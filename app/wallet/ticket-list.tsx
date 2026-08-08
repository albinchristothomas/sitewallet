"use client";

import Link from "next/link";
import { useState } from "react";

// The wallet's ticket list — ONE card design for every ticket. When the
// worker photographed the card, the picture sits in a fixed-height window
// inside the same card (cover-cropped, so every card is the same shape —
// no letterboxing). No photo? Same card, no window. Every card carries the
// orange spine; typography is identical across all of them.

export type TicketRow = {
  id: string;
  label: string;
  subText: string;
  subColor: string;
  titleColor: string;
  dim: boolean;
  pill: { bg: string; line: string; dot: string; fg: string; text: string };
  verified: boolean;
  photoUrl: string | null;
};

export function TicketList({ rows }: { rows: TicketRow[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows;

  return (
    <>
      <div
        className="mono"
        style={{ fontSize: 9, letterSpacing: "0.16em", color: "#5d666f" }}
      >
        YOUR TICKETS
      </div>

      {/* Search — worth the space once the wallet has a few tickets. */}
      {rows.length > 3 && (
        <div style={{ position: "relative" }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5d666f"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: 13,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your tickets"
            aria-label="Search your tickets"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 9,
              background: "#15191e",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "0 38px 0 38px",
              fontSize: 14,
              color: "#d6dce0",
              outline: "none",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 30,
                height: 30,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9aa3ab"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <div
          className="mono"
          style={{
            padding: "18px 4px",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "#5d666f",
            textAlign: "center",
          }}
        >
          NO TICKET MATCHES &ldquo;{query.trim().toUpperCase()}&rdquo;
        </div>
      ) : (
        shown.map((r) => <TicketCard key={r.id} r={r} />)
      )}
    </>
  );
}

function TicketCard({ r }: { r: TicketRow }) {
  // If the photo can't load (expired signed URL, evicted cache), the card
  // simply renders without its photo window — never a broken image.
  const [failed, setFailed] = useState(false);
  const showPhoto = !!r.photoUrl && !failed;

  return (
    <Link
      href={`/wallet/credentials/${r.id}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        background:
          "linear-gradient(152deg,#222831 0%,#191d23 60%,#14171c 100%)",
        boxShadow:
          "0 10px 24px -16px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.07)",
      }}
    >
      {showPhoto && (
        <div
          style={{
            height: 172,
            background: "#0b0d10",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.photoUrl ?? ""}
            alt={r.label}
            onError={() => setFailed(true)}
            // A server-rendered image can fail BEFORE hydration attaches
            // onError; the ref runs at mount and catches that state.
            ref={(el) => {
              if (el && el.complete && el.naturalWidth === 0) setFailed(true);
            }}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: r.dim ? "grayscale(0.5) brightness(0.75)" : undefined,
            }}
          />
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 15px 14px 18px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: "-0.01em",
              color: r.titleColor,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {r.label}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 9.5,
              color: r.subColor,
              marginTop: 4,
              letterSpacing: "0.04em",
            }}
          >
            {r.subText}
          </div>
          {!r.verified && (
            <div
              className="mono"
              style={{
                marginTop: 5,
                fontSize: 8.5,
                letterSpacing: "0.1em",
                color: "#ffb27a",
              }}
            >
              ● SELF-ENTERED · UNVERIFIED
            </div>
          )}
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flex: "none",
            padding: "5px 9px",
            borderRadius: 5,
            background: r.pill.bg,
            border: `1px solid ${r.pill.line}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: r.pill.dot,
              boxShadow: `0 0 6px ${r.pill.dot}`,
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: r.pill.fg,
            }}
          >
            {r.pill.text}
          </span>
        </div>
      </div>

      {/* the orange spine — on every card, photo or not, full height */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: "#f2581c",
        }}
      />
    </Link>
  );
}
