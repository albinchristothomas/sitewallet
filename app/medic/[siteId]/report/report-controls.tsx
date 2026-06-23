"use client";

import { Printer } from "lucide-react";

// The report is always today's live record — no manual date change (prevents
// confusion + tampering). The medic just views today and downloads/sends it.
export function ReportControls({ day }: { day: string }) {
  return (
    <div className="flex items-end gap-3">
      <div>
        <div className="mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-faint)]">
          Today · live
        </div>
        <div className="mono text-[13px]" style={{ color: "#c4ccd2" }}>
          {day}
        </div>
      </div>
      <button
        onClick={() => window.print()}
        type="button"
        className="rw-pressable inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-bold"
        style={{ background: "#f2581c", color: "#0d0f12" }}
      >
        <Printer size={16} strokeWidth={1.75} /> Download PDF
      </button>
    </div>
  );
}
