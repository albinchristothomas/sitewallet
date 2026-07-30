import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CREDENTIAL_TYPES } from "@/lib/credentials";

// Shared Claude vision extraction for safety-ticket photos. Used by the live
// scan (/api/extract-ticket) and the one-off re-crop backfill so both read
// cards with the exact same prompt and sanitization.

export type ExtractedTicket = {
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

// COMPANY_ORIENTATION is deliberately NOT offered to the model: mapping a
// "Tourmaline Orientation" card to a generic catalog code erases the site
// name, which is the whole point of that ticket. Those come back as
// custom_name with the printed title intact.
const CATALOG_LINES = CREDENTIAL_TYPES.filter(
  (c) => !c.isOther && !c.isCompanyOrientation,
)
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

Company- and site-specific tickets: operator/contractor orientations and in-house courses (e.g. "Tourmaline Orientation", "CNRL Safety Orientation", "Trican Rig-It") NEVER map to a catalog code — the company or site name is the whole point of the ticket. Set catalog_value to null and put the full printed title, INCLUDING the company/site name, in custom_name.

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
  CREDENTIAL_TYPES.filter((c) => !c.isOther && !c.isCompanyOrientation).map(
    (c) => c.value,
  ),
);

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Read every ticket visible in a base64 image with Claude. Returns sanitized
 * tickets (real catalog codes only, ISO dates only, sane bounding boxes).
 * Returns [] on refusal; throws on API failure — callers decide the fallback.
 */
export async function scanTicketImage(
  b64: string,
  mediaType: ImageMediaType,
): Promise<ExtractedTicket[]> {
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
            source: { type: "base64", media_type: mediaType, data: b64 },
          },
          {
            type: "text",
            text: "Extract every safety ticket visible in this photo.",
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return [];

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return [];
  const parsed = JSON.parse(text.text) as { tickets: ExtractedTicket[] };

  const isoRe = /^\d{4}-\d{2}-\d{2}$/;
  const saneBox = (b: ExtractedTicket["bbox"]): ExtractedTicket["bbox"] => {
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

  return (parsed.tickets ?? [])
    .map((t) => {
      const catalog =
        t.catalog_value && VALID_CATALOG.has(t.catalog_value)
          ? t.catalog_value
          : null;
      let custom = (t.custom_name ?? "").trim() || null;
      // If the model mapped to the (unlisted) generic orientation code
      // anyway, keep the ticket under a named orientation instead of
      // dropping it — the issuer is the site/company name we want.
      if (!catalog && !custom && t.catalog_value === "COMPANY_ORIENTATION") {
        custom = t.issuer?.trim() ? `${t.issuer.trim()} Orientation` : null;
      }
      return {
        ...t,
        catalog_value: catalog,
        custom_name: custom,
        issue_date:
          t.issue_date && isoRe.test(t.issue_date) ? t.issue_date : null,
        expiry_date:
          t.expiry_date && isoRe.test(t.expiry_date) ? t.expiry_date : null,
        bbox: saneBox(t.bbox),
      };
    })
    // Drop entries with neither a catalog match nor a readable name.
    .filter((t) => t.catalog_value || (t.custom_name ?? "").trim().length > 1);
}

export function mediaTypeForPath(path: string): ImageMediaType {
  const p = path.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
