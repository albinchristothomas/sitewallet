"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function feedbackTick() {
  // Haptic — Android + iOS PWA support
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(40);
    }
  } catch {}
  // Audio — short, soft chirp
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.12;
    o.start();
    o.stop(ctx.currentTime + 0.09);
    setTimeout(() => ctx.close().catch(() => {}), 250);
  } catch {}
}

export function Scanner({ siteId }: { siteId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualValue, setManualValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (mode !== "camera") return;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;

    (async () => {
      setStarting(true);
      setError(null);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML =
          '<div id="qr-reader" class="w-full h-full"></div>';
        const inst = new Html5Qrcode("qr-reader");
        scanner = inst as unknown as {
          stop: () => Promise<void>;
          clear: () => void;
        };
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            const trimmed = decoded.trim();
            if (UUID_RE.test(trimmed)) {
              setDetected(true);
              feedbackTick();
              inst
                .stop()
                .catch(() => {})
                .finally(() => {
                  router.push(`/medic/${siteId}/verify/${trimmed}`);
                });
            }
          },
          () => {},
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? `${e.message}. Allow camera access in your browser, or use "Type ID" below.`
            : "Couldn't start camera. Use Type ID below.",
        );
      } finally {
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [mode, siteId, router]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const v = manualValue.trim();
    if (!UUID_RE.test(v)) {
      setError(
        "That doesn't look like a worker ID. Ask the worker to tap “Camera not working? Show ID” on their QR screen.",
      );
      return;
    }
    setError(null);
    router.push(`/medic/${siteId}/verify/${v}`);
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-3">
      {/* Toggle — bigger, full-width on mobile */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-1.5">
        <button
          onClick={() => setMode("camera")}
          className={`h-12 rounded-lg text-[14px] font-semibold transition ${
            mode === "camera"
              ? "bg-[color:var(--ink-3)] text-[color:var(--text)]"
              : "text-[color:var(--text-dim)]"
          }`}
        >
          QR scan
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`h-12 rounded-lg text-[14px] font-semibold transition ${
            mode === "manual"
              ? "bg-[color:var(--ink-3)] text-[color:var(--text)]"
              : "text-[color:var(--text-dim)]"
          }`}
        >
          Type ID
        </button>
      </div>

      {mode === "camera" ? (
        <div
          className="relative flex-1 overflow-hidden rounded-2xl border border-[color:var(--hair)] bg-black"
          style={{
            minHeight: "min(60vh, 480px)",
            backgroundImage:
              "repeating-linear-gradient(135deg, #181B21 0 18px, #1E2128 18px 36px)",
          }}
        >
          <div ref={containerRef} className="absolute inset-0" />

          {/* Viewfinder corners — larger */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="relative"
              style={{ width: "min(78vw, 320px)", aspectRatio: "1 / 1" }}
            >
              <Corner pos="tl" detected={detected} />
              <Corner pos="tr" detected={detected} />
              <Corner pos="bl" detected={detected} />
              <Corner pos="br" detected={detected} />
              {!detected && (
                <div
                  className="sw-scan absolute left-3 right-3 top-1/2 h-[2px]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #FACC15, transparent)",
                    boxShadow: "0 0 14px rgba(250,204,21,0.7)",
                  }}
                />
              )}
            </div>
          </div>

          {/* Top-left status */}
          <div className="pointer-events-none absolute left-4 top-4 font-mono text-[11px] tracking-[0.08em] text-[color:var(--text-faint)]">
            CAM · GATE
          </div>
          <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 font-mono text-[11px]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: detected ? "#10B981" : "#FACC15",
                boxShadow: detected
                  ? "0 0 0 3px rgba(16,185,129,0.30)"
                  : "0 0 0 3px rgba(250,204,21,0.20)",
              }}
            />
            <span style={{ color: detected ? "#34D399" : "var(--text-dim)" }}>
              {detected ? "GOT IT" : "READY"}
            </span>
          </div>

          {/* Bottom instruction */}
          <div className="pointer-events-none absolute inset-x-4 bottom-5 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(11,13,17,0.7)] px-4 py-2 text-[13px] text-[color:var(--text)] backdrop-blur">
              {starting
                ? "Starting camera…"
                : detected
                  ? "Verifying…"
                  : "Hold the worker's QR in the frame"}
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={submitManual}
          className="flex flex-1 flex-col gap-3 rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-5"
        >
          <label
            htmlFor="manual"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-faint)]"
          >
            Worker ID
          </label>
          <input
            id="manual"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="a8b3c4d5-0000-0000-0000-000000000000"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-1)] px-4 py-4 font-mono text-[15px] text-[color:var(--text)] focus:border-[color:var(--hi-yellow)] focus:outline-none"
          />
          <p className="text-[12px] leading-relaxed text-[color:var(--text-faint)]">
            Ask the worker to open their QR screen and tap{" "}
            <span className="font-semibold text-[color:var(--text-dim)]">
              &ldquo;Camera not working? Show ID&rdquo;
            </span>
            . They can read out, copy, or AirDrop it to you.
          </p>
          <div className="flex-1" />
          <button
            type="submit"
            className="h-14 w-full rounded-xl bg-[color:var(--hi-yellow)] text-[15px] font-bold text-[color:var(--ink-1)] active:scale-[0.98]"
          >
            Look up worker
          </button>
        </form>
      )}

      {error && (
        <p className="rounded-lg border border-[color:rgba(239,68,68,0.30)] bg-[color:rgba(239,68,68,0.10)] px-4 py-3 text-[13px] leading-relaxed text-[color:#F87171]">
          {error}
        </p>
      )}
    </div>
  );
}

function Corner({
  pos,
  detected,
}: {
  pos: "tl" | "tr" | "bl" | "br";
  detected: boolean;
}) {
  const color = detected ? "#10B981" : "#FACC15";
  const base: React.CSSProperties = {
    position: "absolute",
    width: 44,
    height: 44,
    borderColor: color,
    borderStyle: "solid",
    borderWidth: 0,
    transition: "border-color 0.15s ease",
  };
  const styles: Record<typeof pos, React.CSSProperties> = {
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  };
  return <div style={{ ...base, ...styles[pos] }} />;
}
