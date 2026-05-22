"use client";

import { useActionState } from "react";
import { sendMagicLink } from "./actions";

type State = { error?: string; sent?: boolean; email?: string };

const initialState: State = {};

export function LoginForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    sendMagicLink,
    initialState,
  );

  if (state.sent) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950">
        <p className="font-medium text-emerald-900 dark:text-emerald-100">
          Check your email
        </p>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
          We sent a sign-in link to{" "}
          <span className="font-mono">{state.email}</span>. Open it on this
          device to continue.
        </p>
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
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.ca"
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-3 text-base font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Sending link..." : "Send sign-in link"}
      </button>

      <p className="pt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        No password. We'll email you a one-time link.
      </p>
    </form>
  );
}
