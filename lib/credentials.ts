// Credential type catalog.
//
// Most entries are 3rd-party safety tickets with an issuer, certificate
// number, and (often) an external verification URL.
//
// COMPANY_ORIENTATION is the exception: it represents an internal
// orientation issued by the operating company (e.g. "Tourmaline Site
// Orientation", "Arch Resources Day-1 Orientation"). These have no external
// issuer to verify against — only a start date and an end date. The form
// hides the issuer / cert / validation fields when this type is selected.
//
// OTHER is the escape hatch: a ticket that isn't in the list yet. The worker
// (or medic) types the real ticket name. A custom ticket can never auto-pass a
// gate — a medic always confirms it by eye. This keeps the list honest: we add
// real tickets here over time instead of letting people invent fake ones.
export const CREDENTIAL_TYPES = [
  // ── core gate tickets (almost every wellsite asks for these) ──
  { value: "H2S_ALIVE", label: "H2S Alive", issuer: "Energy Safety Canada", isCompanyOrientation: false, isOther: false },
  { value: "FIRST_AID", label: "Standard First Aid + CPR-C", issuer: "Red Cross / St. John Ambulance", isCompanyOrientation: false, isOther: false },
  { value: "EMERGENCY_FIRST_AID", label: "Emergency First Aid", issuer: "Red Cross / St. John Ambulance", isCompanyOrientation: false, isOther: false },
  { value: "CSO", label: "Common Safety Orientation (CSO)", issuer: "Energy Safety Canada", isCompanyOrientation: false, isOther: false },
  { value: "PST", label: "Petroleum Safety Training (PST)", issuer: "Energy Safety Canada", isCompanyOrientation: false, isOther: false },
  { value: "CSTS", label: "CSTS · Construction Safety Training", issuer: "Energy Safety Canada / ACSA", isCompanyOrientation: false, isOther: false },
  { value: "OSSA_FIT", label: "OSSA Basic / Fit-to-Work", issuer: "Energy Safety Canada", isCompanyOrientation: false, isOther: false },

  // ── task-specific tickets ──
  { value: "GROUND_DISTURBANCE_L2", label: "Ground Disturbance Level 2", issuer: "Energy Safety Canada", isCompanyOrientation: false, isOther: false },
  { value: "CONFINED_SPACE", label: "Confined Space Entry & Monitor", issuer: "Various", isCompanyOrientation: false, isOther: false },
  { value: "FALL_PROTECTION", label: "Fall Protection", issuer: "Various", isCompanyOrientation: false, isOther: false },
  { value: "FLAMMABLE_SUBSTANCES", label: "Detection & Control of Flammable Substances", issuer: "Energy Safety Canada", isCompanyOrientation: false, isOther: false },
  { value: "FIRE_WATCH", label: "Fire Watch / Extinguisher", issuer: "Various", isCompanyOrientation: false, isOther: false },
  { value: "ELEVATED_WORK", label: "Aerial Work Platform / Elevated Work", issuer: "Various", isCompanyOrientation: false, isOther: false },
  { value: "BOOM_TRUCK", label: "Boom Truck / Rigging", issuer: "Various", isCompanyOrientation: false, isOther: false },

  // ── compliance / awareness ──
  { value: "WHMIS_2015", label: "WHMIS 2015 / GHS", issuer: "Various", isCompanyOrientation: false, isOther: false },
  { value: "TDG", label: "Transportation of Dangerous Goods", issuer: "Transport Canada", isCompanyOrientation: false, isOther: false },
  { value: "WILDLIFE_AWARENESS", label: "Bear / Wildlife Awareness", issuer: "Various", isCompanyOrientation: false, isOther: false },

  // ── special cases ──
  { value: "COMPANY_ORIENTATION", label: "Company orientation", issuer: "(name of issuing company)", isCompanyOrientation: true, isOther: false },
  { value: "OTHER", label: "Other — type the ticket name", issuer: "Medic-verified", isCompanyOrientation: false, isOther: true },
] as const;

export type CredentialTypeValue = (typeof CREDENTIAL_TYPES)[number]["value"];

export function getCredentialLabel(value: string): string {
  return CREDENTIAL_TYPES.find((c) => c.value === value)?.label ?? value;
}

export function isCompanyOrientation(value: string): boolean {
  return CREDENTIAL_TYPES.find((c) => c.value === value)?.isCompanyOrientation ?? false;
}

// True for the "Other" escape-hatch type (worker types a free-text name).
export function isOtherCredential(value: string): boolean {
  return CREDENTIAL_TYPES.find((c) => c.value === value)?.isOther ?? false;
}

export type ExpiryStatus = "expired" | "expiring_soon" | "valid" | "no_expiry";

export function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return "no_expiry";
  // Date-only comparison, aligned with the gate RPC: a card is VALID through
  // its printed expiry day and EXPIRED the day after. (Naive new Date() on a
  // YYYY-MM-DD string parses UTC midnight and flipped cards to EXPIRED up to
  // ~30 hours early — the wallet said DEAD while the gate said VALID.)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(expiryDate + "T00:00:00");
  const daysUntilExpiry = Math.round(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry < 30) return "expiring_soon";
  return "valid";
}
