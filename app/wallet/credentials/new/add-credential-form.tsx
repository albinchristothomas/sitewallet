"use client";

import { useActionState } from "react";
import { addCredential } from "@/app/wallet/actions";
import { CREDENTIAL_TYPES } from "@/lib/credentials";

const initialState: { error?: string } = {};

export function AddCredentialForm() {
  const [state, action, pending] = useActionState(addCredential, initialState);

  return (
    <form action={action} className="space-y-5">
      <Field label="Credential type" htmlFor="credential_type" required>
        <select
          id="credential_type"
          name="credential_type"
          required
          defaultValue=""
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
        >
          <option value="" disabled>
            Select credential...
          </option>
          {CREDENTIAL_TYPES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Issuer" htmlFor="issuer">
        <input
          id="issuer"
          name="issuer"
          type="text"
          placeholder="e.g. Energy Safety Canada"
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100"
        />
      </Field>

      <Field label="Certificate number" htmlFor="certificate_number">
        <input
          id="certificate_number"
          name="certificate_number"
          type="text"
          placeholder="As printed on the ticket"
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100"
        />
      </Field>

      <Field label="Validation code" htmlFor="validation_code">
        <input
          id="validation_code"
          name="validation_code"
          type="text"
          placeholder="e.g. R8LQ3-TVNJ7-9JXGZ-0YGQG"
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 font-mono text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          The validation code printed under the QR on the ESC card. Used later
          for issuer verification.
        </p>
      </Field>

      <Field label="Holder name (as printed)" htmlFor="holder_name">
        <input
          id="holder_name"
          name="holder_name"
          type="text"
          placeholder="Full name on the ticket"
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Issue date" htmlFor="issue_date">
          <input
            id="issue_date"
            name="issue_date"
            type="date"
            className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
          />
        </Field>

        <Field label="Expiry date" htmlFor="expiry_date">
          <input
            id="expiry_date"
            name="expiry_date"
            type="date"
            className="w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100"
          />
        </Field>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-3 text-base font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Saving..." : "Save credential"}
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
