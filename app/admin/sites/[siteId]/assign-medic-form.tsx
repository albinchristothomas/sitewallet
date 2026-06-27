"use client";

import { useActionState } from "react";
import { assignMedicByEmail, type AssignState } from "./actions";

const initial: AssignState = {};

export function AssignMedicForm({ siteId }: { siteId: string }) {
  const [state, action, pending] = useActionState(
    assignMedicByEmail.bind(null, siteId),
    initial,
  );

  return (
    <form action={action} className="mt-3">
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="medic@firm.ca"
          className="h-11 flex-1 rounded-xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] px-3.5 text-sm outline-none focus:border-[color:var(--brand)]"
          style={{ color: "var(--text)" }}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl px-5 text-sm font-bold"
          style={{
            background: "#f2581c",
            color: "#0d0f12",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Adding…" : "Add medic"}
        </button>
      </div>
      {state.error && (
        <p className="mt-2 text-[13px]" style={{ color: "#ff9a8f" }}>
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-2 text-[13px]" style={{ color: "#7ff0a8" }}>
          Medic added to this site.
        </p>
      )}
      <p className="mt-2 text-[12px] text-[color:var(--text-faint)]">
        They must have signed in to RigWise as a medic at least once.
      </p>
    </form>
  );
}
