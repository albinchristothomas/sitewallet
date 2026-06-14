"use client";

import { useActionState } from "react";
import { saveWorkerProfile } from "./actions";

const initialState: { error?: string } = {};

const inputCls =
  "h-[48px] w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-3.5 text-[15px] text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--hi-yellow)] focus:outline-none";

type Initial = {
  fullName: string;
  phone: string;
  employeeNumber: string;
  contractorCompany: string;
};

export function ProfileForm({
  email,
  initial,
}: {
  email: string;
  initial: Initial;
}) {
  const [state, action, pending] = useActionState(
    saveWorkerProfile,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <input
          type="email"
          value={email}
          disabled
          className={inputCls + " cursor-not-allowed opacity-60"}
        />
      </Field>

      <Field label="Full name" htmlFor="full_name" required>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={initial.fullName}
          placeholder="Jonathan Doe"
          className={inputCls}
        />
      </Field>

      <Field label="Phone" htmlFor="phone">
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initial.phone}
          placeholder="(403) 555-0123"
          className={inputCls}
        />
      </Field>

      <Field
        label="Contractor company"
        htmlFor="contractor_company"
        hint="Your employer — e.g. Precision Drilling, CWC Energy, Calfrac."
      >
        <input
          id="contractor_company"
          name="contractor_company"
          type="text"
          defaultValue={initial.contractorCompany}
          placeholder="Precision Drilling"
          className={inputCls}
        />
      </Field>

      <Field
        label="Employee number"
        htmlFor="employee_number"
        hint="Optional — your employer's ID for you."
      >
        <input
          id="employee_number"
          name="employee_number"
          type="text"
          defaultValue={initial.employeeNumber}
          placeholder="PD-04472"
          className={inputCls + " font-mono"}
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
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
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
      {hint && (
        <div className="mt-1.5 text-[12px] text-[color:var(--text-faint)]">
          {hint}
        </div>
      )}
    </div>
  );
}
