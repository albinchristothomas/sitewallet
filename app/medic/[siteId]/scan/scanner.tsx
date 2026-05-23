"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function Scanner({ siteId }: { siteId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualValue, setManualValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

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
          '<div id="qr-reader" class="w-full"></div>';
        const inst = new Html5Qrcode("qr-reader");
        scanner = inst as unknown as {
          stop: () => Promise<void>;
          clear: () => void;
        };
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            const trimmed = decoded.trim();
            if (UUID_RE.test(trimmed)) {
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
            ? `${e.message}. Allow camera access in your browser settings, or use Manual entry below.`
            : "Could not start camera. Use Manual entry below.",
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
        "Type the long worker ID from under their QR. It looks like 8 letters/numbers, then dashes (e.g. a8b3c4d5-...).",
      );
      return;
    }
    setError(null);
    router.push(`/medic/${siteId}/verify/${v}`);
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-1">
        <button
          onClick={() => setMode("camera")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            mode === "camera"
              ? "bg-[color:var(--ink-3)] text-[color:var(--text)]"
              : "text-[color:var(--text-dim)]"
          }`}
        >
          QR scan
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            mode === "manual"
              ? "bg-[color:var(--ink-3)] text-[color:var(--text)]"
              : "text-[color:var(--text-dim)]"
          }`}
        >
          Type ID
        </button>
      </div>

      {mode === "camera" ? (
        <div>
          <div
            className="relative overflow-hidden rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, #181B21 0 18px, #1E2128 18px 36px)",
              minHeight: 360,
            }}
          >
            <div ref={containerRef} className="absolute inset-0" />

            {/* viewfinder corners */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: 280, height: 280 }}>
                <Corner pos="tl" />
                <Corner pos="tr" />
                <Corner pos="bl" />
                <Corner pos="br" />
                <div
                  className="sw-scan absolute left-3 right-3 top-1/2 h-[2px]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #FACC15, transparent)",
                    boxShadow: "0 0 14px rgba(250,204,21,0.7)",
                  }}
                />
              </div>
            </div>

            <div className="absolute left-4 top-4 font-mono text-[11px] tracking-[0.08em] text-[color:var(--text-faint)]">
              CAM 01 · GATE
            </div>
            <div className="absolute right-4 top-4 flex items-center gap-1.5 font-mono text-[11px] text-[color:#34D399]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:#10B981]" />
              READY
            </div>
            <div className="absolute bottom-5 left-0 right-0 text-center text-[13px] text-[color:var(--text-dim)]">
              {starting
                ? "Starting camera..."
                : "Hold the worker's QR in front of the camera"}
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-[color:#F87171]">{error}</p>
          )}
        </div>
      ) : (
        <form
          onSubmit={submitManual}
          className="rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-6"
        >
          <label
            htmlFor="manual"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-faint)]"
          >
            Worker ID
          </label>
          <input
            id="manual"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="a8b3c4d5-0000-0000-0000-000000000000"
            className="w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-1)] px-4 py-4 font-mono text-[14px] tracking-tight text-[color:var(--text)] focus:border-[color:var(--hi-yellow)] focus:outline-none"
          />
          <p className="mt-3 text-[12px] text-[color:var(--text-faint)]">
            Ask the worker to open their QR screen and tap{" "}
            <span className="font-semibold text-[color:var(--text-dim)]">
              &ldquo;Camera not working? Tap here&rdquo;
            </span>{" "}
            to reveal the long ID. Read it out and type it here.
          </p>
          {error && (
            <p className="mt-2 text-sm text-[color:#F87171]">{error}</p>
          )}
          <button
            type="submit"
            className="mt-5 h-14 w-full rounded-xl bg-[color:var(--hi-yellow)] text-base font-bold text-[color:var(--ink-1)] hover:brightness-95"
          >
            Look up worker
          </button>
        </form>
      )}
    </div>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "#FACC15",
    borderStyle: "solid",
    borderWidth: 0,
  };
  const styles: Record<typeof pos, React.CSSProperties> = {
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  };
  return <div style={{ ...base, ...styles[pos] }} />;
}
