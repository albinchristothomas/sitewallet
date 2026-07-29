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
  const [view, setView] = useState<"cards" | "photos">("cards");

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === "photos") setView("photos");
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

      {rows.map((r) =>
        view === "photos" && r.photoUrl ? (
          <PhotoTile key={r.id} r={r} />
        ) : (
          <CardRow key={r.id} r={r} />
        ),
      )}
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
