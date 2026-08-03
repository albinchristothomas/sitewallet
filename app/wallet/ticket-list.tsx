"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// The wallet's ticket list, in two views the worker can flip between:
//   CARDS  — the designed rows (type, status, expiry)
//   PHOTOS — the actual picture they took of each card, right in the list.
// Workers asked for the photo up front ("I want to see MY card"), so the
// choice is remembered on the device — pick PHOTOS once and the wallet
// always opens straight to the pictures.

export type TicketRow = {
  id: string;
  label: string;
  subText: string;
  subColor: string;
  spine: string;
  titleColor: string;
  dim: boolean;
  pill: { bg: string; line: string; dot: string; fg: string; text: string };
  verified: boolean;
  photoUrl: string | null;
};

const VIEW_KEY = "rv-wallet-view";

export function TicketList({ rows }: { rows: TicketRow[] }) {
  // PHOTOS is the default — workers want their own card pictures up front.
  // CARDS is the opt-in view, and either choice sticks on the device.
  const [view, setView] = useState<"cards" | "photos">("photos");
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Guarded like the write below: with "Block all cookies" even touching
    // window.localStorage throws, and an effect throw blanks the whole list.
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === "cards") setView("cards");
    } catch {
      // storage blocked — stay on the PHOTOS default
    }
  }, []);

  function pick(v: "cards" | "photos") {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      // private mode — the toggle still works for this visit
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          className="mono"
          style={{ fontSize: 9, letterSpacing: "0.16em", color: "#5d666f" }}
        >
          YOUR TICKETS
        </div>
        <div
          style={{
            display: "inline-flex",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 7,
            overflow: "hidden",
          }}
        >
          {(["cards", "photos"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => pick(v)}
              className="mono"
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                padding: "6px 11px",
                border: "none",
                cursor: "pointer",
                color: view === v ? "#f2581c" : "#9aa3ab",
                background:
                  view === v ? "rgba(242,88,28,0.13)" : "transparent",
              }}
            >
              {v === "cards" ? "CARDS" : "PHOTOS"}
            </button>
          ))}
        </div>
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

      {(() => {
        const q = query.trim().toLowerCase();
        const shown = q
          ? rows.filter((r) => r.label.toLowerCase().includes(q))
          : rows;
        if (shown.length === 0) {
          return (
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
          );
        }
        return shown.map((r) =>
          view === "photos" && r.photoUrl ? (
            <PhotoTile key={r.id} r={r} />
          ) : (
            <CardRow key={r.id} r={r} />
          ),
        );
      })()}
    </>
  );
}

function CardRow({ r }: { r: TicketRow }) {
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
        background: r.dim
          ? "linear-gradient(152deg,#1c2026 0%,#16191e 60%,#121418 100%)"
          : "linear-gradient(152deg,#222831 0%,#191d23 60%,#14171c 100%)",
        filter: r.dim ? "grayscale(0.4) brightness(0.9)" : undefined,
        boxShadow: r.dim
          ? "0 10px 24px -16px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.05)"
          : "0 10px 24px -16px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.07)",
        padding: "14px 15px 14px 18px",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: r.spine,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
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
        <Pill pill={r.pill} />
      </div>
    </Link>
  );
}

function PhotoTile({ r }: { r: TicketRow }) {
  // Signed photo URLs expire after an hour — if the browser can't load the
  // image (stale tab, evicted cache), show the card row instead of a broken
  // picture.
  const [failed, setFailed] = useState(false);
  if (failed) return <CardRow r={r} />;
  return (
    <Link
      href={`/wallet/credentials/${r.id}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        borderRadius: 12,
        overflow: "hidden",
        background: "#15191e",
        boxShadow: r.dim
          ? "0 10px 24px -16px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.05)"
          : "0 10px 24px -16px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.07)",
      }}
    >
      {/* the worker's own shot of the card — contain, never crop the text */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={r.photoUrl ?? ""}
        alt={r.label}
        onError={() => setFailed(true)}
        // A server-rendered image can fail BEFORE hydration attaches onError;
        // the ref runs at mount and catches that already-failed state.
        ref={(el) => {
          if (el && el.complete && el.naturalWidth === 0) setFailed(true);
        }}
        style={{
          display: "block",
          width: "100%",
          maxHeight: 250,
          objectFit: "contain",
          background: "#0b0d10",
          filter: r.dim ? "grayscale(0.4) brightness(0.85)" : undefined,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 13px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
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
              fontSize: 9,
              color: r.subColor,
              marginTop: 3,
              letterSpacing: "0.04em",
            }}
          >
            {r.subText}
            {!r.verified && (
              <span style={{ color: "#ffb27a" }}> · UNVERIFIED</span>
            )}
          </div>
        </div>
        <Pill pill={r.pill} />
      </div>
    </Link>
  );
}

function Pill({ pill }: { pill: TicketRow["pill"] }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        flex: "none",
        padding: "5px 9px",
        borderRadius: 5,
        background: pill.bg,
        border: `1px solid ${pill.line}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: pill.dot,
          boxShadow: `0 0 6px ${pill.dot}`,
        }}
      />
      <span
        className="mono"
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: pill.fg,
        }}
      >
        {pill.text}
      </span>
    </div>
  );
}
