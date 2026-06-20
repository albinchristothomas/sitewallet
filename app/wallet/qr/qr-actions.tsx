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
        title: `${workerName} — RigWise ID`,
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
        className="mono"
        style={{
          marginTop: 14,
          height: 44,
          width: "100%",
          borderRadius: 9,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#15191e",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.1em",
          color: "#9aa3ab",
          marginBottom: "calc(env(safe-area-inset-bottom, 0px))",
        }}
      >
        CAMERA NOT WORKING? SHOW ID
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "#15191e",
        padding: 12,
        marginBottom: "calc(env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div
        className="mono"
        style={{
          userSelect: "all",
          wordBreak: "break-all",
          borderRadius: 9,
          background: "#0d0f12",
          padding: "12px",
          textAlign: "center",
          fontSize: 12,
          lineHeight: 1.6,
          color: "#d6dce0",
        }}
      >
        {workerId}
      </div>
      <div
        style={{
          marginTop: 8,
          display: "grid",
          gap: 8,
          gridTemplateColumns: hasShare ? "1fr 1fr" : "1fr",
        }}
      >
        <button
          onClick={copy}
          style={{
            height: 48,
            borderRadius: 9,
            background: "#2a2f35",
            fontSize: 14,
            fontWeight: 600,
            color: "#eef1f3",
          }}
        >
          {copied ? "✓ Copied" : "Copy ID"}
        </button>
        {hasShare && (
          <button
            onClick={share}
            style={{
              height: 48,
              borderRadius: 9,
              background: "#f2581c",
              fontSize: 14,
              fontWeight: 700,
              color: "#0d0f12",
              boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
            }}
          >
            Share
          </button>
        )}
      </div>
      <button
        onClick={() => setOpen(false)}
        className="mono"
        style={{
          marginTop: 8,
          height: 36,
          width: "100%",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "#5d666f",
        }}
      >
        HIDE
      </button>
    </div>
  );
}
