"use client";

import { useActionState } from "react";
import { sendMagicLink } from "./actions";

type State = { error?: string; sent?: boolean; email?: string };

const initialState: State = {};

const inputCls =
  "w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-4 py-3.5 text-base text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--hi-yellow)] focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    sendMagicLink,
    initialState,
  );

  if (state.sent) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "rgba(16,185,129,0.10)",
          border: "1px solid rgba(16,185,129,0.32)",
        }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:#34D399]">
          Check your email
        </div>
        <p className="mt-2 text-sm text-[color:var(--text)]">
          We sent a sign-in link to{" "}
          <span className="font-mono">{state.email}</span>.
        </p>
        <p className="mt-1 text-xs text-[color:var(--text-dim)]">
          Open it on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-dim)]"
        >
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.ca"
          className={inputCls}
        />
      </div>

      {state.error && (
        <p className="text-sm text-[color:#F87171]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-xl bg-[color:var(--hi-yellow)] text-base font-bold text-[color:var(--ink-1)] transition hover:brightness-95 disabled:opacity-50"
      >
        {pending ? "Sending link..." : "Send sign-in link"}
      </button>

      <p className="pt-2 text-center text-xs text-[color:var(--text-faint)]">
        No password. We'll email you a one-time link.
      </p>
    </form>
  );
}
