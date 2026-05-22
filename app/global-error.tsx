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
          background: "#0E1116",
          color: "#fff",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#fca5a5",
            }}
          >
            App crashed
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>
            SiteWallet stopped working.
          </h1>
          <p
            style={{
              fontSize: 14,
              marginTop: 8,
              color: "#cbd5e1",
            }}
          >
            Reload to try again. Your data is safe.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              background: "#fff",
              color: "#0E1116",
              border: "none",
              borderRadius: 8,
              padding: "12px 20px",
              fontSize: 15,
              fontWeight: 600,
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
