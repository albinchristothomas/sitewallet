"use client";

import { useEffect, useRef, useState } from "react";

// Big type-it-in date entry: DAY / MONTH / YEAR boxes with the numeric keypad.
//
// Built for gloved, 40-something field workers copying a date OFF a card —
// the native <input type="date"> calendar opens on today and needs dozens of
// taps to reach an expiry 2-3 years out. Typing "29 03 2027" is one glance at
// the card and six keystrokes. Everyday-design principles applied:
//   · each box is labelled (no DD/MM ambiguity),
//   · focus auto-jumps forward as a box fills (and back on empty backspace),
//   · forgiving input: "27" → 2027, out-of-range values are clamped,
//   · value only leaves the component as a complete valid ISO date.
export function DateField({
  value,
  onChange,
  accentColor = "#d6dce0",
}: {
  /** ISO YYYY-MM-DD, or "" when empty/incomplete */
  value: string;
  onChange: (iso: string) => void;
  accentColor?: string;
}) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const composed =
    day && month && year.length === 4
      ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : "";

  // External fill (AI scan / prefill) → hydrate the boxes.
  useEffect(() => {
    if (value && value !== composed) {
      const [y, m, d] = value.split("-");
      if (y && m && d) {
        setYear(y);
        setMonth(m);
        setDay(d);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Report outward: a complete date as ISO, anything else as "".
  useEffect(() => {
    if (composed !== value) onChange(composed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composed]);

  const digits = (s: string) => s.replace(/\D/g, "");

  const clamp = (raw: string, max: number): string => {
    if (!raw) return "";
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 1) return "";
    return String(Math.min(n, max));
  };

  const boxStyle: React.CSSProperties = {
    height: 52,
    width: "100%",
    borderRadius: 9,
    background: "#15191e",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: 18,
    fontWeight: 700,
    color: accentColor,
    textAlign: "center",
    outline: "none",
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
  };

  const caption: React.CSSProperties = {
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    fontSize: 8,
    letterSpacing: "0.14em",
    color: "#5d666f",
    textAlign: "center",
    marginTop: 5,
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1 }}>
        <input
          ref={dayRef}
          value={day}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="DD"
          className="rw-datebox"
          onChange={(e) => {
            const v = digits(e.target.value).slice(0, 2);
            setDay(v);
            if (v.length === 2) monthRef.current?.focus();
          }}
          onBlur={() => setDay((d) => clamp(d, 31).padStart(d ? 2 : 0, "0"))}
          style={boxStyle}
        />
        <div style={caption}>DAY</div>
      </div>
      <div style={{ flex: 1 }}>
        <input
          ref={monthRef}
          value={month}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="MM"
          className="rw-datebox"
          onChange={(e) => {
            const v = digits(e.target.value).slice(0, 2);
            setMonth(v);
            if (v.length === 2) yearRef.current?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && month === "") dayRef.current?.focus();
          }}
          onBlur={() =>
            setMonth((m) => clamp(m, 12).padStart(m ? 2 : 0, "0"))
          }
          style={boxStyle}
        />
        <div style={caption}>MONTH</div>
      </div>
      <div style={{ flex: 1.6 }}>
        <input
          ref={yearRef}
          value={year}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="YYYY"
          className="rw-datebox"
          onChange={(e) => setYear(digits(e.target.value).slice(0, 4))}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && year === "") monthRef.current?.focus();
          }}
          onBlur={() =>
            // Forgiving: "27" → "2027", "97" → "1997" (old tickets exist).
            setYear((y) => {
              if (y.length === 2) {
                const n = parseInt(y, 10);
                return String(n > 50 ? 1900 + n : 2000 + n);
              }
              return y;
            })
          }
          style={boxStyle}
        />
        <div style={caption}>YEAR</div>
      </div>
      <style>{`.rw-datebox::placeholder{color:#3a3f45}.rw-datebox:focus{border-color:#f2581c}`}</style>
    </div>
  );
}
