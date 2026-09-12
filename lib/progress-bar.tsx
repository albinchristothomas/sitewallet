"use client";

import { useEffect, useRef, useState } from "react";

// Design-system progress bar: steel track, flat safety-orange fill, mono
// uppercase label. Duration of server work is unknown, so the bar eases
// toward 90% while active and the page's own success transition finishes
// the story. No percent readout: the number would be invented. Renders
// nothing when inactive.
export function ProgressBar({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  const [pct, setPct] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setPct(12);
      timer.current = setInterval(() => {
        setPct((p) => (p < 90 ? p + Math.max(0.4, (90 - p) * 0.055) : p));
      }, 160);
    } else {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setPct(0);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "#ffd27a",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "#15191e",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 999,
            background: "#f2581c",
            transition: "width 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}
