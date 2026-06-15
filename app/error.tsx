"use client";

import { useEffect } from "react";

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
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
        <p className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-300">
          Something broke
        </p>
        <h1 className="mt-1 text-xl font-semibold">
          We couldn't load this screen.
        </h1>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          Try again. If it keeps happening, send the message below to support so
          we can fix it.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] text-zinc-500 break-all">
            ref: {error.digest}
          </p>
        )}
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Try again
        </button>
        <a
          href={`mailto:feedback@rigwise.ca?subject=Rigwise%20error&body=${encodeURIComponent(
            `Error message: ${error.message}\n\nRef: ${error.digest ?? "n/a"}\n\nWhat I was doing:`,
          )}`}
          className="rounded-md border border-zinc-300 px-4 py-3 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Report
        </a>
      </div>
    </main>
  );
}
