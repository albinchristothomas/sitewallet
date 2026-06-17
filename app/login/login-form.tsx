"use client";

import { useActionState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/lib/atoms";
import { sendMagicLink } from "./actions";
import type { SignupIntent } from "@/lib/roles";

type State = { error?: string; sent?: boolean; email?: string };

const initialState: State = {};

export function LoginForm({ signupAs }: { signupAs: SignupIntent | null }) {
  const [state, action, pending] = useActionState<State, FormData>(
    sendMagicLink,
    initialState,
  );

  // Success state — magic link sent
  if (state.sent) {
    return (
      <div className="rw-enter rounded-[10px] border border-[color:var(--ok-line)] bg-[color:var(--ok-bg)] p-5 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--ok-line)] bg-[color:var(--surface-1)] text-[color:var(--ok)]">
          <CheckCircle2 size={20} strokeWidth={1.8} />
        </div>
        <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:#4ADE80]">
          Check your email
        </div>
        <p className="mt-2 text-[14px] text-[color:var(--text)]">
          We sent a sign-in link to
        </p>
        <p className="mono mt-1 text-[13px] font-medium text-[color:var(--text)]">
          {state.email}
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--text-dim)]">
          Tap the link on this device. Link expires in 1 hour.
          If you don&apos;t see it, check spam.
        </p>
      </div>
    );
  }

  // Form
  return (
    <form action={action} className="space-y-3.5">
      {signupAs && <input type="hidden" name="signup_as" value={signupAs} />}

      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          className="mb-2 block mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-dim)]"
        >
          Work email
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[color:var(--text-faint)]">
            <Mail size={16} strokeWidth={1.7} />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.ca"
            className="h-12 w-full rounded-[8px] border border-[color:var(--line)] bg-[color:var(--surface-1)] pl-10 pr-3.5 text-[14px] text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] transition-colors focus:border-[color:var(--brand)] focus:outline-none"
          />
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div className="rw-enter flex items-start gap-2 rounded-[8px] border border-[color:var(--bad-line)] bg-[color:var(--bad-bg)] px-3 py-2.5">
          <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--bad)]" />
          <p className="text-[13px] text-[#FCA5A5]">{state.error}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={pending}
      >
        {pending ? "Sending link…" : "Email me a sign-in link"}
      </Button>

      <p className="pt-1 text-center text-[11.5px] leading-relaxed text-[color:var(--text-faint)]">
        No password. We send a one-time link you tap to sign in.
      </p>
    </form>
  );
}
