"use client";

import { useActionState } from "react";
import { inviteWorker } from "./actions";

type State = { error?: string; sent?: boolean; email?: string };
const initialState: State = {};

const inputCls =
  "h-[52px] w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-3.5 text-[15px] text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--hi-yellow)] focus:outline-none";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteWorker, initialState);

  if (state.sent) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{
          background: "rgba(16,185,129,0.10)",
          border: "1px solid rgba(16,185,129,0.32)",
        }}
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:#34D399]">
          Invite sent
        </div>
        <p className="mt-2 text-sm">
          {state.email} should check their email for the sign-in link. Once
          they open it, their wallet is ready.
        </p>
        <a
          href="/admin/invite"
          className="mt-4 inline-block text-sm font-medium text-[color:var(--hi-yellow)] hover:underline"
        >
          Invite another worker →
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-dim)]"
        >
          Worker email <span className="text-[color:#EF4444]">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="worker@example.com"
          className={inputCls}
        />
      </div>
      <div>
        <label
          htmlFor="full_name"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-dim)]"
        >
          Worker name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Jonathan Doe"
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-[color:var(--text-faint)]">
          Optional. Pre-fills their wallet so they don&apos;t have to type it.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-[color:#F87171]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-[56px] w-full rounded-xl bg-[color:var(--hi-yellow)] text-base font-bold text-[color:var(--ink-1)] hover:brightness-95 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send sign-in link"}
      </button>
    </form>
  );
}
