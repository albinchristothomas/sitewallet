"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CREDENTIAL_TYPES,
  getCredentialLabel,
  isOtherCredential,
} from "@/lib/credentials";
import { createWalkIn, type WalkInTicket } from "./actions";

type LocalTicket = {
  key: string;
  credential_type: string;
  custom_name: string;
  expiry_date: string;
  photo_path: string | null;
  previewUrl: string | null;
  uploading: boolean;
};

function newKey() {
  return Math.random().toString(36).slice(2);
}

// repeating diagonal hatch used for capture surfaces in the design
const HATCH =
  "repeating-linear-gradient(135deg,#232932 0 10px,#1b2027 10px 20px)";
const HATCH_SM =
  "repeating-linear-gradient(135deg,#232932 0 7px,#1b2027 7px 14px)";

const monoLabel: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
  fontSize: "9px",
  letterSpacing: "0.12em",
  color: "#5d666f",
  textTransform: "uppercase",
};

const fieldShell: React.CSSProperties = {
  height: "50px",
  borderRadius: "9px",
  background: "#15191e",
  border: "1px solid rgba(255,255,255,0.1)",
  display: "flex",
  alignItems: "center",
};

export function WalkInForm({ siteId }: { siteId: string }) {
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [employer, setEmployer] = useState("");

  const [facePath, setFacePath] = useState<string | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [faceUploading, setFaceUploading] = useState(false);

  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const faceInputRef = useRef<HTMLInputElement>(null);

  async function uploadTo(bucket: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${siteId}/${newKey()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw new Error(upErr.message);
    return path;
  }

  async function onFace(file: File) {
    setError(null);
    setFacePreview(URL.createObjectURL(file));
    setFaceUploading(true);
    try {
      const path = await uploadTo("faces", file);
      setFacePath(path);
    } catch (e) {
      setError(`Face photo upload failed: ${(e as Error).message}`);
      setFacePreview(null);
    } finally {
      setFaceUploading(false);
    }
  }

  function addTicket() {
    setTickets((t) => [
      ...t,
      {
        key: newKey(),
        credential_type: CREDENTIAL_TYPES[0].value,
        custom_name: "",
        expiry_date: "",
        photo_path: null,
        previewUrl: null,
        uploading: false,
      },
    ]);
  }

  function removeTicket(key: string) {
    setTickets((t) => t.filter((x) => x.key !== key));
  }

  function patchTicket(key: string, patch: Partial<LocalTicket>) {
    setTickets((t) => t.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  async function onTicketPhoto(key: string, file: File) {
    setError(null);
    patchTicket(key, { previewUrl: URL.createObjectURL(file), uploading: true });
    try {
      const path = await uploadTo("ticket-photos", file);
      patchTicket(key, { photo_path: path, uploading: false });
    } catch (e) {
      setError(`Ticket photo upload failed: ${(e as Error).message}`);
      patchTicket(key, { uploading: false, previewUrl: null });
    }
  }

  const anyUploading = faceUploading || tickets.some((t) => t.uploading);

  function submit() {
    if (!fullName.trim()) {
      setError("Enter the worker's name.");
      return;
    }
    if (anyUploading) {
      setError("Wait for photos to finish uploading.");
      return;
    }
    setError(null);
    const payloadTickets: WalkInTicket[] = tickets.map((t) => {
      const other = isOtherCredential(t.credential_type);
      const meta = CREDENTIAL_TYPES.find((c) => c.value === t.credential_type);
      return {
        // For "Other", the medic's typed name becomes the type.
        credential_type: other
          ? t.custom_name.trim() || "OTHER"
          : t.credential_type,
        issuer: other ? null : (meta?.issuer ?? null),
        photo_path: t.photo_path,
        expiry_date: t.expiry_date || null,
      };
    });
    startTransition(async () => {
      const res = await createWalkIn(siteId, {
        full_name: fullName,
        phone: phone || null,
        employer: employer || null,
        face_path: facePath,
        tickets: payloadTickets,
      });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
      {/* scrolling body */}
      <div
        style={{
          flex: 1,
          padding: "18px 22px 0",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* face capture (orange dashed) */}
        <button
          type="button"
          onClick={() => faceInputRef.current?.click()}
          className="rw-pressable"
          style={{
            height: "128px",
            borderRadius: "12px",
            position: "relative",
            overflow: "hidden",
            border: "1.5px solid rgba(242,88,28,0.4)",
            background: facePreview ? "#1b2027" : HATCH,
            padding: 0,
            width: "100%",
            cursor: "pointer",
            display: "block",
          }}
        >
          {facePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={facePreview}
              alt="face"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              background: facePreview ? "rgba(13,15,18,0.45)" : "transparent",
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f2581c"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="11" r="3.4" />
              <path d="M5 20c0-3.4 3.1-5 7-5s7 1.6 7 5" />
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            </svg>
            <span
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), ui-monospace, monospace",
                fontSize: "10px",
                letterSpacing: "0.12em",
                color: "#c4ccd2",
              }}
            >
              {faceUploading
                ? "UPLOADING…"
                : facePreview
                  ? "TAP TO RETAKE FACE"
                  : "TAP TO CAPTURE FACE"}
            </span>
          </div>
        </button>
        <input
          ref={faceInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFace(f);
          }}
        />

        {/* fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
          <div>
            <div style={{ ...monoLabel, marginBottom: "7px" }}>FULL NAME</div>
            <div style={{ ...fieldShell, padding: "0 15px" }}>
              <input
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dale Hutchins"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#eef1f3",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "11px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...monoLabel, marginBottom: "7px" }}>EMPLOYER</div>
              <div style={{ ...fieldShell, padding: "0 13px" }}>
                <input
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  placeholder="Borealis Vac"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#eef1f3",
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...monoLabel, marginBottom: "7px" }}>PHONE</div>
              <div style={{ ...fieldShell, padding: "0 13px" }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="780·555·0148"
                  className="mono"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: "13px",
                    color: "#d6dce0",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* cards */}
        <div>
          <div style={{ ...monoLabel, marginBottom: "10px" }}>
            PHOTOGRAPH EACH SAFETY CARD
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {tickets.map((t) => (
              <TicketTile
                key={t.key}
                ticket={t}
                onPickType={(v) => patchTicket(t.key, { credential_type: v })}
                onCustomName={(v) => patchTicket(t.key, { custom_name: v })}
                onPhoto={(f) => onTicketPhoto(t.key, f)}
                onExpiry={(v) => patchTicket(t.key, { expiry_date: v })}
                onRemove={() => removeTicket(t.key)}
              />
            ))}

            {/* add tile */}
            <button
              type="button"
              onClick={addTicket}
              className="rw-pressable"
              style={{
                flex: "1 1 90px",
                minWidth: "90px",
                height: "74px",
                borderRadius: "9px",
                border: "1.5px dashed rgba(255,255,255,0.18)",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Add safety card"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f2581c"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              borderRadius: "9px",
              border: "1px solid rgba(239,65,53,0.4)",
              background: "rgba(239,65,53,0.1)",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#ff9a8f",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* sticky footer CTA */}
      <div
        style={{
          padding: "14px 22px 22px",
          background: "linear-gradient(0deg,#0d0f12 60%,transparent)",
        }}
      >
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rw-pressable"
          style={{
            width: "100%",
            height: "54px",
            borderRadius: "9px",
            background: "#f2581c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
            boxShadow: "0 8px 20px -8px rgba(242,88,28,0.6)",
            border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          <span style={{ fontWeight: 800, fontSize: "15px", color: "#0d0f12" }}>
            {pending ? "Saving…" : "Save & verify"}
          </span>
          {!pending && (
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0d0f12"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function TicketTile({
  ticket,
  onPickType,
  onCustomName,
  onPhoto,
  onExpiry,
  onRemove,
}: {
  ticket: LocalTicket;
  onPickType: (v: string) => void;
  onCustomName: (v: string) => void;
  onPhoto: (f: File) => void;
  onExpiry: (v: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isOther = isOtherCredential(ticket.credential_type);
  const shortLabel = (
    isOther && ticket.custom_name.trim()
      ? ticket.custom_name
      : getCredentialLabel(ticket.credential_type)
  )
    .replace(/\(.*\)/, "")
    .trim();

  return (
    <div style={{ flex: "1 1 90px", minWidth: "90px" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rw-pressable"
        style={{
          width: "100%",
          height: "74px",
          borderRadius: "9px",
          background: ticket.previewUrl ? "#1b2027" : HATCH_SM,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset",
          display: "flex",
          alignItems: "flex-end",
          padding: "7px",
          position: "relative",
          overflow: "hidden",
          border: "none",
          cursor: "pointer",
        }}
      >
        {ticket.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ticket.previewUrl}
            alt="card"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
        <span
          style={{
            position: "relative",
            fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
            fontSize: "8px",
            color: ticket.photo_path ? "#7ff0a8" : "#c4ccd2",
            textShadow: ticket.previewUrl ? "0 1px 3px rgba(0,0,0,0.8)" : "none",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {shortLabel} {ticket.photo_path ? "✓" : ticket.uploading ? "…" : ""}
        </span>
      </button>

      {open && (
        <div
          style={{
            marginTop: "8px",
            borderRadius: "9px",
            background: "#15191e",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <select
            value={ticket.credential_type}
            onChange={(e) => onPickType(e.target.value)}
            className="mono"
            style={{
              width: "100%",
              height: "34px",
              borderRadius: "7px",
              background: "#0d0f12",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#eef1f3",
              fontSize: "11px",
              padding: "0 8px",
              outline: "none",
            }}
          >
            {CREDENTIAL_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {isOther && (
            <input
              value={ticket.custom_name}
              onChange={(e) => onCustomName(e.target.value)}
              placeholder="Type ticket name"
              autoFocus
              style={{
                width: "100%",
                height: "34px",
                borderRadius: "7px",
                background: "#0d0f12",
                border: "1px solid rgba(255,178,122,0.45)",
                color: "#ffd9bd",
                fontSize: "11px",
                padding: "0 8px",
                outline: "none",
              }}
            />
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mono rw-pressable"
            style={{
              width: "100%",
              height: "34px",
              borderRadius: "7px",
              background: "#0d0f12",
              border: "1px solid rgba(255,255,255,0.12)",
              color: ticket.photo_path ? "#7ff0a8" : "#c4ccd2",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {ticket.uploading
              ? "Uploading…"
              : ticket.photo_path
                ? "Photo attached ✓"
                : "Snap card"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPhoto(f);
            }}
          />

          <div>
            <div style={{ ...monoLabel, marginBottom: "5px" }}>
              EXPIRY (OPTIONAL)
            </div>
            <input
              type="date"
              value={ticket.expiry_date}
              onChange={(e) => onExpiry(e.target.value)}
              className="mono"
              style={{
                width: "100%",
                height: "34px",
                borderRadius: "7px",
                background: "#0d0f12",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#d6dce0",
                fontSize: "11px",
                padding: "0 8px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="mono rw-pressable"
            style={{
              width: "100%",
              height: "30px",
              borderRadius: "7px",
              background: "transparent",
              border: "1px solid rgba(239,65,53,0.4)",
              color: "#ef4135",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
