"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Plus, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/lib/atoms";
import { CREDENTIAL_TYPES } from "@/lib/credentials";
import { createWalkIn, type WalkInTicket } from "./actions";

type LocalTicket = {
  key: string;
  credential_type: string;
  expiry_date: string;
  photo_path: string | null;
  previewUrl: string | null;
  uploading: boolean;
};

function newKey() {
  return Math.random().toString(36).slice(2);
}

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

  const anyUploading =
    faceUploading || tickets.some((t) => t.uploading);

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
      const meta = CREDENTIAL_TYPES.find((c) => c.value === t.credential_type);
      return {
        credential_type: t.credential_type,
        issuer: meta?.issuer ?? null,
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
    <div className="space-y-6">
      {/* Face */}
      <section>
        <div className="mono mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-dim)]">
          Worker's face
        </div>
        <button
          type="button"
          onClick={() => faceInputRef.current?.click()}
          className="rw-pressable flex w-full items-center gap-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-1)] p-4 text-left hover:border-[color:var(--line-strong)]"
        >
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--text-faint)]"
          >
            {facePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={facePreview}
                alt="face"
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera size={26} strokeWidth={1.6} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[color:var(--text)]">
              {facePreview ? "Retake photo" : "Take a photo"}
            </div>
            <div className="mt-0.5 text-[12px] text-[color:var(--text-faint)]">
              {faceUploading
                ? "Uploading…"
                : "This is the face you'll match at the gate."}
            </div>
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
      </section>

      {/* Identity */}
      <section className="space-y-4">
        <Field
          label="Full name"
          value={fullName}
          onChange={setFullName}
          placeholder="Albin Christo Thomas"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Employer"
            value={employer}
            onChange={setEmployer}
            placeholder="Trican Well Service"
          />
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="403-555-0123"
            type="tel"
          />
        </div>
      </section>

      {/* Tickets */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-dim)]">
            Safety tickets ({tickets.length})
          </div>
          <button
            type="button"
            onClick={addTicket}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[color:var(--brand)] hover:underline"
          >
            <Plus size={14} strokeWidth={2} /> Add ticket
          </button>
        </div>

        {tickets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[color:var(--line)] px-3 py-4 text-center text-[12.5px] text-[color:var(--text-faint)]">
            No tickets yet. Add each card the worker shows you and snap a photo —
            you'll verify them on the next screen.
          </p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li
                key={t.key}
                className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-1)] p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={t.credential_type}
                    onChange={(e) =>
                      patchTicket(t.key, { credential_type: e.target.value })
                    }
                    className="h-10 flex-1 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2.5 text-[13.5px] text-[color:var(--text)] focus:border-[color:var(--brand)] focus:outline-none"
                  >
                    {CREDENTIAL_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeTicket(t.key)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--line)] text-[color:var(--text-faint)] hover:border-[color:var(--bad)] hover:text-[color:var(--bad)]"
                    aria-label="Remove ticket"
                  >
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className="rw-pressable flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-2)] text-[color:var(--text-faint)]">
                    {t.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.previewUrl}
                        alt="ticket"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera size={20} strokeWidth={1.6} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onTicketPhoto(t.key, f);
                      }}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <div className="mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-faint)]">
                      Expiry (optional)
                    </div>
                    <input
                      type="date"
                      value={t.expiry_date}
                      onChange={(e) =>
                        patchTicket(t.key, { expiry_date: e.target.value })
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-2)] px-2.5 text-[13px] text-[color:var(--text)] focus:border-[color:var(--brand)] focus:outline-none"
                    />
                    <div className="mt-1 text-[11px] text-[color:var(--text-faint)]">
                      {t.uploading
                        ? "Uploading photo…"
                        : t.photo_path
                          ? "Photo attached"
                          : "Snap the card (optional)"}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <div className="rounded-lg border border-[color:var(--bad-line)] bg-[color:var(--bad-bg)] px-3.5 py-2.5 text-[13px] text-[#FCA5A5]">
          {error}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={submit}
        loading={pending}
        iconLeft={!pending ? <UserPlus size={17} strokeWidth={2} /> : undefined}
      >
        {pending ? "Creating…" : "Create & review"}
      </Button>
      <p className="text-center text-[11.5px] text-[color:var(--text-faint)]">
        Next you'll confirm their tickets and admit them.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-dim)]">
        {label}
      </span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="mt-1.5 h-11 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-1)] px-3 text-[14px] text-[color:var(--text)] placeholder:text-[color:var(--text-faint)] focus:border-[color:var(--brand)] focus:outline-none"
      />
    </label>
  );
}
