"use client";

import { useActionState } from "react";
import { sendMagicLink } from "./actions";
import type { SignupIntent } from "@/lib/roles";

type State = { error?: string; sent?: boolean; email?: string };

const initialState: State = {};

const MONO = "'JetBrains Mono', monospace";

export function LoginForm({ signupAs }: { signupAs: SignupIntent | null }) {
  const [state, action, pending] = useActionState<State, FormData>(
    sendMagicLink,
    initialState,
  );

  // Success state — magic link sent
  if (state.sent) {
    return (
      <div
        className="rw-enter"
        style={{
          borderRadius: 8,
          background: "rgba(47,200,106,0.07)",
          border: "1px solid rgba(47,200,106,0.25)",
          padding: "18px 16px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            margin: "0 auto 12px",
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(47,200,106,0.12)",
            border: "1px solid rgba(47,200,106,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2fd072"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: "#7ff0a8",
            textTransform: "uppercase",
          }}
        >
          Check your email
        </div>
        <p style={{ marginTop: 10, fontSize: 14, color: "#d6dce0" }}>
          We sent a sign-in link to
        </p>
        <p
          style={{
            fontFamily: MONO,
            marginTop: 4,
            fontSize: 13,
            fontWeight: 500,
            color: "#f4f6f7",
            wordBreak: "break-all",
          }}
        >
          {state.email}
        </p>
        <p
          style={{
            marginTop: 12,
            fontSize: 12,
            lineHeight: 1.6,
            color: "#9aa3ab",
          }}
        >
          Tap the link on this device. Link expires in 1 hour. If you don&apos;t
          see it, check spam.
        </p>
      </div>
    );
  }

  // Form
  return (
    <form action={action}>
      {signupAs && <input type="hidden" name="signup_as" value={signupAs} />}

      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          style={{
            display: "block",
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.16em",
            color: "#5d666f",
            marginBottom: 9,
            textTransform: "uppercase",
          }}
        >
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@crew.ca"
          className="rw-login-input"
          style={{
            height: 54,
            width: "100%",
            borderRadius: 8,
            background: "#15191e",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "0 16px",
            fontFamily: MONO,
            fontSize: 14,
            color: "#d6dce0",
            outline: "none",
          }}
        />
        <style>{`
          .rw-login-input::placeholder { color: #5d666f; }
          .rw-login-input:focus { border-color: #f2581c; }
        `}</style>
      </div>

      {/* Error */}
      {state.error && (
        <div
          className="rw-enter"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 12,
            borderRadius: 8,
            background: "rgba(239,65,53,0.14)",
            border: "1px solid rgba(239,65,53,0.55)",
            padding: "10px 12px",
          }}
        >
          <span
            style={{
              marginTop: 3,
              display: "inline-block",
              width: 6,
              height: 6,
              flex: "none",
              borderRadius: "50%",
              background: "#ef4135",
              boxShadow: "0 0 6px #ef4135",
            }}
          />
          <p style={{ fontSize: 13, color: "#ff9a8f" }}>{state.error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="rw-pressable"
        style={{
          height: 54,
          width: "100%",
          borderRadius: 8,
          background: "#f2581c",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          marginTop: 16,
          boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: 15,
            color: "#0d0f12",
            letterSpacing: "0.01em",
          }}
        >
          {pending ? "Sending link…" : "Send magic link"}
        </span>
        {!pending && (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0d0f12"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </form>
  );
}
