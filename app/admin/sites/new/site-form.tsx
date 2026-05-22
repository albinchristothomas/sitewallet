"use client";

import { useActionState } from "react";
import { CREDENTIAL_TYPES } from "@/lib/credentials";
import { createSite } from "./actions";

const initialState: { error?: string } = {};

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100";

export function SiteForm() {
  const [state, action, pending] = useActionState(createSite, initialState);

  return (
    <form action={action} className="space-y-5">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Operator & project
        </h2>
        <div className="space-y-4">
          <Field label="Operator company" htmlFor="operator_name" required>
            <input
              id="operator_name"
              name="operator_name"
              type="text"
              required
              placeholder="e.g. Tourmaline Oil Corp"
              className={inputCls}
            />
          </Field>
          <Field label="Project name" htmlFor="project_name" required>
            <input
              id="project_name"
              name="project_name"
              type="text"
              required
              placeholder="e.g. Karr Wapiti Drilling Program 2026"
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Site
        </h2>
        <div className="space-y-4">
          <Field label="Site name" htmlFor="site_name" required>
            <input
              id="site_name"
              name="site_name"
              type="text"
              required
              placeholder="e.g. Karr 12-34 Pad B"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="LSD / location" htmlFor="lsd_location">
            <input
              id="lsd_location"
              name="lsd_location"
              type="text"
              placeholder="12-34-067-25 W5M"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Latitude" htmlFor="lat">
              <input
                id="lat"
                name="lat"
                type="number"
                step="any"
                placeholder="54.123456"
                className={inputCls}
              />
            </Field>
            <Field label="Longitude" htmlFor="lng">
              <input
                id="lng"
                name="lng"
                type="number"
                step="any"
                placeholder="-118.456789"
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Required credentials
        </h2>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Workers must hold all checked credentials to be admitted at the gate.
        </p>
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          {CREDENTIAL_TYPES.map((c) => (
            <label
              key={c.value}
              className="flex items-start gap-3 rounded-md p-2 hover:bg-white dark:hover:bg-zinc-900"
            >
              <input
                type="checkbox"
                name="required"
                value={c.value}
                className="mt-1"
                defaultChecked={
                  c.value === "H2S_ALIVE" ||
                  c.value === "FIRST_AID" ||
                  c.value === "OSSA_FIT"
                }
              />
              <span>
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {c.issuer}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-3 text-base font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Creating..." : "Create site"}
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
        className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
