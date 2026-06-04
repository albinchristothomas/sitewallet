"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Image as ImageIcon, AlertCircle } from "lucide-react";
import { parseTicketText, type ParsedTicket } from "@/lib/ocr-parser";

type Phase = "idle" | "reading" | "parsed" | "error";

export function ScanForm({ holderName }: { holderName: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTicket | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setPhase("reading");
    setProgress(0);

    // Show a preview from the file
    const reader = new FileReader();
    reader.onload = (e) => setPreview(String(e.target?.result ?? ""));
    reader.readAsDataURL(file);

    try {
      // Resize for OCR performance
      const resized = await resizeImage(file, 1200);
      const { default: Tesseract } = await import("tesseract.js");
      const result = await Tesseract.recognize(resized, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const text = result.data.text;
      const p = parseTicketText(text, holderName);
      setParsed(p);
      setPhase("parsed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed. Try a clearer photo.");
      setPhase("error");
    }
  }

  function useResults() {
    if (!parsed) return;
    const params = new URLSearchParams();
    if (parsed.credentialKey) params.set("type", parsed.credentialKey);
    if (parsed.issuer) params.set("issuer", parsed.issuer);
    if (parsed.certificateNumber) params.set("cert", parsed.certificateNumber);
    if (parsed.issueDate) params.set("issue", parsed.issueDate);
    if (parsed.expiryDate) params.set("expiry", parsed.expiryDate);
    if (parsed.holderName) params.set("holder", parsed.holderName);
    router.push(`/wallet/credentials/new?${params.toString()}`);
  }

  return (
    <div className="mt-3 flex flex-1 flex-col gap-3">
      {phase === "idle" && (
        <div className="flex flex-1 flex-col gap-3">
          <div className="rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-5">
            <div className="text-[15px] font-bold leading-tight">
              Scan a paper ticket
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-dim)]">
              Take a clear photo of the front of your safety card. We&rsquo;ll
              read it and auto-fill the credential type, issuer, dates, and
              cert number.
            </p>
            <p className="mt-2 text-[11px] text-[color:var(--text-faint)]">
              We recognize H2S Alive, First Aid, CSO, OSSA, Ground Disturbance,
              WHMIS, Fall Protection, Confined Space, TDG, and more.
            </p>
          </div>

          <button
            onClick={() => cameraRef.current?.click()}
            className="flex h-16 w-full items-center justify-center gap-2.5 rounded-xl bg-[color:var(--hi-yellow)] text-[15px] font-bold text-[color:var(--ink-1)] active:scale-[0.98]"
          >
            <Camera size={20} strokeWidth={1.75} /> Take photo of ticket
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] text-[14px] font-semibold text-[color:var(--text)] active:scale-[0.98]"
          >
            <ImageIcon size={18} strokeWidth={1.75} /> Choose from gallery
          </button>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {phase === "reading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          {preview && (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--hair)]">
              <img
                src={preview}
                alt="Scanning preview"
                className="max-h-[280px] w-full object-contain bg-black"
              />
            </div>
          )}
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between text-[12px] font-mono text-[color:var(--text-dim)]">
              <span>Reading ticket…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--ink-2)]">
              <div
                className="h-full bg-[color:var(--hi-yellow)] transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-[12px] text-[color:var(--text-faint)]">
              First scan can take 20–30 seconds while the language model loads.
              Faster after that.
            </p>
          </div>
        </div>
      )}

      {phase === "parsed" && parsed && (
        <div className="flex flex-1 flex-col gap-3">
          {preview && (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--hair)]">
              <img
                src={preview}
                alt="Scanned ticket"
                className="max-h-[200px] w-full object-contain bg-black"
              />
            </div>
          )}
          <div className="rounded-2xl border border-[color:var(--hair)] bg-[color:var(--ink-2)] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:#34D399]">
              Auto-filled
            </div>
            <div className="mt-2 space-y-2 text-[13px]">
              <Row label="Type" value={parsed.credentialLabel || "(not recognized — pick manually)"} ok={!!parsed.credentialKey} />
              <Row label="Issuer" value={parsed.issuer || "(not found)"} ok={!!parsed.issuer} />
              <Row label="Cert #" value={parsed.certificateNumber || "(not found)"} ok={parsed.confidence.cert} mono />
              <Row label="Issued" value={parsed.issueDate || "(not found)"} ok={!!parsed.issueDate} mono />
              <Row label="Expires" value={parsed.expiryDate || "(not found)"} ok={!!parsed.expiryDate} mono />
              {parsed.holderName && (
                <Row label="Name" value={parsed.holderName} ok={true} />
              )}
            </div>
          </div>

          <p className="text-center text-[12px] text-[color:var(--text-faint)]">
            We&rsquo;ll send these to the form so you can review and save.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setPhase("idle");
                setParsed(null);
                setPreview(null);
              }}
              className="h-12 rounded-xl border border-[color:var(--hair-strong)] bg-[color:var(--ink-2)] text-[14px] font-semibold text-[color:var(--text-dim)]"
            >
              Try again
            </button>
            <button
              onClick={useResults}
              className="h-12 rounded-xl bg-[color:var(--hi-yellow)] text-[14px] font-bold text-[color:var(--ink-1)]"
            >
              Use these values
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-2xl border border-[color:rgba(239,68,68,0.30)] bg-[color:rgba(239,68,68,0.10)] p-5">
            <div className="text-[14px] font-semibold text-[color:#F87171]">
              Couldn&rsquo;t read the ticket
            </div>
            <p className="mt-1 text-[13px] text-[color:var(--text-dim)]">
              {error}
            </p>
          </div>
          <button
            onClick={() => {
              setPhase("idle");
              setError(null);
              setPreview(null);
            }}
            className="h-12 rounded-xl bg-[color:var(--hi-yellow)] px-5 text-[14px] font-bold text-[color:var(--ink-1)]"
          >
            Try another photo
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  ok,
  mono,
}: {
  label: string;
  value: string;
  ok: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-faint)]">
        {label}
      </div>
      <div
        className={`flex-1 text-right text-[13px] ${
          mono ? "font-mono" : ""
        } ${ok ? "text-[color:var(--text)]" : "text-[color:var(--text-faint)]"}`}
      >
        {value}
      </div>
    </div>
  );
}

// Image resize before OCR — Tesseract works faster on smaller files.
function resizeImage(file: File, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Image encoding failed"));
        }, "image/jpeg", 0.82);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = String(e.target?.result ?? "");
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}
