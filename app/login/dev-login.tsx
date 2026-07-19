"use client";

import { useState, useTransition } from "react";
import { devTestSignIn } from "./actions";

// LOCAL TESTING ONLY — rendered by the login page exclusively when
// NODE_ENV === "development". One tap signs in a seeded test account
// (scripts/seed-test.mjs) without any magic-link email.
const ACCOUNTS = [
  { email: "albinchristothomas+medic@gmail.com", label: "MEDIC · Alex Reyes", tone: "#7ff0a8" },
  { email: "albinchristothomas+pass@gmail.com", label: "WORKER · Dale (ADMIT)", tone: "#c4ccd2" },
  { email: "albinchristothomas+fail@gmail.com", label: "WORKER · Mike (DENY)", tone: "#ffd27a" },
];

export function DevLogin() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function go(email: string) {
    setError(null);
    setBusy(email);
    startTransition(async () => {
      const res = await devTestSignIn(email);
      if (res?.error) {
        setError(res.error);
        setBusy(null);
      }
    });
  }

  return (
    <div
      style={{
        marginTop: 22,
        borderRadius: 11,
        border: "1.5px dashed rgba(255,210,122,0.4)",
        background: "rgba(255,210,122,0.05)",
        padding: "12px 14px",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "#ffd27a",
          marginBottom: 9,
        }}
      >
        LOCAL TEST MODE · ONE-TAP SIGN-IN · NEVER SHOWN IN PRODUCTION
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={pending}
            onClick={() => go(a.email)}
            className="mono rw-pressable"
            style={{
              height: 38,
              borderRadius: 8,
              background: "#15191e",
              border: "1px solid rgba(255,255,255,0.12)",
              color: a.tone,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: pending ? "default" : "pointer",
              opacity: pending && busy !== a.email ? 0.5 : 1,
            }}
          >
            {busy === a.email ? "SIGNING IN…" : a.label}
          </button>
        ))}
      </div>
      {error && (
        <p
          className="mono"
          style={{
            marginTop: 9,
            fontSize: 10,
            lineHeight: 1.5,
            color: "#ff9a8f",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
