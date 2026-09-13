"use client";

import { useActionState } from "react";
import { reviewerSignIn } from "./actions";

const MONO = "var(--font-jetbrains-mono), ui-monospace, monospace";

const field: React.CSSProperties = {
  height: 48,
  width: "100%",
  borderRadius: 9,
  background: "#15191e",
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "0 14px",
  fontSize: 15,
  color: "#f4f6f7",
  outline: "none",
};

export function ReviewForm() {
  const [state, action, pending] = useActionState(reviewerSignIn, {});
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: "#9aa3ab" }}>
        REVIEW ACCOUNT EMAIL
        <input name="email" type="email" autoComplete="username" required style={{ ...field, marginTop: 6 }} />
      </label>
      <label className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: "#9aa3ab" }}>
        PASSWORD
        <input name="password" type="password" autoComplete="current-password" required style={{ ...field, marginTop: 6 }} />
      </label>
      {state.error && (
        <p className="mono" style={{ fontSize: 11, color: "#ff9a8f", margin: 0 }}>
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          marginTop: 4,
          height: 52,
          borderRadius: 9,
          border: "none",
          background: "#f2581c",
          color: "#0d0f12",
          fontWeight: 800,
          fontSize: 15,
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.1em", color: "#5d666f", margin: "6px 0 0", textTransform: "uppercase" }}>
        App store review access only
      </p>
    </form>
  );
}
