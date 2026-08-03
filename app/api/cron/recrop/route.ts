import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  scanTicketImage,
  mediaTypeForPath,
  type ExtractedTicket,
} from "@/lib/ticket-scan";

// One-off backfill: credentials saved from a multi-card photo BEFORE the
// per-card crop fix all share the same collage picture. This re-reads each
// shared photo with Claude, cuts out each card's own rectangle server-side,
// uploads the crop, and points the credential row at it.
//
// Auth: CRON_SECRET bearer (same scheme as the EOD cron). Idempotent — once
// rows point at their own recrop/ photo they no longer share, so re-runs
// skip them. Processes a few photos per call; invoke repeatedly until
// remaining is 0.
//
// NOTE: crops are uploaded by the service role (storage owner = null), so
// workers read them via the "photo attached to my own credential" storage
// policy — migration 20260731000000 must be applied first.

export const maxDuration = 60;

const PHOTOS_PER_RUN = 4;

type CredRow = {
  id: string;
  worker_id: string;
  credential_type: string;
  certificate_number: string | null;
  expiry_date: string | null;
  photo_url: string;
};

const norm = (s: string | null | undefined): string =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "scan unavailable" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: creds, error: qErr } = await admin
    .from("credentials")
    .select(
      "id, worker_id, credential_type, certificate_number, expiry_date, photo_url",
    )
    .not("photo_url", "is", null);
  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  // Every original photo gets tightened to its card(s): shared photos are
  // collages needing splitting, single photos get the table/background cut
  // away. recrop/ photos are this job's own output and never reprocessed —
  // that's what makes re-runs converge. Collages first (worst offenders).
  const groups = new Map<string, CredRow[]>();
  for (const c of (creds ?? []) as CredRow[]) {
    if (!c.photo_url || c.photo_url.startsWith("recrop/")) continue;
    const g = groups.get(c.photo_url) ?? [];
    g.push(c);
    groups.set(c.photo_url, g);
  }
  const shared = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  const report: Array<Record<string, unknown>> = [];
  let processed = 0;

  for (const [photo, rows] of shared) {
    if (processed >= PHOTOS_PER_RUN) break;
    processed++;

    const { data: blob } = await admin.storage
      .from("ticket-photos")
      .download(photo);
    if (!blob) {
      report.push({ photo, status: "download_failed" });
      continue;
    }
    const buf = Buffer.from(await blob.arrayBuffer());

    let tickets: ExtractedTicket[];
    try {
      tickets = await scanTicketImage(
        buf.toString("base64"),
        blob.type?.startsWith("image/")
          ? (blob.type as "image/jpeg")
          : mediaTypeForPath(photo),
      );
    } catch (e) {
      report.push({ photo, status: "scan_failed", error: (e as Error).message });
      continue;
    }

    const meta = await sharp(buf).metadata();
    const imgW = meta.width ?? 0;
    const imgH = meta.height ?? 0;
    const used = new Set<number>();

    // Match each credential row to a detected ticket, strongest signal first:
    // cert number, then catalog code, then printed name, then a unique expiry
    // date, then the lone orientation for a generic COMPANY_ORIENTATION row.
    const findMatch = (row: CredRow): number => {
      const tryFind = (pred: (t: ExtractedTicket) => boolean) => {
        const idxs = tickets
          .map((t, i) => (!used.has(i) && pred(t) ? i : -1))
          .filter((i) => i >= 0);
        return idxs.length === 1 ? idxs[0] : -1;
      };
      let i = -1;
      if (row.certificate_number) {
        i = tryFind(
          (t) => norm(t.certificate_number) === norm(row.certificate_number),
        );
        if (i >= 0) return i;
      }
      i = tryFind((t) => t.catalog_value === row.credential_type);
      if (i >= 0) return i;
      i = tryFind((t) => norm(t.custom_name) === norm(row.credential_type));
      if (i >= 0) return i;
      if (row.expiry_date) {
        i = tryFind((t) => t.expiry_date === row.expiry_date);
        if (i >= 0) return i;
      }
      if (row.credential_type === "COMPANY_ORIENTATION") {
        i = tryFind((t) => norm(t.custom_name).includes("orientation"));
        if (i >= 0) return i;
      }
      return -1;
    };

    for (const row of rows) {
      // A lone credential with a lone detected card is an unambiguous pair;
      // everything else goes through the matchers.
      const mi =
        rows.length === 1 && tickets.length === 1 ? 0 : findMatch(row);
      if (mi < 0) {
        report.push({ id: row.id, type: row.credential_type, status: "no_match" });
        continue;
      }
      used.add(mi);
      const box = tickets[mi].bbox;
      if (!box || !imgW || !imgH) {
        report.push({ id: row.id, type: row.credential_type, status: "no_bbox" });
        continue;
      }

      // Same 3% breathing room as the client-side crop, clamped to the image.
      const padX = Math.round(box.width * 0.03);
      const padY = Math.round(box.height * 0.03);
      const left = Math.max(0, box.x - padX);
      const top = Math.max(0, box.y - padY);
      const width = Math.min(imgW - left, box.width + padX * 2);
      const height = Math.min(imgH - top, box.height + padY * 2);
      if (width < 60 || height < 40) {
        report.push({ id: row.id, type: row.credential_type, status: "box_too_small" });
        continue;
      }

      try {
        const crop = await sharp(buf)
          .extract({ left, top, width, height })
          .jpeg({ quality: 85 })
          .toBuffer();
        const path = `recrop/${row.worker_id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await admin.storage
          .from("ticket-photos")
          .upload(path, crop, { upsert: false, contentType: "image/jpeg" });
        if (upErr) throw new Error(upErr.message);

        const { error: dbErr } = await admin
          .from("credentials")
          .update({ photo_url: path })
          .eq("id", row.id);
        if (dbErr) throw new Error(dbErr.message);

        report.push({ id: row.id, type: row.credential_type, status: "updated", path });
      } catch (e) {
        report.push({
          id: row.id,
          type: row.credential_type,
          status: "crop_failed",
          error: (e as Error).message,
        });
      }
    }
  }

  return NextResponse.json({
    photos: shared.length,
    processed,
    remaining: shared.length - processed,
    report,
  });
}
