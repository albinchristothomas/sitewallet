export const CREDENTIAL_TYPES = [
  { value: "H2S_ALIVE", label: "H2S Alive", issuer: "Energy Safety Canada" },
  { value: "FIRST_AID", label: "Standard First Aid + CPR-C", issuer: "Canadian Red Cross / St. John Ambulance" },
  { value: "CSO", label: "Construction Safety Officer (CSO)", issuer: "Energy Safety Canada" },
  { value: "GROUND_DISTURBANCE_L2", label: "Ground Disturbance Level 2", issuer: "Energy Safety Canada" },
  { value: "WHMIS_2015", label: "WHMIS 2015 / GHS", issuer: "Various" },
  { value: "TDG", label: "Transportation of Dangerous Goods", issuer: "Transport Canada" },
  { value: "FALL_PROTECTION", label: "Fall Protection", issuer: "Various" },
  { value: "CONFINED_SPACE", label: "Confined Space Entry & Monitor", issuer: "Various" },
  { value: "OSSA_FIT", label: "OSSA Fit-to-Work / Common Safety Orientation", issuer: "Energy Safety Canada" },
  { value: "ELEVATED_WORK", label: "Elevated Work Platform / Aerial Lift", issuer: "Various" },
] as const;

export type CredentialTypeValue = (typeof CREDENTIAL_TYPES)[number]["value"];

export function getCredentialLabel(value: string): string {
  return CREDENTIAL_TYPES.find((c) => c.value === value)?.label ?? value;
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
