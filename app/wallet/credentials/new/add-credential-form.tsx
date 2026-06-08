"use client";

import { useActionState } from "react";
import { addCredential } from "@/app/wallet/actions";
import { CREDENTIAL_TYPES } from "@/lib/credentials";

const initialState: { error?: string } = {};

const inputCls =
  "h-[52px] w-full rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] px-3.5 text-[15px] text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--hi-yellow)] focus:outline-none";

const monoInputCls = inputCls + " font-mono";

type Prefill = {
  type?: string;
  issuer?: string;
  cert?: string;
  issue?: string;
  expiry?: string;
  holder?: string;
  verifyUrl?: string;
};

export function AddCredentialForm({ prefill }: { prefill?: Prefill }) {
  const [state, action, pending] = useActionState(addCredential, initialState);
  const p = prefill ?? {};

  return (
    <form action={action} className="flex flex-1 flex-col">
      {p.verifyUrl && (
        <input type="hidden" name="external_verification_url" value={p.verifyUrl} />
      )}
      <div className="flex-1 overflow-auto px-5 py-3">
        <Field label="Credential type" htmlFor="credential_type" required>
          <div className="relative">
            <select
              id="credential_type"
              name="credential_type"
              required
              defaultValue={p.type ?? ""}
              className={inputCls + " appearance-none pr-10"}
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
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-dim)]">
              ▾
            </span>
          </div>
        </Field>

        <Field label="Issuer" htmlFor="issuer">
          <input
            id="issuer"
            name="issuer"
            type="text"
            defaultValue={p.issuer ?? ""}
            placeholder="e.g. Energy Safety Canada"
            className={inputCls}
          />
        </Field>

        <Field label="Certificate number" htmlFor="certificate_number">
          <input
            id="certificate_number"
            name="certificate_number"
            type="text"
            defaultValue={p.cert ?? ""}
            placeholder="ESC-2024-118-44210"
            className={monoInputCls}
          />
        </Field>

        <Field
          label="Validation code"
          htmlFor="validation_code"
          hint="On Energy Safety Canada cards, this is the long code printed under the QR. Other cards may not have one — leave blank if so."
        >
          <input
            id="validation_code"
            name="validation_code"
            type="text"
            placeholder="R8LQ3-TVNJ7-9JXGZ-0YGQG"
            className={monoInputCls + " tracking-[0.1em]"}
          />
        </Field>

        <Field label="Name on the card" htmlFor="holder_name">
          <input
            id="holder_name"
            name="holder_name"
            type="text"
            defaultValue={p.holder ?? ""}
            placeholder="Full name on the ticket"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Issued" htmlFor="issue_date">
            <input
              id="issue_date"
              name="issue_date"
              type="date"
              defaultValue={p.issue ?? ""}
              className={monoInputCls}
            />
          </Field>
          <Field label="Expires" htmlFor="expiry_date">
            <input
              id="expiry_date"
              name="expiry_date"
              type="date"
              defaultValue={p.expiry ?? ""}
              className={monoInputCls}
            />
          </Field>
        </div>

        {state.error && (
          <p className="mt-2 text-sm text-[color:#F87171]">{state.error}</p>
        )}
      </div>

      <div className="border-t border-[color:var(--hair)] bg-[color:var(--ink-1)] px-5 py-4">
        <button
          type="submit"
          disabled={pending}
          className="h-[60px] w-full rounded-xl bg-[color:var(--hi-yellow)] text-[17px] font-bold tracking-[0.01em] text-[color:var(--ink-1)] transition hover:brightness-95 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save credential"}
        </button>
      </div>
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
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-dim)]"
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
