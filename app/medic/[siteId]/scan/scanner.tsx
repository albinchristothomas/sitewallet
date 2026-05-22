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
            ? e.message
            : "Could not start camera. Use manual entry below.",
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
      setError("That doesn't look like a worker ID (UUID format).");
      return;
    }
    setError(null);
    router.push(`/medic/${siteId}/verify/${v}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode("camera")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            mode === "camera"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          Camera
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            mode === "manual"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          Manual entry
        </button>
      </div>

      {mode === "camera" ? (
        <div>
          <div
            ref={containerRef}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950 dark:border-zinc-800"
          />
          {starting && (
            <p className="mt-2 text-sm text-zinc-500">Starting camera...</p>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submitManual} className="space-y-3">
          <label
            htmlFor="manual"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Worker ID
          </label>
          <input
            id="manual"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 font-mono text-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Look up
          </button>
        </form>
      )}
    </div>
  );
}
