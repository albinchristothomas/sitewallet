"use client";

import { useActionState } from "react";
import { inviteWorker } from "./actions";

type State = { error?: string; sent?: boolean; email?: string };
const initialState: State = {};

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteWorker, initialState);

  if (state.sent) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
        <p className="font-medium text-emerald-900 dark:text-emerald-100">
          Invite sent
        </p>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
          {state.email} should check their email for the sign-in link. Once
          they open it, their wallet is ready.
        </p>
        <a
          href="/admin/invite"
          className="mt-4 inline-block text-sm font-medium underline"
        >
          Invite another worker
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Worker email <span className="text-red-500">*</span>
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
          className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Worker name (pre-fills their profile)
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          placeholder="Jonathan Doe"
          className={inputCls}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-3 text-base font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Sending..." : "Send sign-in link"}
      </button>
    </form>
  );
}
