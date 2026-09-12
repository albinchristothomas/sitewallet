"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sitewallet] global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0f12",
          color: "#f4f6f7",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <p
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#ff9a8f",
            }}
          >
            App crashed
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>
            RigVise stopped working.
          </h1>
          <p
            style={{
              fontSize: 14,
              marginTop: 8,
              color: "#9aa3ab",
            }}
          >
            Reload to try again. Your data is safe.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              background: "#f2581c",
              color: "#0d0f12",
              border: "none",
              borderRadius: 7,
              height: 40,
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
