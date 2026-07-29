import "server-only";

// Owner gate. The People view exposes every signup's details (name, email,
// company, activity) — that's the product owner's view, not a medic's. Medics
// see only the workers at their own gate.
//
// Defaults to the founder's email so it works with zero configuration; set
// OWNER_EMAILS (comma-separated) in Vercel to add or change owners.
const DEFAULT_OWNERS = ["albinchristothomas@gmail.com"];

export function ownerEmails(): string[] {
  const fromEnv = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_OWNERS;
}

export function isOwner(email: string | null | undefined): boolean {
  if (!email) return false;
  return ownerEmails().includes(email.trim().toLowerCase());
}
