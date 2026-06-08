"use client";

import { useActionState } from "react";
import { createIncident } from "./actions";

const initialState: { error?: string } = {};

const inputCls =
  "h-[48px] w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-3.5 text-[15px] text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--hi-yellow)] focus:outline-none";

const TYPES: Array<[string, string]> = [
  ["FIRST_AID", "First aid"],
  ["NEAR_MISS", "Near miss"],
  ["PROPERTY_DAMAGE", "Property damage"],
  ["EQUIPMENT_FAILURE", "Equipment failure"],
  ["ENVIRONMENTAL", "Environmental"],
  ["MEDICAL_EVACUATION", "Medical evacuation"],
  ["OTHER", "Other"],
];

const SEVERITIES: Array<[string, string]> = [
  ["LOW", "Low"],
  ["MEDIUM", "Medium"],
  ["HIGH", "High"],
  ["CRITICAL", "Critical"],
];

export function IncidentForm({
  siteId,
  activeWorkers,
}: {
  siteId: string;
  activeWorkers: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(
    createIncident.bind(null, siteId),
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="Type" htmlFor="type" required>
        <select
          id="type"
          name="type"
          required
          defaultValue="FIRST_AID"
          className={inputCls + " appearance-none"}
        >
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Severity" htmlFor="severity" required>
        <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] p-1.5">
          {SEVERITIES.map(([v, l], i) => (
            <label key={v} className="cursor-pointer">
              <input
                type="radio"
                name="severity"
                value={v}
                defaultChecked={i === 0}
                required
                className="peer sr-only"
              />
              <span className="block h-10 rounded-lg py-2 text-center text-[13px] font-semibold text-[color:var(--text-dim)] peer-checked:bg-[color:var(--ink-3)] peer-checked:text-[color:var(--text)]">
                {l}
              </span>
            </label>
          ))}
        </div>
      </Field>

      {activeWorkers.length > 0 && (
        <Field
          label="Worker involved (optional)"
          htmlFor="worker_id"
        >
          <select
            id="worker_id"
            name="worker_id"
            defaultValue=""
            className={inputCls + " appearance-none"}
          >
            <option value="">— Not specific to one worker</option>
            {activeWorkers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="What happened" htmlFor="description" required>
        <textarea
          id="description"
          name="description"
          required
          placeholder="Worker slipped on icy steps coming out of mud-pump shack. Conscious, walking, complained of left knee soreness. Iced and rested for 30 min, returned to work."
          rows={6}
          className={inputCls + " h-auto min-h-[120px] py-3"}
        />
      </Field>

      <Field label="Follow-up needed (optional)" htmlFor="follow_up">
        <input
          id="follow_up"
          name="follow_up"
          type="text"
          placeholder="Inspect steps for ice buildup before next crew change."
          className={inputCls}
        />
      </Field>

      {state.error && (
        <p className="text-sm text-[color:#F87171]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-[56px] w-full rounded-xl bg-[color:var(--hi-yellow)] text-[16px] font-bold text-[color:var(--ink-1)] hover:brightness-95 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save incident"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-dim)]"
      >
        {label}
        {required && <span className="ml-1 text-[color:#EF4444]">*</span>}
      </label>
      {children}
    </div>
  );
}
