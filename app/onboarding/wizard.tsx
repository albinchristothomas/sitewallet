"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/lib/atoms";
import { completeOnboarding, type OnboardingPayload } from "./actions";
import type { AccountType } from "@/lib/roles";

type FormState = Required<{
  full_name: string;
  phone: string;
  contractor_company: string;
  current_worksite: string;
  employee_number: string;
  drivers_license_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  allergies: string;
  medical_conditions: string;
  medic_firm: string;
  medic_license_number: string;
}>;

// Worker setup is intentionally tiny: name, who they work for, where they're
// going. Everything else is optional and captured later.
const WORKER_STEPS = ["intro", "details"] as const;
const MEDIC_STEPS = ["intro", "you", "credentials"] as const;

type StepKey =
  | (typeof WORKER_STEPS)[number]
  | (typeof MEDIC_STEPS)[number];

export function OnboardingWizard({
  accountType,
  email,
  initial,
}: {
  accountType: AccountType;
  email: string;
  initial: FormState;
}) {
  const steps: readonly StepKey[] =
    accountType === "WORKER" ? WORKER_STEPS : MEDIC_STEPS;

  const [stepIdx, setStepIdx] = useState(0);
  const [state, setState] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  const update = (k: keyof FormState) => (v: string) =>
    setState((s) => ({ ...s, [k]: v }));

  const validateCurrent = (): string | null => {
    if (step === "details") {
      if (!state.full_name.trim()) return "Enter your full name.";
      if (!state.contractor_company.trim())
        return "Which company do you work for?";
      if (!state.current_worksite.trim())
        return "Which site are you going to?";
    }
    if (step === "you") {
      if (!state.full_name.trim()) return "Enter your full legal name.";
      if (!state.phone.trim()) return "Enter your phone number.";
    }
    if (step === "credentials") {
      if (!state.medic_firm.trim())
        return "Which medic firm are you with?";
      if (!state.medic_license_number.trim())
        return "Enter your medic license number.";
    }
    return null;
  };

  const onNext = () => {
    const e = validateCurrent();
    if (e) {
      setError(e);
      return;
    }
    setError(null);
    if (!isLast) {
      setStepIdx((i) => i + 1);
      return;
    }
    // Submit.
    startTransition(async () => {
      const payload: OnboardingPayload =
        accountType === "WORKER"
          ? {
              full_name: state.full_name,
              phone: state.phone,
              contractor_company: state.contractor_company,
              current_worksite: state.current_worksite,
            }
          : {
              full_name: state.full_name,
              phone: state.phone,
              medic_firm: state.medic_firm,
              medic_license_number: state.medic_license_number,
            };
      const res = await completeOnboarding(payload);
      if (res && !res.ok) setError(res.error ?? "Something went wrong.");
    });
  };

  const onBack = () => {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
  };

  // Step counter excludes "intro".
  const totalForms = steps.length - 1;
  const formIdx = step === "intro" ? 0 : steps.indexOf(step);

  return (
    <div className="w-full max-w-[460px]">
      {/* Digital safety card — white sheet on dark surface */}
      <div className="overflow-hidden rounded-[14px] border border-[color:var(--line)] bg-[#FAFAF7] text-[#0A0A0A] shadow-[0_2px_0_rgba(0,0,0,0.4)]">
        {/* Top strip — like the TRICAN logo bar on a real ticket */}
        <div className="flex items-center justify-between border-b border-[#0A0A0A]/12 bg-white px-5 py-3">
          <div className="flex items-center gap-2.5">
            <BrandMark size={22} />
            <BrandWordmark
              className="text-[14px] font-bold tracking-[-0.01em] text-[#0A0A0A]"
              highlightClassName="text-[#EAB308]"
            />
          </div>
          <div className="mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7A8290]">
            Account setup
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-7 sm:px-7">
          {step !== "intro" && (
            <div className="mb-5 flex items-center justify-between">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#525866] transition-colors hover:text-[#0A0A0A]"
                disabled={pending}
              >
                <ArrowLeft size={14} strokeWidth={1.8} />
                Back
              </button>
              <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#7A8290]">
                Step {formIdx} of {totalForms}
              </div>
            </div>
          )}

          {step === "intro" && (
            <IntroStep accountType={accountType} email={email} />
          )}
          {step === "details" && (
            <WorkerDetailsStep state={state} update={update} />
          )}
          {step === "you" && (
            <YouStep state={state} update={update} accountType={accountType} />
          )}
          {step === "credentials" && (
            <CredentialsStep state={state} update={update} />
          )}

          {error && (
            <div className="mt-5 rounded-[6px] border border-[rgba(220,38,38,0.4)] bg-[rgba(220,38,38,0.08)] px-3.5 py-2.5 text-[13px] text-[#B91C1C]">
              {error}
            </div>
          )}

          <div className="mt-7 flex items-center justify-end">
            <button
              onClick={onNext}
              disabled={pending}
              className="rw-pressable inline-flex h-12 items-center gap-2 rounded-[8px] border border-[#A16207] bg-[#FACC15] px-5 text-[14.5px] font-bold text-[#0A0A0A] disabled:opacity-60"
            >
              {pending ? (
                "Saving…"
              ) : isLast ? (
                <>
                  <Check size={16} strokeWidth={2.2} />
                  Complete setup
                </>
              ) : step === "intro" ? (
                <>
                  Get started
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={16} strokeWidth={2} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card footer — encoded-serial style like the ESC card */}
        <div className="border-t border-[#0A0A0A]/10 bg-[#F4F2EC] px-5 py-2.5 mono text-[9.5px] uppercase tracking-[0.18em] text-[#7A8290]">
          RigWise · {accountType === "WORKER" ? "Worker enrollment" : "Medic enrollment"} · {new Date().getFullYear()}
        </div>
      </div>

      <p className="mt-4 px-1 text-center text-[11.5px] leading-relaxed text-[color:var(--text-faint)]">
        Your information is stored against this account only. It travels with you between sites and stays current across renewals.
      </p>
    </div>
  );
}

/* ============================================================
   STEP CONTENTS — paper-form aesthetic, underline-only inputs
   ============================================================ */

function StepHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <header className="mb-6">
      <div className="mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#EAB308]">
        {eyebrow}
      </div>
      <h1 className="mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#0A0A0A]">
        {title}
      </h1>
      {body && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#525866]">
          {body}
        </p>
      )}
    </header>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  optional = false,
  autoFocus = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  optional?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#525866]">
          {label}
          {optional && (
            <span className="ml-1.5 text-[#7A8290]">(optional)</span>
          )}
        </span>
      </div>
      {multiline ? (
        <textarea
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mt-1.5 w-full resize-none border-0 border-b border-[#0A0A0A]/30 bg-transparent px-0 py-2 text-[15px] text-[#0A0A0A] placeholder:text-[#A0A6B0] focus:border-[#0A0A0A] focus:outline-none focus:ring-0"
        />
      ) : (
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          className="mt-1.5 w-full border-0 border-b border-[#0A0A0A]/30 bg-transparent px-0 py-2 text-[15px] text-[#0A0A0A] placeholder:text-[#A0A6B0] focus:border-[#0A0A0A] focus:outline-none focus:ring-0"
        />
      )}
      {hint && <p className="mt-1.5 text-[11.5px] text-[#7A8290]">{hint}</p>}
    </label>
  );
}

