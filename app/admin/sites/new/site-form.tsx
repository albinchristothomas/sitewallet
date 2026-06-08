"use client";

import { useActionState } from "react";
import { CREDENTIAL_TYPES } from "@/lib/credentials";
import { Eyebrow } from "@/lib/atoms";
import { createSite } from "./actions";

const initialState: { error?: string } = {};

const inputCls =
  "h-[48px] w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-3.5 text-[15px] text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--hi-yellow)] focus:outline-none";

const monoInput = inputCls + " font-mono";

export function SiteForm() {
  const [state, action, pending] = useActionState(createSite, initialState);

  return (
    <form action={action} className="space-y-7">
      <Section title="Oil company, project & contract">
        <Field label="Oil company" htmlFor="operator_name" required>
          <input
            id="operator_name"
            name="operator_name"
            type="text"
            required
            placeholder="Tourmaline Oil Corp"
            className={inputCls}
          />
        </Field>
        <Field label="Project name" htmlFor="project_name" required>
          <input
            id="project_name"
            name="project_name"
            type="text"
            required
            placeholder="Karr Wapiti Drilling Program 2026"
            className={inputCls}
          />
        </Field>
        <Field label="Contract name" htmlFor="contract_name">
          <input
            id="contract_name"
            name="contract_name"
            type="text"
            placeholder="Karr Wapiti 2026 Drilling MSA"
            className={inputCls}
          />
        </Field>
        <Field label="Contractor company" htmlFor="contractor_company_name">
          <input
            id="contractor_company_name"
            name="contractor_company_name"
            type="text"
            placeholder="Precision Drilling"
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Site & well">
        <Field label="Site name" htmlFor="site_name" required>
          <input
            id="site_name"
            name="site_name"
            type="text"
            required
            placeholder="Karr 12-34 Pad B"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Rig name" htmlFor="rig_name">
            <input
              id="rig_name"
              name="rig_name"
              type="text"
              placeholder="Precision 555"
              className={inputCls}
            />
          </Field>
          <Field label="Rig number" htmlFor="rig_number">
            <input
              id="rig_number"
              name="rig_number"
              type="text"
              placeholder="555"
              className={monoInput}
            />
          </Field>
        </div>
        <Field label="Well number" htmlFor="well_number">
          <input
            id="well_number"
            name="well_number"
            type="text"
            placeholder="PD 525"
            className={monoInput}
          />
        </Field>
        <Field label="LSD / location" htmlFor="lsd_location">
          <input
            id="lsd_location"
            name="lsd_location"
            type="text"
            placeholder="12-34-067-25 W5M"
            className={monoInput}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Latitude" htmlFor="lat">
            <input
              id="lat"
              name="lat"
              type="number"
              step="any"
              placeholder="54.123456"
              className={monoInput}
            />
          </Field>
          <Field label="Longitude" htmlFor="lng">
            <input
              id="lng"
              name="lng"
              type="number"
              step="any"
              placeholder="-118.456789"
              className={monoInput}
            />
          </Field>
        </div>
      </Section>

      <Section title="Required credentials">
        <p className="mb-2 text-[12px] text-[color:var(--text-dim)]">
          Workers must hold all checked credentials to be admitted at the gate.
        </p>
        <div className="space-y-1 rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-2">
          {CREDENTIAL_TYPES.map((c) => (
            <label
              key={c.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg p-3 hover:bg-[color:var(--ink-3)]"
            >
              <input
                type="checkbox"
                name="required"
                value={c.value}
                className="mt-1 h-4 w-4 accent-[color:var(--hi-yellow)]"
                defaultChecked={
                  c.value === "H2S_ALIVE" ||
                  c.value === "FIRST_AID" ||
                  c.value === "OSSA_FIT"
                }
              />
              <span>
                <span className="block text-[14px] font-semibold">
                  {c.label}
                </span>
                <span className="block text-[12px] text-[color:var(--text-faint)]">
                  {c.issuer}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      {state.error && (
        <p className="text-sm text-[color:#F87171]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-[56px] w-full rounded-xl bg-[color:var(--hi-yellow)] text-[16px] font-bold text-[color:var(--ink-1)] hover:brightness-95 disabled:opacity-50"
      >
        {pending ? "Creating site..." : "Create site"}
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <Eyebrow className="mb-3">{title}</Eyebrow>
      <div className="space-y-3.5">{children}</div>
    </section>
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
