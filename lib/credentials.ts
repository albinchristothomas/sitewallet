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
export const CREDENTIAL_TYPES = [
  { value: "H2S_ALIVE", label: "H2S Alive", issuer: "Energy Safety Canada", isCompanyOrientation: false },
  { value: "FIRST_AID", label: "Standard First Aid + CPR-C", issuer: "Canadian Red Cross / St. John Ambulance", isCompanyOrientation: false },
  { value: "CSO", label: "Construction Safety Officer (CSO)", issuer: "Energy Safety Canada", isCompanyOrientation: false },
  { value: "GROUND_DISTURBANCE_L2", label: "Ground Disturbance Level 2", issuer: "Energy Safety Canada", isCompanyOrientation: false },
  { value: "WHMIS_2015", label: "WHMIS 2015 / GHS", issuer: "Various", isCompanyOrientation: false },
  { value: "TDG", label: "Transportation of Dangerous Goods", issuer: "Transport Canada", isCompanyOrientation: false },
  { value: "FALL_PROTECTION", label: "Fall Protection", issuer: "Various", isCompanyOrientation: false },
  { value: "CONFINED_SPACE", label: "Confined Space Entry & Monitor", issuer: "Various", isCompanyOrientation: false },
  { value: "OSSA_FIT", label: "OSSA Fit-to-Work / Common Safety Orientation", issuer: "Energy Safety Canada", isCompanyOrientation: false },
  { value: "ELEVATED_WORK", label: "Elevated Work Platform / Aerial Lift", issuer: "Various", isCompanyOrientation: false },
  { value: "COMPANY_ORIENTATION", label: "Company orientation", issuer: "(name of issuing company)", isCompanyOrientation: true },
] as const;

export type CredentialTypeValue = (typeof CREDENTIAL_TYPES)[number]["value"];

export function getCredentialLabel(value: string): string {
  return CREDENTIAL_TYPES.find((c) => c.value === value)?.label ?? value;
}

export function isCompanyOrientation(value: string): boolean {
  return CREDENTIAL_TYPES.find((c) => c.value === value)?.isCompanyOrientation ?? false;
}

export type ExpiryStatus = "expired" | "expiring_soon" | "valid" | "no_expiry";

export function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return "no_expiry";
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry < 30) return "expiring_soon";
  return "valid";
}
