import type {
  ActionState,
  ConsentField,
  ConsentGrant,
  HousingSearchResult,
  MoveProgram,
  Organization,
  PersonProfile,
  RelocationCase,
  RelocationCategory,
  RelocationTask,
  RentalHome,
  SourceRecord,
  StatusEvent,
} from "../types.ts";

export type {
  ActionState,
  ConsentField,
  ConsentGrant,
  HousingSearchResult,
  MoveProgram,
  Organization,
  PersonProfile,
  RelocationCase,
  RelocationCategory,
  RelocationTask,
  RentalHome,
  SourceRecord,
  StatusEvent,
};

export type CapabilityActor =
  | { kind: "person"; id: string; label: string; personId: string; activeCaseId?: string }
  | { kind: "organization"; id: string; label: string; organizationId: string; programId: string }
  | { kind: "bankable"; id: string; label: string };

export type CapabilitySession = {
  id: string;
  tokenHash: string;
  actor: CapabilityActor;
  createdAt: string;
  expiresAt: string;
  devOnly: true;
  demoOnly?: true;
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
      areaId: string | null;
      actionUrl: string | null;
      actionLabel: string | null;
      canContact: boolean;
      category?: RelocationCategory;
      resourceId?: string | null;
      reasons: string[];
      sources: SourceRecord[];
    };

export type PendingInvite = {
  id: string;
  programId: string;
  organizationId: string;
  tokenHash: string;
  employeeLabel: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedPersonId: string | null;
};

export type RelocationStoreData = {
  people: PersonProfile[];
  organizations: Organization[];
  programs: MoveProgram[];
  cases: RelocationCase[];
  tasks: RelocationTask[];
  recommendations: Record<string, Recommendation[]>;
  events: StatusEvent[];
  consents: ConsentGrant[];
  sessions: CapabilitySession[];
  pendingInvites: PendingInvite[];
};

export type PublicPersonHub = {
  profile: Omit<PersonProfile, "privateEvidence">;
  case: RelocationCase;
  selectedProperty: {
    listingId: string;
    title: string;
    area: string;
    annualRentAed: number;
    monthlyRentAed: number;
    withinBudget: boolean;
    withinPolicyAllowance: boolean;
    rentShareOfIncomePercent: number | null;
    synthetic: boolean;
  } | null;
  tasks: RelocationTask[];
  recommendations: Recommendation[];
  timeline: StatusEvent[];
  housingSearch: HousingSearchResult;
  budget: {
    minMonthlyIncomeAed: number;
    annualBudgetAed: number;
    policyAllowanceAnnualAed: number;
    estimatedInitialCashAed: null;
    paymentTermsUnknown: true;
    paymentTermsNote: string;
  };
  financeReadiness: {
    factors: string[];
    blockedBy: string[];
    noApprovalProbability: true;
  };
};

export type HrProgramView = {
  program: MoveProgram;
  organization: Organization;
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
    milestones: {
      category: RelocationCategory;
      state: ActionState;
      owner: string;
      nextAction: string;
    }[];
    blockers: string[];
    sharedPrivateScopes: ConsentField[];
  }[];
};
