"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { addCredential } from "@/app/wallet/actions";
import { createClient } from "@/lib/supabase/client";
import {
  CREDENTIAL_TYPES,
  isCompanyOrientation,
  isOtherCredential,
} from "@/lib/credentials";
import { CredentialPicker } from "@/lib/credential-picker";

function randomKey() {
  return Math.random().toString(36).slice(2);
}

const initialState: { error?: string } = {};

type Prefill = {
  type?: string;
  issuer?: string;
  cert?: string;
  issue?: string;
  expiry?: string;
  holder?: string;
  verifyUrl?: string;
};

// Shared field styling matching the design's dark input boxes.
const fieldBoxStyle: React.CSSProperties = {
  height: 48,
  width: "100%",
  borderRadius: 9,
  background: "#15191e",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "0 14px",
  fontSize: 15,
  color: "#d6dce0",
  outline: "none",
};

export function AddCredentialForm({ prefill }: { prefill?: Prefill }) {
  const [state, action, pending] = useActionState(addCredential, initialState);
  const p = prefill ?? {};
  const [credType, setCredType] = useState<string>(p.type ?? "");
  const [customName, setCustomName] = useState<string>("");
  const isOrientation = isCompanyOrientation(credType);
  const isOther = isOtherCredential(credType);

  // What actually gets submitted as the credential type. For "Other", the
  // worker's typed name becomes the type (custom tickets are always
  // medic-verified — they can't auto-pass a gate). If the typed name matches a
  // catalog ticket, use the catalog value instead — typing "H2S Alive" should
  // be the same ticket as picking it, not a lookalike custom entry.
  const typedName = customName.trim();
  const catalogMatch = CREDENTIAL_TYPES.find(
    (c) =>
      !c.isOther &&
      (c.label.toLowerCase() === typedName.toLowerCase() ||
        c.value.toLowerCase() === typedName.toLowerCase()),
  );
  const submittedType = isOther
    ? catalogMatch?.value ?? typedName
    : credType;

  // Card photo capture — uploaded to the private "ticket-photos" bucket so the
  // medic can SEE the actual card at the gate (not just a "VALID" badge).
  const [cardPath, setCardPath] = useState<string | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [cardUploading, setCardUploading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  async function onCardFile(file: File) {
    setCardError(null);
    setCardPreview(URL.createObjectURL(file));
    setCardUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `self/${randomKey()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("ticket-photos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      setCardPath(path);
    } catch (e) {
      setCardError(`Couldn't upload the photo: ${(e as Error).message}`);
      setCardPreview(null);
      setCardPath(null);
    } finally {
      setCardUploading(false);
    }
  }

  return (
    <form
      // Dispatch the action manually: React 19 auto-resets a <form action>
      // after the action returns — a server-side validation error would wipe
      // everything the worker just typed. This keeps their input intact.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      style={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0 }}
    >
      {/* the selectable list drives this hidden value used by the server action;
          empty selection is validated server-side in addCredential */}
      <input type="hidden" name="credential_type" value={submittedType} />
      <input type="hidden" name="card_photo_path" value={cardPath ?? ""} />
      {p.verifyUrl && !isOrientation && (
        <input
          type="hidden"
          name="external_verification_url"
          value={p.verifyUrl}
        />
      )}

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "22px 24px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── STEP 2 · CREDENTIAL TYPE ── */}
        <StepHeader n={2} label="CREDENTIAL TYPE" />
        <div style={{ marginTop: 14 }}>
          <CredentialPicker
            value={credType}
            onChange={(v) => setCredType(v)}
            placeholder="Choose your ticket…"
          />
        </div>

        {/* Other → type the real ticket name */}
        {isOther && (
          <>
            <DetailField
              label="TICKET NAME"
              required
              hint="Type the exact name printed on the card. A medic will confirm it by eye at the gate — custom tickets are never auto-passed."
            >
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                type="text"
                required
                placeholder="e.g. Boom Truck Operator"
                style={fieldBoxStyle}
              />
            </DetailField>
          </>
        )}

        {/* ── ISSUER / CARD DETAILS ── */}
        {isOrientation ? (
          <>
            <div
              className="mono"
              style={{
                marginTop: 18,
                borderRadius: 9,
                border: "1px solid rgba(255,210,122,0.3)",
                background: "rgba(255,210,122,0.06)",
                padding: "10px 14px",
                fontSize: 10,
                lineHeight: 1.6,
                letterSpacing: "0.04em",
                color: "#ffd27a",
              }}
            >
              COMPANY ORIENTATIONS ARE ISSUED BY THE OPERATING COMPANY · NO
              EXTERNAL VERIFICATION NEEDED · JUST THE COMPANY NAME AND THE START
              / END DATES
            </div>

            <DetailField label="ISSUING COMPANY" required>
              <input
                id="issuer"
                name="issuer"
                type="text"
                required
                defaultValue={p.issuer ?? ""}
                placeholder="e.g. Tourmaline Oil Corp"
                style={fieldBoxStyle}
              />
            </DetailField>
          </>
        ) : (
          <>
            <DetailField label="ISSUER">
              <input
                id="issuer"
                name="issuer"
                type="text"
                defaultValue={p.issuer ?? ""}
                placeholder="e.g. Energy Safety Canada"
                style={fieldBoxStyle}
              />
            </DetailField>

            <DetailField label="CERTIFICATE NUMBER">
              <input
                id="certificate_number"
                name="certificate_number"
                type="text"
                defaultValue={p.cert ?? ""}
                placeholder="ESC-2024-118-44210"
                className="mono"
                style={{ ...fieldBoxStyle, fontSize: 14 }}
              />
            </DetailField>

            <DetailField
              label="VALIDATION CODE"
              hint="On Energy Safety Canada cards, this is the long code printed under the QR. Other cards may not have one — leave blank if so."
            >
              <input
                id="validation_code"
                name="validation_code"
                type="text"
                placeholder="R8LQ3-TVNJ7-9JXGZ-0YGQG"
                className="mono"
                style={{
                  ...fieldBoxStyle,
                  fontSize: 14,
                  letterSpacing: "0.1em",
                }}
              />
            </DetailField>

            <DetailField label="NAME ON THE CARD">
              <input
                id="holder_name"
                name="holder_name"
                type="text"
                defaultValue={p.holder ?? ""}
                placeholder="Full name on the ticket"
                style={fieldBoxStyle}
              />
            </DetailField>
          </>
        )}

        {/* ── STEP 1 · PHOTOGRAPH CARD (first + required; order:-1 floats it
            to the top of the flex column without reordering the DOM) ── */}
        <div style={{ order: -1 }}>
        <StepHeader n={1} active label="PHOTOGRAPH CARD" />
        <button
          type="button"
          onClick={() => cardInputRef.current?.click()}
          className="rw-pressable"
          style={{
            height: 120,
            width: "100%",
            borderRadius: 11,
            marginTop: 14,
            position: "relative",
            overflow: "hidden",
            border: cardPath
              ? "1.5px solid rgba(47,200,106,0.5)"
              : "1.5px dashed rgba(255,255,255,0.16)",
            background: cardPreview
              ? "#15191e"
              : "repeating-linear-gradient(135deg,rgba(255,255,255,0.015) 0 8px,transparent 8px 16px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {cardPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardPreview}
              alt="card"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              background: cardPreview ? "rgba(13,15,18,0.5)" : "transparent",
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke={cardPath ? "#7ff0a8" : "#6b747c"}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: cardPath ? "#7ff0a8" : "#6b747c",
              }}
            >
              {cardUploading
                ? "UPLOADING…"
                : cardPath
                  ? "CARD PHOTO ADDED ✓ · TAP TO RETAKE"
                  : "TAP TO CAPTURE THE PHYSICAL CARD"}
            </span>
          </div>
        </button>
        <input
          ref={cardInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onCardFile(f);
          }}
        />
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 1.5,
            color: "#6b747c",
          }}
        >
          Required. The medic has to see the actual card at the gate — snap a
          clear photo of the front before you fill in the rest.
        </div>
        {cardError && (
          <p
            className="mono"
            style={{
              marginTop: 8,
              fontSize: 11,
              letterSpacing: "0.04em",
              color: "#ff9a8f",
            }}
          >
            {cardError}
          </p>
        )}
        </div>

        {/* ── STEP 3 · CONFIRM DATES ── */}
        <StepHeader n={3} label="CONFIRM DATES" />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "#5d666f",
                marginBottom: 7,
              }}
            >
              ISSUED
            </div>
            <input
              id="issue_date"
              name="issue_date"
              type="date"
              required={isOrientation}
              defaultValue={p.issue ?? ""}
              className="mono"
              style={{ ...fieldBoxStyle, fontSize: 14, colorScheme: "dark" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "#5d666f",
                marginBottom: 7,
              }}
            >
              EXPIRES
            </div>
            <input
              id="expiry_date"
              name="expiry_date"
              type="date"
              required={isOrientation}
              defaultValue={p.expiry ?? ""}
              className="mono"
              style={{
                ...fieldBoxStyle,
                fontSize: 14,
                color: "#7ff0a8",
                colorScheme: "dark",
              }}
            />
          </div>
        </div>

        {state.error && (
          <p
            className="mono"
            style={{
              marginTop: 14,
              fontSize: 11,
              letterSpacing: "0.04em",
              color: "#ff9a8f",
            }}
          >
            {state.error}
          </p>
        )}
      </div>

      {/* ── footer · submit ── */}
      <div
        style={{
          padding: "14px 24px 22px",
          background: "linear-gradient(0deg,#0d0f12 60%,transparent)",
        }}
      >
        <button
          type="submit"
          disabled={pending || cardUploading || !cardPath || !submittedType}
          style={{
            height: 54,
            width: "100%",
            borderRadius: 9,
            background: "#f2581c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
            border: "none",
            cursor:
              pending || cardUploading || !cardPath || !submittedType
                ? "default"
                : "pointer",
            opacity:
              pending || cardUploading || !cardPath || !submittedType ? 0.6 : 1,
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 15, color: "#0d0f12" }}>
            {cardUploading
              ? "Photo uploading…"
              : !cardPath
                ? "Photograph the card first"
                : !submittedType
                  ? isOther
                    ? "Type the ticket name"
                    : "Choose your ticket"
                  : pending
                    ? "Adding…"
                    : "Add to wallet"}
          </span>
        </button>
        <div
          className="mono"
          style={{
            textAlign: "center",
            fontSize: 9,
            letterSpacing: "0.08em",
            color: "#5d666f",
            marginTop: 11,
          }}
        >
          YOU CONFIRM THESE DETAILS MATCH YOUR PHYSICAL TICKET
        </div>
      </div>
    </form>
  );
}

function StepHeader({
  n,
  label,
  active,
  optional,
}: {
  n: number;
  label: string;
  active?: boolean;
  optional?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        marginTop: n === 1 ? 0 : 24,
      }}
    >
      <div
        className="mono"
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: active ? "#f2581c" : "#2a2f35",
          color: active ? "#0d0f12" : "#9aa3ab",
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {n}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: active ? "#c4ccd2" : "#9aa3ab",
          fontWeight: 600,
        }}
      >
        {label}
        {optional && <span style={{ color: "#5d666f" }}> · OPTIONAL</span>}
      </div>
    </div>
  );
}

function DetailField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          color: "#5d666f",
          marginBottom: 7,
        }}
      >
        {label}
        {required && <span style={{ color: "#ef4135" }}> *</span>}
      </div>
      {children}
      {hint && (
        <div
          style={{
            marginTop: 7,
            fontSize: 12,
            lineHeight: 1.5,
            color: "#5d666f",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
