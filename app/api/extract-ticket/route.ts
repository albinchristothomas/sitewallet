import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  scanTicketImage,
  mediaTypeForPath,
  type ImageMediaType,
} from "@/lib/ticket-scan";

// Reads a just-uploaded card photo with Claude and extracts every safety
// ticket visible in it — type (mapped to our catalog), holder name, issuer,
// cert number, dates. One photo can contain several cards (workers often
// photograph a whole wallet page); each becomes its own entry.
//
// Failure here must NEVER block the worker: the client falls back to manual
// entry on any error. Auth: signed-in users only (the proxy also gates this).
// The extraction prompt + sanitization live in lib/ticket-scan.ts, shared
// with the re-crop backfill.

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "scan unavailable" }, { status: 503 });
  }

  let path: string;
  try {
    const body = await request.json();
    path = String(body.path ?? "");
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!path || path.includes("..") || /^https?:\/\//i.test(path)) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }

  // Download with the caller's own session — storage RLS ensures they can
  // only read photos they own (or, for medics, worker photos).
  const { data: blob, error: dlErr } = await supabase.storage
    .from("ticket-photos")
    .download(path);
  if (dlErr || !blob) {
    return NextResponse.json({ error: "photo not found" }, { status: 404 });
  }

  const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  const mediaType: ImageMediaType = blob.type?.startsWith("image/")
    ? (blob.type as ImageMediaType)
    : mediaTypeForPath(path);

  try {
    const tickets = await scanTicketImage(b64, mediaType);
    return NextResponse.json({ tickets });
  } catch (e) {
    // Any AI failure degrades gracefully to manual entry on the client.
    console.error("extract-ticket failed:", (e as Error).message);
    return NextResponse.json({ tickets: [], error: "scan failed" });
  }
}
