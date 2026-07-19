"use client";

import { useActionState } from "react";
import { sendMagicLink, verifyCode } from "./actions";
import type { SignupIntent } from "@/lib/roles";

type State = {
  error?: string;
  sent?: boolean;
  email?: string;
  signupAs?: SignupIntent | null;
};

const initialState: State = {};

const MONO = "'JetBrains Mono', monospace";

export function LoginForm({ signupAs }: { signupAs: SignupIntent | null }) {
  const [state, action, pending] = useActionState<State, FormData>(
    sendMagicLink,
    initialState,
  );

  // Step 2 — email sent: type the 6-digit code (works on any device/browser).
  if (state.sent && state.email) {
    return (
      <CodeEntry email={state.email} signupAs={signupAs} onBack={() => location.reload()} />
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
          {pending ? "Sending code…" : "Email me a sign-in code"}
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

// ── Step 2: 6-digit code entry ──────────────────────────────────────────────
function CodeEntry({
  email,
  signupAs,
  onBack,
}: {
  email: string;
  signupAs: SignupIntent | null;
  onBack: () => void;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    verifyCode,
    { sent: true, email },
  );

  return (
    <div className="rw-enter">
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
        Enter your code
      </div>
      <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: "#d6dce0" }}>
        We emailed a 6-digit code to{" "}
        <span style={{ fontFamily: MONO, color: "#f4f6f7", wordBreak: "break-all" }}>
          {email}
        </span>
        . Type it below, or just tap the button in the email.
      </p>

      <form action={action} style={{ marginTop: 16 }}>
        <input type="hidden" name="email" value={email} />
        {signupAs && <input type="hidden" name="signup_as" value={signupAs} />}
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
          placeholder="000000"
          className="rw-login-input"
          style={{
            height: 60,
            width: "100%",
            borderRadius: 8,
            background: "#15191e",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "0 16px",
            fontFamily: MONO,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "0.3em",
            textAlign: "center",
            color: "#f4f6f7",
            outline: "none",
          }}
        />
        <style>{`
          .rw-login-input::placeholder { color: #3a3f45; }
          .rw-login-input:focus { border-color: #f2581c; }
        `}</style>

        {state.error && (
          <div
            className="rw-enter"
            style={{
              marginTop: 12,
              borderRadius: 8,
              background: "rgba(239,65,53,0.14)",
              border: "1px solid rgba(239,65,53,0.55)",
              padding: "10px 12px",
            }}
          >
            <p style={{ fontSize: 13, color: "#ff9a8f" }}>{state.error}</p>
          </div>
        )}

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
            marginTop: 16,
            boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
            fontWeight: 800,
            fontSize: 15,
            color: "#0d0f12",
          }}
        >
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: 14,
          width: "100%",
          background: "none",
          border: "none",
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "#9aa3ab",
          cursor: "pointer",
        }}
      >
        ← Use a different email / resend
      </button>
    </div>
  );
}
