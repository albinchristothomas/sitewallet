// Role helpers — single source of truth for who lands where.

export type WorkerRole = "WORKER" | "MEDIC" | "OPERATOR_ADMIN";

export type SignupIntent = "worker" | "medic" | "operator";

export function intentToRole(intent: SignupIntent): WorkerRole {
  switch (intent) {
    case "worker":
      return "WORKER";
    case "medic":
      return "MEDIC";
    case "operator":
      return "OPERATOR_ADMIN";
  }
}

export function intentToHome(intent: SignupIntent): string {
  switch (intent) {
    case "worker":
      return "/wallet";
    case "medic":
      return "/medic";
    case "operator":
      return "/admin";
  }
}

// Given a user's roles, decide their default home.
// Priority: operator > medic > worker. (An operator usually doesn't also
// scan QRs themselves; a medic might also hold their own tickets.)
export function defaultHomeForRoles(roles: WorkerRole[]): string {
  if (roles.includes("OPERATOR_ADMIN")) return "/admin";
  if (roles.includes("MEDIC")) return "/medic";
  return "/wallet";
}

export function hasRole(roles: WorkerRole[] | null | undefined, role: WorkerRole): boolean {
  return Array.isArray(roles) && roles.includes(role);
}

// Human labels — used in onboarding and nav.
export const ROLE_LABEL: Record<WorkerRole, string> = {
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
    long: "Scan workers as they arrive, verify their tickets against site requirements, manage the daily roster.",
  },
  operator: {
    short: "I run the worksite",
    long: "Set up sites, choose which tickets are required, assign medics, export rosters and incident reports.",
  },
};
