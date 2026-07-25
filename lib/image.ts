// Client-side image downscale + JPEG compression before upload. A modern phone
// camera JPEG is 3-8MB; uploaded raw, 40 workers × 5 cards would blow the
// storage cap and make the gate verify screen crawl on rural LTE. This shrinks
// each image to ~150-400KB. Runs in the browser (canvas), no deps.

function imageToCanvas(file: File, maxDim: number): Promise<HTMLCanvasElement> {
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
        resolve(canvas);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = String(e.target?.result ?? "");
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export type CropBox = { x: number; y: number; width: number; height: number };

/**
 * Cut one card's rectangle out of a (already-compressed) photo. Used when a
 * wallet-page photo contains several cards: the AI returns each card's pixel
 * bounding box, and every saved ticket gets its OWN cropped picture instead of
 * the whole page. A small padding margin keeps card edges readable. Returns
 * null on any failure so callers fall back to the full photo.
 */
export async function cropImage(
  source: Blob,
  box: CropBox,
  quality = 0.85,
): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(source);
    const pad = Math.round(Math.max(box.width, box.height) * 0.03);
    const x = Math.max(0, Math.floor(box.x) - pad);
    const y = Math.max(0, Math.floor(box.y) - pad);
    const w = Math.min(bmp.width - x, Math.ceil(box.width) + pad * 2);
    const h = Math.min(bmp.height - y, Math.ceil(box.height) + pad * 2);
    // Reject nonsense boxes (too small to be a card, or outside the image).
    if (w < 60 || h < 40) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bmp, x, y, w, h, 0, 0, w, h);
    return await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", quality),
    );
  } catch {
    return null;
  }
}

/**
 * Downscale `file` so its longest edge ≤ maxDim, re-encode as JPEG at `quality`.
 * Falls back to the original file if anything goes wrong (non-image, decode
 * failure) so an upload never hard-fails on this optimization.
 */
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.82,
): Promise<Blob> {
  try {
    if (!file.type.startsWith("image/")) return file;
    const canvas = await imageToCanvas(file, maxDim);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", quality),
    );
    // If compression somehow made it bigger (tiny images), keep the smaller one.
    if (blob && blob.size < file.size) return blob;
    return file;
  } catch {
    return file;
  }
}
