"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { BrandWordmark } from "@/lib/atoms";
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

/* ============================================================
   Inline icons (match the design block's stroke SVGs exactly)
   ============================================================ */

function ArrowIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0d0f12"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0d0f12"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ChevronLeft({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9aa3ab"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

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
    <div className="w-full max-w-[420px]">
      {/* Dark steel panel — RigWise system surface on the dark bg */}
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          background:
            "linear-gradient(152deg,#222831 0%,#191d23 52%,#14171c 100%)",
          boxShadow:
            "0 30px 60px -20px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.07)",
        }}
      >
        {/* Faint guilloché sheen across the steel face */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.35,
            backgroundImage:
              "conic-gradient(from 30deg at 50% 25%, rgba(255,255,255,0.04), transparent 40%, rgba(255,255,255,0.03) 70%, transparent 100%)",
          }}
        />
        {/* Orange safety spine */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: "#f2581c",
          }}
        />

        <div style={{ position: "relative", padding: "30px 28px" }}>
          {/* Brand bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 26,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  background: "#f2581c",
                  borderRadius: 5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 13, height: 13, background: "#0d0f12" }} />
              </div>
              <BrandWordmark
                className="text-[22px] tracking-[-0.01em] text-[#eef1f3]"
                highlightClassName="text-[#8b949c] font-semibold"
              />
            </div>
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.16em",
                color: "#5d666f",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {accountType === "WORKER" ? "Worker setup" : "Medic setup"}
            </div>
          </div>

          {step !== "intro" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 22,
              }}
            >
              <button
                onClick={onBack}
                disabled={pending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#9aa3ab",
                  background: "transparent",
                  border: "none",
                  cursor: pending ? "default" : "pointer",
                }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: "#5d666f",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
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
            <div
              style={{
                marginTop: 20,
                borderRadius: 8,
                background: "rgba(239,65,53,0.12)",
                border: "1px solid rgba(239,65,53,0.5)",
                padding: "11px 14px",
                fontSize: 13,
                color: "#ff9a8f",
              }}
            >
              {error}
            </div>
          )}

          {/* Primary action — orange button identical to the LOGIN block */}
          <button
            onClick={onNext}
            disabled={pending}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 8,
              background: "#f2581c",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              marginTop: 24,
              boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? (
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 15,
                  color: "#0d0f12",
                  letterSpacing: "0.01em",
                }}
              >
                Saving…
              </span>
            ) : isLast ? (
              <>
                <CheckIcon />
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#0d0f12",
                    letterSpacing: "0.01em",
                  }}
                >
                  Complete setup
                </span>
              </>
            ) : (
              <>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#0d0f12",
                    letterSpacing: "0.01em",
                  }}
                >
                  {step === "intro" ? "Get started" : "Continue"}
                </span>
                <ArrowIcon />
              </>
            )}
          </button>
        </div>

        {/* Encoded-serial footer — VOID IF SHARED treatment */}
        <div
          className="mono"
          style={{
            position: "relative",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "12px 28px",
            fontSize: 9,
            letterSpacing: "0.1em",
            lineHeight: 1.7,
            color: "#5d666f",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          RigWise ·{" "}
          {accountType === "WORKER"
            ? "Worker enrollment"
            : "Medic enrollment"}{" "}
          · {new Date().getFullYear()}
        </div>
      </div>

      <p
        className="mono"
        style={{
          marginTop: 16,
          padding: "0 4px",
          textAlign: "center",
          fontSize: 9,
          letterSpacing: "0.08em",
          lineHeight: 1.7,
          color: "#5d666f",
          textTransform: "uppercase",
        }}
      >
        Stored against this account only · Travels with you between sites
      </p>
    </div>
  );
}

/* ============================================================
   STEP CONTENTS — dark steel system, mono labels, steel inputs
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
    <header style={{ marginBottom: 26 }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.16em",
          color: "#f2581c",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          marginTop: 10,
          fontSize: 30,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: "#f4f6f7",
        }}
      >
        {title}
      </h1>
      {body && (
        <p
          className="mono"
          style={{
            marginTop: 12,
            fontSize: 11,
            lineHeight: 1.6,
            letterSpacing: "0.03em",
            color: "#9aa3ab",
          }}
        >
          {body}
        </p>
      )}
    </header>
  );
}

const STEEL_INPUT: CSSProperties = {
  width: "100%",
  height: 54,
  borderRadius: 8,
  background: "#15191e",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "0 16px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  color: "#d6dce0",
  outline: "none",
};

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
    <label style={{ display: "block" }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: "#5d666f",
          textTransform: "uppercase",
          marginBottom: 9,
        }}
      >
        {label}
        {optional && <span style={{ color: "#3a3f45" }}> (optional)</span>}
      </div>
      {multiline ? (
        <textarea
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            ...STEEL_INPUT,
            height: "auto",
            padding: "12px 16px",
            resize: "none",
            lineHeight: 1.5,
          }}
        />
      ) : (
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          style={STEEL_INPUT}
        />
      )}
      {hint && (
        <p
          className="mono"
          style={{
            marginTop: 8,
            fontSize: 9,
            letterSpacing: "0.06em",
            lineHeight: 1.6,
            color: "#5d666f",
          }}
        >
          {hint}
        </p>
      )}
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
  const checklist =
    accountType === "WORKER"
      ? ["Your name", "Company you work for", "Site you're going to"]
      : ["Name + phone", "Medic firm + license"];

  return (
    <>
      <StepHeader
        eyebrow={
          accountType === "WORKER" ? "Worker enrollment" : "Medic enrollment"
        }
        title={
          accountType === "WORKER"
            ? "Set up your wallet."
            : "Set up your station."
        }
        body={
          accountType === "WORKER"
            ? "We need a few details once. After that, every gate you walk up to pulls the same data — no paper forms, no re-typing."
            : "We need a few details once so workers admitted under you are traceable to the right firm and license."
        }
      />

      {/* Signed-in chip — steel inset, like the WORK EMAIL field */}
      <div
        style={{
          borderRadius: 8,
          background: "#15191e",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "12px 16px",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "#5d666f",
            textTransform: "uppercase",
          }}
        >
          Signed in as
        </div>
        <div
          className="mono"
          style={{
            marginTop: 6,
            fontSize: 14,
            color: "#d6dce0",
          }}
        >
          {email}
        </div>
      </div>

      <ul style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 11 }}>
        {checklist.map((s, i) => (
          <li
            key={s}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <span
              className="mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#f2581c",
                minWidth: 18,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span style={{ fontSize: 14, color: "#c4ccd2" }}>{s}</span>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
