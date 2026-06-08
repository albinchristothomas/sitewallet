// Account type helpers. Single source of truth for who lands where.
//
// Each identity is exactly one type. There is no "worker who is also a medic"
// — the medic is a different person checking the worker. If the same human
// ever needs to do both jobs, they create two accounts with two emails.

export type AccountType = "WORKER" | "MEDIC" | "OPERATOR_ADMIN";

export type SignupIntent = "worker" | "medic" | "operator";

export function intentToType(intent: SignupIntent): AccountType {
  switch (intent) {
    case "worker":
      return "WORKER";
    case "medic":
      return "MEDIC";
    case "operator":
      return "OPERATOR_ADMIN";
  }
}

export function homeForType(type: AccountType): string {
  switch (type) {
    case "WORKER":
      return "/wallet";
    case "MEDIC":
      return "/medic";
    case "OPERATOR_ADMIN":
      return "/admin";
  }
}

export const TYPE_LABEL: Record<AccountType, string> = {
  WORKER: "Worker",
  MEDIC: "Medic",
  OPERATOR_ADMIN: "Operator",
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
    long: "Check workers in as they arrive. Scan their QR, verify their tickets, manage the daily roster.",
  },
  operator: {
    short: "I run the worksite",
    long: "Set up sites, choose which tickets are required, assign medics, export rosters and incident reports.",
  },
};
