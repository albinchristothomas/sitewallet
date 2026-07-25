"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import {
  addCredential,
  addCredentialsBatch,
  type BatchTicket,
} from "@/app/wallet/actions";
import { createClient } from "@/lib/supabase/client";
import { compressImage, cropImage, type CropBox } from "@/lib/image";
import { ProgressBar } from "@/lib/progress-bar";
import {
  CREDENTIAL_TYPES,
  getCredentialLabel,
  isCompanyOrientation,
  isOtherCredential,
} from "@/lib/credentials";
import { CredentialPicker } from "@/lib/credential-picker";
import { DateField } from "@/lib/date-field";

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

// What the AI scan returns per detected card.
type ScannedTicket = {
  catalog_value: string | null;
  custom_name: string | null;
  holder_name: string | null;
  issuer: string | null;
  certificate_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  confidence: "high" | "medium" | "low";
  bbox: CropBox | null;
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

export function AddCredentialForm({
  prefill,
  existingTypes = [],
}: {
  prefill?: Prefill;
  existingTypes?: string[];
}) {
  const [state, action, pending] = useActionState(addCredential, initialState);
  const p = prefill ?? {};
  const [credType, setCredType] = useState<string>(p.type ?? "");
  const [customName, setCustomName] = useState<string>("");

  // Detail fields are controlled so the AI scan can fill them in.
  const [issuer, setIssuer] = useState<string>(p.issuer ?? "");
  const [certNumber, setCertNumber] = useState<string>(p.cert ?? "");
  const [holderName, setHolderName] = useState<string>(p.holder ?? "");
  const [issueDate, setIssueDate] = useState<string>(p.issue ?? "");
  const [expiryDate, setExpiryDate] = useState<string>(p.expiry ?? "");

  const isOrientation = isCompanyOrientation(credType);
  const isOther = isOtherCredential(credType);

  // For "Other", the worker's typed name becomes the type (custom tickets are
  // always medic-verified — they can't auto-pass a gate). If the typed name
  // matches a catalog ticket, use the catalog value instead.
  const typedName = customName.trim();
  const catalogMatch = CREDENTIAL_TYPES.find(
    (c) =>
      !c.isOther &&
      (c.label.toLowerCase() === typedName.toLowerCase() ||
        c.value.toLowerCase() === typedName.toLowerCase()),
  );
  const submittedType = isOther ? catalogMatch?.value ?? typedName : credType;

  // Card photo capture — uploaded to the private "ticket-photos" bucket so the
  // medic can SEE the actual card at the gate.
  const [cardPath, setCardPath] = useState<string | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [cardUploading, setCardUploading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);
  // The compressed photo stays in memory so multi-card batches can crop each
  // card's own rectangle out of it before upload.
  const cardBlobRef = useRef<Blob | null>(null);

  // AI scan state: after upload, Claude reads the photo and extracts every
  // ticket it can see. One card → autofill the form. Several cards (a wallet
  // page) → a pick-list, added in one tap via the batch action.
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<ScannedTicket[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [batchPending, setBatchPending] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Second input WITHOUT capture= so it opens the gallery/file picker —
  // workers often already have ticket photos in WhatsApp or their gallery.
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // "Validation code" is jargon most workers don't have — keep it tucked away.
  const [showMore, setShowMore] = useState(false);

  const inWallet = (t: ScannedTicket): boolean => {
    if (t.catalog_value) return existingTypes.includes(t.catalog_value);
    const name = (t.custom_name ?? "").trim().toLowerCase();
    return name.length > 0 &&
      existingTypes.some((e) => e.trim().toLowerCase() === name);
  };

  const ticketLabel = (t: ScannedTicket): string =>
    t.catalog_value
      ? getCredentialLabel(t.catalog_value)
      : (t.custom_name ?? "Unknown ticket");

  // Push one scanned ticket into the form fields for review.
  function applyToForm(t: ScannedTicket) {
    setCredType(t.catalog_value ?? "OTHER");
    setCustomName(t.catalog_value ? "" : (t.custom_name ?? ""));
    if (t.issuer) setIssuer(t.issuer);
    if (t.certificate_number) setCertNumber(t.certificate_number);
    if (t.holder_name) setHolderName(t.holder_name);
    if (t.issue_date) setIssueDate(t.issue_date);
    if (t.expiry_date) setExpiryDate(t.expiry_date);
  }

  async function onCardFile(file: File) {
    setCardError(null);
    setScanned([]);
    setScanNote(null);
    setCardPreview(URL.createObjectURL(file));
    setCardUploading(true);
    let path: string | null = null;
    try {
      const supabase = createClient();
      const blob = await compressImage(file, 1600); // ~200-400KB JPEG
      cardBlobRef.current = blob;
      path = `self/${randomKey()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("ticket-photos")
        .upload(path, blob, { upsert: false, contentType: "image/jpeg" });
      if (upErr) throw new Error(upErr.message);
      setCardPath(path);
    } catch (e) {
      setCardError(`Couldn't upload the photo: ${(e as Error).message}`);
      setCardPreview(null);
      setCardPath(null);
      setCardUploading(false);
      return;
    }
    setCardUploading(false);

    // Read the card(s) with AI. Any failure quietly falls back to manual
    // entry — but say WHICH failure, so "the key isn't configured" doesn't
    // masquerade as "your photo was unreadable".
    setScanning(true);
    try {
      const res = await fetch("/api/extract-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (res.status === 503) {
        setScanNote(
          "Auto-read isn't switched on yet (setup pending) — fill in the details below.",
        );
        return;
      }
      const data = res.ok ? await res.json() : { tickets: [], error: "http" };
      const tickets: ScannedTicket[] = data.tickets ?? [];
      if (tickets.length === 1) {
        applyToForm(tickets[0]);
        setScanNote(
          inWallet(tickets[0])
            ? "Heads up — this ticket looks like it's already in your wallet."
            : "Details read from your photo — check them and save.",
        );
      } else if (tickets.length > 1) {
        setScanned(tickets);
        setSelected(
          new Set(tickets.map((t, i) => (inWallet(t) ? -1 : i)).filter((i) => i >= 0)),
        );
      } else if (data.error) {
        setScanNote(
          "The scan hit a problem — fill in the details below and try again later.",
        );
      } else {
        setScanNote(
          "Couldn't make out a ticket in that photo — try a closer, straighter shot, or fill in below.",
        );
      }
    } catch {
      setScanNote("The scan hit a problem — fill in the details below.");
    } finally {
      setScanning(false);
    }
  }

  async function submitBatch() {
    if (!cardPath || selected.size === 0) return;
    setBatchError(null);
    setBatchPending(true);

    // Each card gets its OWN cropped picture cut from the wallet-page photo
    // (when the AI located its rectangle). Fallback: the full photo.
    const supabase = createClient();
    const chosen = [...selected].map((i) => scanned[i]).filter(Boolean);
    const tickets: BatchTicket[] = [];
    for (const t of chosen) {
      let photoPath: string | null = null;
      if (t.bbox && cardBlobRef.current) {
        try {
          const crop = await cropImage(cardBlobRef.current, t.bbox);
          if (crop) {
            const p = `self/${randomKey()}.jpg`;
            const { error: upErr } = await supabase.storage
              .from("ticket-photos")
              .upload(p, crop, { upsert: false, contentType: "image/jpeg" });
            if (!upErr) photoPath = p;
          }
        } catch {
          // fall through to the shared full photo
        }
      }
      tickets.push({
        credential_type: t.catalog_value ?? (t.custom_name ?? "").trim(),
        issuer: t.issuer,
        certificate_number: t.certificate_number,
        holder_name: t.holder_name,
        issue_date: t.issue_date,
        expiry_date: t.expiry_date,
        photo_path: photoPath,
      });
    }

    startTransition(async () => {
      const res = await addCredentialsBatch(tickets, cardPath);
      if (res?.error) {
        setBatchError(res.error);
        setBatchPending(false);
      }
      // On success the action redirects to /wallet.
    });
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
        {/* ── STEP 1 · PHOTOGRAPH CARD (first + required) ── */}
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
                  : scanning
                    ? "READING YOUR CARD…"
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
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCardFile(f);
              e.target.value = "";
            }}
          />

          {/* two clear paths: take a photo now, or use one you already have */}
          <div style={{ display: "flex", gap: 9, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => cardInputRef.current?.click()}
              className="mono rw-pressable"
              style={{
                flex: 1,
                height: 46,
                borderRadius: 9,
                background: "#15191e",
                border: "1px solid rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#eef1f3",
                cursor: "pointer",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f2581c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              SNAP WITH CAMERA
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="mono rw-pressable"
              style={{
                flex: 1,
                height: 46,
                borderRadius: 9,
                background: "#15191e",
                border: "1px solid rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#eef1f3",
                cursor: "pointer",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f2581c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              UPLOAD A PHOTO
            </button>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              lineHeight: 1.5,
              color: "#6b747c",
            }}
          >
            Required. Snap the card now, or upload a photo you already have —
            the details below fill in automatically. Several cards in one photo
            works too.
          </div>
          <ProgressBar
            active={cardUploading || scanning}
            label={cardUploading ? "UPLOADING PHOTO" : "READING YOUR CARD"}
          />
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
          {scanNote && (
            <div
              className="mono"
              style={{
                marginTop: 10,
                borderRadius: 9,
                border: "1px solid rgba(47,200,106,0.4)",
                background: "rgba(47,200,106,0.08)",
                padding: "9px 12px",
                fontSize: 10,
                letterSpacing: "0.06em",
                lineHeight: 1.6,
                color: "#7ff0a8",
              }}
            >
              {scanNote.toUpperCase()}
            </div>
          )}

          {/* Several tickets detected in one photo → pick and add in one tap */}
          {scanned.length > 1 && (
            <div
              style={{
                marginTop: 12,
                borderRadius: 11,
                border: "1px solid rgba(242,88,28,0.4)",
                background: "rgba(242,88,28,0.06)",
                padding: "12px 13px",
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#f2581c",
                  marginBottom: 10,
                }}
              >
                FOUND {scanned.length} TICKETS IN THIS PHOTO
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {scanned.map((t, i) => {
                  const already = inWallet(t);
                  const checked = selected.has(i);
                  return (
                    <label
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        borderRadius: 9,
                        background: "#15191e",
                        border: checked
                          ? "1px solid rgba(242,88,28,0.6)"
                          : "1px solid rgba(255,255,255,0.1)",
                        padding: "9px 12px",
                        cursor: "pointer",
                        opacity: already && !checked ? 0.6 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelected((s) => {
                            const n = new Set(s);
                            if (n.has(i)) n.delete(i);
                            else n.add(i);
                            return n;
                          })
                        }
                        style={{
                          width: 17,
                          height: 17,
                          accentColor: "#f2581c",
                          flex: "none",
                        }}
                      />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            display: "block",
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#eef1f3",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ticketLabel(t)}
                        </span>
                        <span
                          className="mono"
                          style={{
                            display: "block",
                            fontSize: 9,
                            letterSpacing: "0.06em",
                            color: "#7a838b",
                            marginTop: 2,
                          }}
                        >
                          {t.expiry_date
                            ? `EXPIRES ${t.expiry_date}`
                            : "NO EXPIRY READ"}
                        </span>
                      </span>
                      {already && (
                        <span
                          className="mono"
                          style={{
                            flex: "none",
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: "#ffd27a",
                            background: "rgba(242,164,12,0.14)",
                            borderRadius: 999,
                            padding: "2px 7px",
                          }}
                        >
                          IN WALLET
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={batchPending || selected.size === 0 || !cardPath}
                onClick={submitBatch}
                className="rw-pressable"
                style={{
                  marginTop: 11,
                  height: 46,
                  width: "100%",
                  borderRadius: 9,
                  background: "#f2581c",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#0d0f12",
                  cursor:
                    batchPending || selected.size === 0 ? "default" : "pointer",
                  opacity: batchPending || selected.size === 0 ? 0.6 : 1,
                }}
              >
                {batchPending
                  ? "Adding…"
                  : `Add ${selected.size} ticket${selected.size === 1 ? "" : "s"} to wallet`}
              </button>
              <ProgressBar
                active={batchPending}
                label={`ADDING ${selected.size} TICKET${selected.size === 1 ? "" : "S"} TO YOUR WALLET`}
              />
              {batchError && (
                <p
                  className="mono"
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: "#ff9a8f",
                  }}
                >
                  {batchError}
                </p>
              )}
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "#6b747c",
                }}
              >
                Or untick everything and fill the form below to add one at a
                time.
              </div>
            </div>
          )}
        </div>

        {/* ── STEP 2 · WHICH TICKET ── */}
        <StepHeader n={2} label="WHICH TICKET" />
        <div style={{ marginTop: 14 }}>
          <CredentialPicker
            value={credType}
            onChange={(v) => setCredType(v)}
            placeholder="Choose your ticket…"
          />
        </div>

        {/* Other → type the real ticket name */}
        {isOther && (
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
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. Tourmaline Oil Corp"
                style={fieldBoxStyle}
              />
            </DetailField>
          </>
        ) : (
          <>
            <DetailField
              label="WHO GAVE THE TRAINING"
              hint="The company on the card — e.g. Energy Safety Canada, Trican, Red Cross."
            >
              <input
                id="issuer"
                name="issuer"
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. Energy Safety Canada"
                style={fieldBoxStyle}
              />
            </DetailField>

            <DetailField label="CERT NUMBER (IF PRINTED ON THE CARD)">
              <input
                id="certificate_number"
                name="certificate_number"
                type="text"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                placeholder="ESC-2024-118-44210"
                className="mono"
                style={{ ...fieldBoxStyle, fontSize: 14 }}
              />
            </DetailField>

            <DetailField label="NAME ON THE CARD">
              <input
                id="holder_name"
                name="holder_name"
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Full name on the ticket"
                style={fieldBoxStyle}
              />
            </DetailField>

            {/* jargon lives behind a toggle — most workers never need it */}
            {!showMore ? (
              <button
                type="button"
                onClick={() => setShowMore(true)}
                className="mono"
                style={{
                  marginTop: 14,
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "#6b747c",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                + MORE DETAILS (OPTIONAL)
              </button>
            ) : (
              <DetailField
                label="VALIDATION CODE"
                hint="Only on some cards — the long code printed under the QR. Leave blank if you don't see one."
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
            )}
          </>
        )}

        {/* ── STEP 3 · DATES ON THE CARD (typed, not a calendar widget —
            copying "29 03 2027" off a card is 6 keystrokes) ── */}
        <StepHeader n={3} label="DATES ON THE CARD" />
        <input type="hidden" name="issue_date" value={issueDate} />
        <input type="hidden" name="expiry_date" value={expiryDate} />
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
            EXPIRES{!isOther && <span style={{ color: "#ef4135" }}> *</span>}
            <span style={{ color: "#3a3f45" }}>
              {"  "}· TYPE IT LIKE ON THE CARD
            </span>
          </div>
          <DateField
            value={expiryDate}
            onChange={setExpiryDate}
            accentColor="#7ff0a8"
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <div
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.12em",
              color: "#5d666f",
              marginBottom: 7,
            }}
          >
            ISSUED / COMPLETED
            {isOrientation ? (
              <span style={{ color: "#ef4135" }}> *</span>
            ) : (
              <span style={{ color: "#3a3f45" }}> · OPTIONAL</span>
            )}
          </div>
          <DateField value={issueDate} onChange={setIssueDate} />
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
        {(() => {
          const expiryMissing = !isOther && !expiryDate;
          const issuedMissing = isOrientation && !issueDate;
          const blocked =
            pending ||
            cardUploading ||
            !cardPath ||
            !submittedType ||
            expiryMissing ||
            issuedMissing;
          return (
            <button
              type="submit"
              disabled={blocked}
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
                cursor: blocked ? "default" : "pointer",
                opacity: blocked ? 0.6 : 1,
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
                      : expiryMissing
                        ? "Type the expiry date"
                        : issuedMissing
                          ? "Type the start date"
                          : pending
                            ? "Adding…"
                            : "Add to wallet"}
              </span>
            </button>
          );
        })()}
        <ProgressBar active={pending} label="ADDING TO YOUR WALLET" />
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
