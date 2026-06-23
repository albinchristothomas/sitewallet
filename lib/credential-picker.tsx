"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CREDENTIAL_TYPES, getCredentialLabel } from "@/lib/credentials";

// Searchable credential picker. Replaces the long list of buttons / native
// <select> with one steel trigger that opens a panel: a search box on top, a
// scrollable filtered list below. Built to match the Credential Card design
// system (deep steel #15191e fields, safety-orange #f2581c selection).
export function CredentialPicker({
  value,
  onChange,
  placeholder = "Choose a ticket…",
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** smaller trigger + panel for tight layouts (e.g. walk-in tiles) */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = value ? getCredentialLabel(value) : "";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CREDENTIAL_TYPES.slice();
    return CREDENTIAL_TYPES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.issuer.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q),
    );
  }, [query]);

  // close on outside click
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

  // focus the search box when the panel opens; reset query/active
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => searchRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // keep the active row scrolled into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) pick(r.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const triggerH = compact ? 38 : 50;

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%" }}>
      {/* trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="rw-pressable"
        style={{
          height: triggerH,
          width: "100%",
          borderRadius: 9,
          background: "#15191e",
          border: open
            ? "1px solid #f2581c"
            : "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: compact ? "0 11px" : "0 15px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontWeight: value ? 700 : 500,
            fontSize: compact ? 12 : 15,
            color: value ? "#f4f6f7" : "#6b747c",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedLabel || placeholder}
        </span>
        <svg
          width={compact ? 15 : 18}
          height={compact ? 15 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke={open ? "#f2581c" : "#6b747c"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* panel */}
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: triggerH + 6,
            left: 0,
            right: 0,
            minWidth: compact ? 248 : undefined,
            zIndex: 50,
            borderRadius: 11,
            background: "#15191e",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 18px 40px -12px rgba(0,0,0,0.7)",
            overflow: "hidden",
          }}
        >
          {/* search */}
          <div
            style={{
              padding: 9,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b747c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginLeft: 4 }}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search tickets…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "#eef1f3",
              }}
            />
          </div>

          {/* list */}
          <div
            ref={listRef}
            style={{ maxHeight: 280, overflowY: "auto", padding: 6 }}
          >
            {results.length === 0 && (
              <div
                className="mono"
                style={{
                  padding: "16px 12px",
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: "#6b747c",
                  textAlign: "center",
                }}
              >
                NO MATCH · USE “OTHER” TO TYPE IT IN
              </div>
            )}
            {results.map((c, i) => {
              const selected = c.value === value;
              const isActive = i === active;
              return (
                <button
                  key={c.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(c.value)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    textAlign: "left",
                    borderRadius: 8,
                    padding: "9px 11px",
                    border: "none",
                    cursor: "pointer",
                    background: selected
                      ? "rgba(242,88,28,0.12)"
                      : isActive
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontWeight: selected ? 700 : 600,
                        fontSize: 14,
                        color: selected
                          ? "#f4f6f7"
                          : c.isOther
                            ? "#ffb27a"
                            : "#cdd3d8",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.label}
                    </span>
                    <span
                      className="mono"
                      style={{
                        display: "block",
                        fontSize: 9,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#5d666f",
                        marginTop: 2,
                      }}
                    >
                      {c.issuer}
                    </span>
                  </span>
                  {selected && (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#f2581c"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
