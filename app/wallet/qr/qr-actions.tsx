"use client";

import { useEffect, useState } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> };

export function QrActions({
  workerId,
  workerName,
}: {
  workerId: string;
  workerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasShare, setHasShare] = useState(false);

  // Detect Web Share support after mount (SSR-safe).
  useEffect(() => {
    setHasShare(
      typeof navigator !== "undefined" &&
        typeof (navigator as Navigator & { share?: unknown }).share === "function",
    );
  }, []);

  // Wake lock — keep the screen on while the QR is visible (gate medic
  // shouldn't have to wait for the worker to wake their phone again).
  useEffect(() => {
    let lock: WakeLockSentinelLike | null = null;
    const wakeLockApi = (
      navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;

    const acquire = async () => {
      if (!wakeLockApi) return;
      try {
        lock = await wakeLockApi.request("screen");
      } catch {
        // Wake lock denied (e.g. low battery saver) — silently skip.
      }
    };

    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (lock) lock.release().catch(() => {});
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(workerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const share = async () => {
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (!nav.share) return;
    try {
      await nav.share({
        title: `${workerName} — Rigwise ID`,
        text: workerId,
      });
    } catch {
      // User cancelled or unsupported — silent.
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 h-12 w-full rounded-xl border border-[color:var(--hair-strong)] bg-transparent text-[13px] font-semibold text-[color:var(--text-dim)] transition hover:bg-[color:var(--ink-2)] hover:text-[color:var(--text)]"
        style={{
          marginBottom: "calc(env(safe-area-inset-bottom, 0px))",
        }}
      >
        Camera not working? Show ID
      </button>
    );
  }

  return (
    <div
      className="mt-3 rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-3"
      style={{ marginBottom: "calc(env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="select-all break-all rounded-lg bg-[color:var(--ink-1)] px-3 py-3 text-center font-mono text-[12px] leading-relaxed text-[color:var(--text)]">
        {workerId}
      </div>
      <div
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: hasShare ? "1fr 1fr" : "1fr" }}
      >
        <button
          onClick={copy}
          className="h-12 rounded-lg bg-[color:var(--ink-3)] text-[14px] font-semibold text-[color:var(--text)] active:scale-[0.98]"
        >
          {copied ? "✓ Copied" : "Copy ID"}
        </button>
        {hasShare && (
          <button
            onClick={share}
            className="h-12 rounded-lg bg-[color:var(--hi-yellow)] text-[14px] font-bold text-[color:var(--ink-1)] active:scale-[0.98]"
          >
            Share
          </button>
        )}
      </div>
      <button
        onClick={() => setOpen(false)}
        className="mt-2 h-9 w-full text-[12px] text-[color:var(--text-faint)] hover:text-[color:var(--text-dim)]"
      >
        Hide
      </button>
    </div>
  );
}
