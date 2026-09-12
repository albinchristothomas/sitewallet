"use client";

import { useEffect } from "react";
import { FEEDBACK_EMAIL } from "@/lib/brand";
import { Button } from "@/lib/atoms";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sitewallet] route error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rw-panel rw-spine w-full overflow-hidden rounded-[12px] p-6 pl-7 text-left">
        <p className="eyebrow" style={{ color: "var(--bad-text)" }}>
          Error
        </p>
        <h1 className="mt-1 text-xl font-semibold">This screen failed to load.</h1>
        <p className="mt-2 text-sm text-[color:var(--text-dim)]">
          Try again. If it keeps happening, send the message below to support so
          we can fix it.
        </p>
        {error.digest && (
          <p className="mono mt-3 break-all text-[10px] text-[color:var(--text-faint)]">
            ref: {error.digest}
          </p>
        )}
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <a
          href={`mailto:${FEEDBACK_EMAIL}?subject=RigVise%20error&body=${encodeURIComponent(
            `Error message: ${error.message}\n\nRef: ${error.digest ?? "n/a"}\n\nWhat I was doing:`,
          )}`}
          className="rw-pressable inline-flex h-10 items-center justify-center rounded-[7px] border border-[color:var(--line-strong)] bg-[color:var(--surface-2)] px-4 text-sm font-semibold"
        >
          Report
        </a>
      </div>
    </main>
  );
}
