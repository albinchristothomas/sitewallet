import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { CREDENTIAL_TYPES } from "@/lib/credentials";

// Reads a just-uploaded card photo with Claude and extracts every safety
// ticket visible in it — type (mapped to our catalog), holder name, issuer,
// cert number, dates. One photo can contain several cards (workers often
// photograph a whole wallet page); each becomes its own entry.
//
// Failure here must NEVER block the worker: the client falls back to manual
// entry on any error. Auth: signed-in users only (the proxy also gates this).

export const maxDuration = 60;

type ExtractedTicket = {
  catalog_value: string | null;
  custom_name: string | null;
  holder_name: string | null;
  issuer: string | null;
  certificate_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  confidence: "high" | "medium" | "low";
  bbox: { x: number; y: number; width: number; height: number } | null;
};

const CATALOG_LINES = CREDENTIAL_TYPES.filter((c) => !c.isOther)
  .map((c) => `- ${c.value}: ${c.label} (typical issuer: ${c.issuer})`)
  .join("\n");

const SYSTEM = `You read photos of Canadian oil & gas safety-training ticket cards (wallet cards). Extract EVERY distinct ticket/card visible in the image — a photo may show one card or a whole wallet page with several.

For each ticket:
- catalog_value: map it to one of these catalog codes when it clearly matches, else null:
${CATALOG_LINES}
- custom_name: when catalog_value is null, the ticket's name exactly as printed; else null.
- holder_name: the person's name as printed on the card, or null.
- issuer: the issuing company/organization as printed (e.g. "Trican Well Service", "Energy Safety Canada"), or null.
- certificate_number: only if a certificate/registration number is clearly printed; never invent one.
- issue_date / expiry_date: ISO YYYY-MM-DD, from "Completed"/"Issued" and "Expires" text; null if not printed. If only month+year, use day 01.
- confidence: high when the text is clearly legible, medium when partially legible, low when guessing.
- bbox: the pixel bounding box of THIS card's rectangle within the image — {x, y, width, height} with x,y the top-left corner in pixels of the image as provided. Cover the full card face tightly. null only if you cannot locate the card's outline.

Rules: never invent data — null beats a guess. A card's title (e.g. "TRICAN DEFENSIVE DRIVING COURSE") that doesn't match the catalog goes in custom_name verbatim. Ignore non-ticket content in the photo.`;

const SCHEMA = {
  type: "object" as const,
  properties: {
    tickets: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          catalog_value: { type: ["string", "null"] },
          custom_name: { type: ["string", "null"] },
          holder_name: { type: ["string", "null"] },
          issuer: { type: ["string", "null"] },
          certificate_number: { type: ["string", "null"] },
          issue_date: { type: ["string", "null"] },
          expiry_date: { type: ["string", "null"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          bbox: {
            anyOf: [
              {
                type: "object" as const,
                properties: {
                  x: { type: "integer" },
                  y: { type: "integer" },
                  width: { type: "integer" },
                  height: { type: "integer" },
                },
                required: ["x", "y", "width", "height"],
                additionalProperties: false,
              },
              { type: "null" as const },
            ],
          },
        },
        required: [
          "catalog_value",
          "custom_name",
          "holder_name",
          "issuer",
          "certificate_number",
          "issue_date",
          "expiry_date",
          "confidence",
          "bbox",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["tickets"],
  additionalProperties: false,
};

const VALID_CATALOG = new Set<string>(
  CREDENTIAL_TYPES.filter((c) => !c.isOther).map((c) => c.value),
);

function mediaTypeFor(path: string): "image/jpeg" | "image/png" | "image/webp" {
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "scan unavailable" },
      { status: 503 },
    );
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

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      output_config: {
        format: { type: "json_schema", schema: SCHEMA },
        effort: "low",
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: blob.type?.startsWith("image/")
                  ? (blob.type as "image/jpeg")
                  : mediaTypeFor(path),
                data: b64,
              },
            },
            {
              type: "text",
              text: "Extract every safety ticket visible in this photo.",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ tickets: [] });
    }

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ tickets: [] });
    }
    const parsed = JSON.parse(text.text) as { tickets: ExtractedTicket[] };

    // Server-side sanity: catalog values must be real; dates must look ISO.
    const isoRe = /^\d{4}-\d{2}-\d{2}$/;
    const saneBox = (
      b: ExtractedTicket["bbox"],
    ): ExtractedTicket["bbox"] => {
      if (!b) return null;
      const { x, y, width, height } = b;
      if (
        [x, y, width, height].some((n) => !Number.isFinite(n) || n < 0) ||
        width < 40 ||
        height < 25
      ) {
        return null;
      }
      return { x, y, width, height };
    };
    const tickets = (parsed.tickets ?? [])
      .map((t) => ({
        ...t,
        catalog_value:
          t.catalog_value && VALID_CATALOG.has(t.catalog_value)
            ? t.catalog_value
            : null,
        issue_date: t.issue_date && isoRe.test(t.issue_date) ? t.issue_date : null,
        expiry_date:
          t.expiry_date && isoRe.test(t.expiry_date) ? t.expiry_date : null,
        bbox: saneBox(t.bbox),
      }))
      // Drop entries with neither a catalog match nor a readable name.
      .filter((t) => t.catalog_value || (t.custom_name ?? "").trim().length > 1);

    return NextResponse.json({ tickets });
  } catch (e) {
    // Any AI failure degrades gracefully to manual entry on the client.
    console.error("extract-ticket failed:", (e as Error).message);
    return NextResponse.json({ tickets: [], error: "scan failed" });
  }
}
