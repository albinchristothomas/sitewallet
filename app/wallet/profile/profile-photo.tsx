"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { ProgressBar } from "@/lib/progress-bar";
import { setProfilePhoto } from "./actions";

function randomKey() {
  return Math.random().toString(36).slice(2);
}

// Profile photo block: shows the current photo or the generated avatar
// (passed in server-rendered), with a one-time "Add your photo" upload.
// Once set, the photo is locked — it anchors the medic's face check.
export function ProfilePhoto({
  hasPhoto,
  avatar,
}: {
  hasPhoto: boolean;
  avatar: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const blob = await compressImage(file, 1024);
      const path = `self/${randomKey()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("faces")
        .upload(path, blob, { upsert: false, contentType: "image/jpeg" });
      if (upErr) throw new Error(upErr.message);
      const res = await setProfilePhoto(path);
      if (res.error) throw new Error(res.error);
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mt-5 flex items-center gap-4 rounded-2xl border border-[color:var(--line)] p-4"
      style={{ background: "#15191e" }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          overflow: "hidden",
          flex: "none",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {avatar}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        {hasPhoto ? (
          <>
            <div className="text-[14px] font-semibold">Your photo</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--text-faint)]">
              Locked — it anchors the face check at the gate. Ask a medic to
              change it.
            </p>
          </>
        ) : (
          <>
            <div className="text-[14px] font-semibold">Add your photo</div>
            <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--text-faint)]">
              The medic matches this to your face at the gate — it gets you
              waved through faster. One-time set.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rw-pressable mono mt-2.5 rounded-lg px-3.5 text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{
                height: 36,
                background: "#f2581c",
                color: "#0d0f12",
                border: "none",
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? "Uploading…" : "Add photo"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <ProgressBar active={busy} label="UPLOADING YOUR PHOTO" />
            {error && (
              <p className="mono mt-2 text-[10px]" style={{ color: "#ff9a8f" }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
