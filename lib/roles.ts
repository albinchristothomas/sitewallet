// Account type helpers. Single source of truth for who lands where.
//
// Two account types, period:
//   WORKER  — the person coming to the rig with safety tickets
//   MEDIC   — the person at the gate who scans workers in, sets up sites,
//             generates daily reports, and logs incidents.
//
// The partner's phrasing: "two apps — wallet and medic." The medic role
// covers what other systems split into "operator" + "medic". One sign-up,
// one home, full set of admin powers.

export type AccountType = "WORKER" | "MEDIC";

export type SignupIntent = "worker" | "medic";

export function intentToType(intent: SignupIntent): AccountType {
  return intent === "worker" ? "WORKER" : "MEDIC";
}

export function homeForType(type: AccountType): string {
  return type === "WORKER" ? "/wallet" : "/medic";
}

export const TYPE_LABEL: Record<AccountType, string> = {
  WORKER: "Worker",
  MEDIC: "Medic",
};

export const INTENT_DESCRIPTION: Record<SignupIntent, {
  short: string;
  long: string;
}> = {
  worker: {
    short: "I work on rigs",
    long: "Carry your H2S, First Aid, CSO and other safety tickets on your phone. Show your QR at the gate.",
  },
  medic: {
    short: "I work at the gate",
    long: "Scan workers in, set up sites, run the daily roster, log incidents, send the day's report to the oil company.",
  },
};
