import { createClient } from "@/lib/supabase/server";

// Our two private storage buckets.
export const FACES_BUCKET = "faces";
export const TICKET_PHOTOS_BUCKET = "ticket-photos";

// How long a signed photo URL stays valid. Long enough to view a roster/verify
// screen; short enough that a leaked URL expires.
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/**
 * Turn a stored object path (e.g. "faces/abc.jpg" or just "abc.jpg") into a
 * short-lived signed URL the browser can load. Returns null on any failure so
 * callers can fall back to initials.
 *
 * `value` may already be a full http(s) URL (older rows / external) — in that
 * case it's returned as-is.
 */
export async function signedPhotoUrl(
  bucket: string,
  value: string | null | undefined,
): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  // Tolerate paths stored with a leading "<bucket>/" prefix.
  const path = value.startsWith(`${bucket}/`)
    ? value.slice(bucket.length + 1)
    : value;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error || !data) return null;
  return data.signedUrl;
}

export function faceUrl(value: string | null | undefined) {
  return signedPhotoUrl(FACES_BUCKET, value);
}

export function ticketPhotoUrl(value: string | null | undefined) {
  return signedPhotoUrl(TICKET_PHOTOS_BUCKET, value);
}