function IntroStep({
  accountType,
  email,
}: {
  accountType: AccountType;
  email: string;
}) {
  return (
    <>
      <StepHeader
        eyebrow={accountType === "WORKER" ? "Worker enrollment" : "Medic enrollment"}
        title={accountType === "WORKER" ? "Set up your wallet." : "Set up your station."}
        body={
          accountType === "WORKER"
            ? "We need a few details once. After that, every gate you walk up to pulls the same data — no paper forms, no re-typing."
            : "We need a few details once so workers admitted under you are traceable to the right firm and license."
        }
      />
      <div className="rounded-[6px] border border-[#0A0A0A]/10 bg-white px-3.5 py-3">
        <div className="mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#7A8290]">
          Signed in as
        </div>
        <div className="mt-1 mono text-[13px] font-medium text-[#0A0A0A]">
          {email}
        </div>
      </div>
      <ul className="mt-5 space-y-2 text-[13px] text-[#525866]">
        {(accountType === "WORKER"
          ? [
              "Your name",
              "Company you work for",
              "Site you're going to",
            ]
          : ["Name + phone", "Medic firm + license"]
        ).map((s, i) => (
          <li key={s} className="flex items-center gap-2.5">
            <span className="mono text-[10.5px] font-semibold text-[#A0A6B0]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function YouStep({
  state,
  update,
  accountType,
}: {
  state: FormState;
  update: (k: keyof FormState) => (v: string) => void;
  accountType: AccountType;
}) {
  return (
    <>
      <StepHeader
        eyebrow="About you"
        title="Who are you?"
        body={
          accountType === "WORKER"
            ? "Use the same legal name that appears on your safety tickets."
            : "Use the name on your medic license."
        }
      />
      <div className="space-y-6">
        <Field
          label="Full legal name"
          value={state.full_name}
          onChange={update("full_name")}
          placeholder="Albin Christo Thomas"
          autoFocus
        />
        <Field
          label="Phone"
          value={state.phone}
          onChange={update("phone")}
          placeholder="403-555-0123"
          type="tel"
          hint="Used for gate check-in confirmation and emergency contact."
        />
      </div>
    </>
  );
}

function WorkerDetailsStep({
  state,
  update,
}: {
  state: FormState;
  update: (k: keyof FormState) => (v: string) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Your details"
        title="Quick setup."
        body="Three things and you're in. You can add more to your profile later."
      />
      <div className="space-y-6">
        <Field
          label="Full name"
          value={state.full_name}
          onChange={update("full_name")}
          placeholder="Albin Christo Thomas"
          autoFocus
        />
        <Field
          label="Company you work for"
          value={state.contractor_company}
          onChange={update("contractor_company")}
          placeholder="Trican Well Service"
          hint="The employer or contractor you represent on site."
        />
        <Field
          label="Site you're going to"
          value={state.current_worksite}
          onChange={update("current_worksite")}
          placeholder="e.g. Tourmaline N144"
          hint="The rig or wellsite for this rotation. You can change it when you move."
        />
        <Field
          label="Phone"
          value={state.phone}
          onChange={update("phone")}
          placeholder="403-555-0123"
          type="tel"
          optional
        />
      </div>
    </>
  );
}

function CredentialsStep({
  state,
  update,
}: {
  state: FormState;
  update: (k: keyof FormState) => (v: string) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Credentials"
        title="Your medic firm + license."
        body="Workers you admit are tagged with this firm. Used on the daily report and incident logs."
      />
      <div className="space-y-6">
        <Field
          label="Medic firm"
          value={state.medic_firm}
          onChange={update("medic_firm")}
          placeholder="Aluma Safety / Falck / etc."
          autoFocus
        />
        <Field
          label="Medic license number"
          value={state.medic_license_number}
          onChange={update("medic_license_number")}
          placeholder="License # / registration #"
        />
      </div>
    </>
  );
}
