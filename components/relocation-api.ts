export type RouteChoice = "my-move" | "join-company" | "move-team";
export type ViewMode = "employee" | "hr";

export type SourceRecord = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
  verification: string;
  limitations?: string[];
};

export type RentalHome = {
  id: string;
  title: string;
  area: string;
  annualRentAed: number;
  bedrooms: number;
  bathrooms: number | null;
  sizeSqft: number | null;
  synthetic: boolean;
  sourceKind: "snapshot" | "synthetic" | "live";
  checkedAt: string;
  contactable: boolean;
  listingUrl: string | null;
  availability: "unconfirmed" | "illustrative";
};

export type Recommendation =
  | {
      id: string;
      type: "home";
      home: RentalHome;
      affordable: boolean;
      policyFit: boolean;
      canContact: boolean;
      reasons: string[];
      sources: SourceRecord[];
    }
  | {
      id: string;
      type: "workspace" | "official_service" | "finance_readiness";
      title: string;
      actionUrl: string | null;
      actionLabel: string | null;
      canContact: boolean;
      reasons: string[];
      sources: SourceRecord[];
    };

export type RelocationTask = {
  id: string;
  caseId: string;
  title: string;
  category: "housing" | "workspace" | "setup" | "residence" | "insurance" | "finance";
  actionUrl: string | null;
  state: string;
  updatedAt: string;
  owner: string;
  nextAction: string;
  blocker: string | null;
};

export type StatusEvent = {
  id: string;
  caseId: string;
  taskId: string;
  state: string;
  source: { kind: string; label: string; reference?: string };
  updatedAt: string;
  owner: string;
  nextAction: string;
  blocker: string | null;
};

export type PersonHub = {
  profile: {
    id: string;
    displayName: string;
    workType: string;
    household: { adults: number; children: number };
    income: { minMonthlyAed: number; maxMonthlyAed: number };
    synthetic: boolean;
  };
  case: {
    id: string;
    personId: string;
    programId: string | null;
    housingPolicy: { annualAllowanceAed: number; maxRentShareOfIncome: number };
  };
  tasks: RelocationTask[];
  recommendations: Recommendation[];
  timeline: StatusEvent[];
  housingSearch: {
    matches: { home: RentalHome; annualBudgetAed: number; monthlyRentAed: number; score: number; reasons: string[] }[];
    excluded: { listingId: string; reasons: string[] }[];
    annualBudgetAed: number;
    assumptions: string[];
  };
  budget: {
    minMonthlyIncomeAed: number;
    annualBudgetAed: number;
    policyAllowanceAnnualAed: number;
    estimatedInitialCashAed: number | null;
  };
  financeReadiness: { factors: string[]; blockedBy: string[]; noApprovalProbability: true };
};

export type HrView = {
  program: {
    id: string;
    organizationId: string;
    hasUaeEntity: boolean;
    jurisdiction?: string;
    officeAreaId: string;
    teamSize: number;
    moveDate: string;
    synthetic: boolean;
    housingPolicy: { annualAllowanceAed: number; maxRentShareOfIncome: number };
  };
  organization: { id: string; name: string; synthetic: boolean };
  aggregate: {
    invited: number;
    accepted: number;
    cases: number;
    blocked: number;
    policyFit: number;
    openedHandoffs: number;
  };
  employees: {
    caseId: string;
    personId: string;
    displayName: string;
    inviteAccepted: boolean;
    housingPolicyFit: "fits" | "over_allowance" | "no_home_shortlist";
    milestones: { category: string; state: string; owner: string; nextAction: string }[];
    blockers: string[];
    sharedPrivateScopes: string[];
  }[];
};

export type BootstrapPreviewPayload = {
  demo: {
    hr: HrView;
    employees: { personId: string; displayName: string }[];
  };
};

export type DemoCapabilities = {
  programId: string;
  hrSessionToken: string;
  employees: { personId: string; displayName: string; sessionToken: string }[];
};

export type PersonHubPayload = { view: PersonHub };
export type HrViewPayload = { view: HrView };
export type ProfileCreatePayload = { sessionToken: string; profile: PersonHub["profile"]; case: PersonHub["case"] };
export type ProgramCreatePayload = { hrSessionToken: string; program: HrView["program"] };
export type InviteCreatePayload = { inviteId: string; token: string; expiresAt?: string };
export type OpenedActionPayload = { ok: true; latestEvent?: StatusEvent };

export async function apiGet<T>(path: string, sessionToken?: string): Promise<T> {
  const response = await fetch(path, {
    headers: {
      accept: "application/json",
      ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
    },
    cache: "no-store",
  });
  return readJson<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown, sessionToken?: string): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return readJson<T>(response);
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Request failed (${response.status})`);
  return payload as T;
}
