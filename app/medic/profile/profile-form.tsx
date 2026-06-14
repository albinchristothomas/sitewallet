"use client";

import { useActionState } from "react";
import { saveMedicProfile } from "./actions";

const initialState: { error?: string } = {};

const inputCls =
  "h-[48px] w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-3.5 text-[15px] text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--hi-yellow)] focus:outline-none";

const KNOWN_FIRMS = [
  "Aluma Safety",
  "Falck",
  "Astus Medical",
  "Iridia Medical",
  "MediRig",
  "Total Medical Solutions",
  "Other / independent",
];

type Initial = {
  fullName: string;
  phone: string;
  medicFirm: string;
  medicLicenseNumber: string;
};

export function MedicProfileForm({
  email,
  initial,
}: {
  email: string;
  initial: Initial;
}) {
  const [state, action, pending] = useActionState(
    saveMedicProfile,
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
          placeholder="Kayla Robinson"
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
        label="Medic firm"
        htmlFor="medic_firm"
        hint="The medical services company you're contracted through."
      >
        <input
          id="medic_firm"
          name="medic_firm"
          type="text"
          defaultValue={initial.medicFirm}
          placeholder="Aluma Safety"
          list="medic-firms"
          className={inputCls}
        />
        <datalist id="medic-firms">
          {KNOWN_FIRMS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </Field>

      <Field
        label="License / certification number"
        htmlFor="medic_license_number"
        hint="EMR, PCP, ACP, or other recognized credential number."
      >
        <input
          id="medic_license_number"
          name="medic_license_number"
          type="text"
          defaultValue={initial.medicLicenseNumber}
          placeholder="AB-EMR-44210"
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
