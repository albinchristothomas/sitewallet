"use client";

import { Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function ReportControls({ day }: { day: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("day", e.target.value);
    router.push(`?${newParams.toString()}`);
  }

  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-faint)]">
          Date
        </label>
        <input
          type="date"
          defaultValue={day}
          onChange={onDateChange}
          className="mt-1 rounded-lg border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-3 py-2 text-sm focus:border-[color:var(--hi-yellow)] focus:outline-none"
        />
      </div>
      <button
        onClick={() => window.print()}
        type="button"
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[color:var(--hi-yellow)] px-4 text-sm font-bold text-[color:var(--ink-1)]"
      >
        <Printer size={16} strokeWidth={1.75} /> Print / save as PDF
      </button>
    </div>
  );
}
