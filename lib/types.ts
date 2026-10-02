// The shared contract. Owned by bankable-orchestrator; frozen after Stage 1.
// Extraction (lib/extract) produces IncomeProfile. Rules (lib/rules) turn it into Verdict[].
// The UI, proof pack and explainer only read these shapes.

export type Evidence = { doc: string; page?: number; quote: string };

export type IncomeProfile = {
  person: { name: string; nationality?: string; visa_type?: string; visa_expiry?: string };
  licence: { type: string; activity: string; issue_date: string; expiry_date: string; emirate: string };
  trading_months: number; // computed in code from licence.issue_date, never by the model
  income: {
    months: { month: string; credits_aed: number }[]; // month = "YYYY-MM"
    avg_monthly_aed: number; // computed in code
    min_month_aed: number; // computed in code
    months_covered: number; // computed in code
    clients: { name: string; total_aed: number; recurring: boolean }[];
  };
  obligations: { monthly_debt_aed: number; items: { label: string; monthly_aed: number }[] };
  contracts: { counterparty: string; monthly_aed: number; start: string; end: string }[];
  documents_present: string[];
  evidence: Record<string, Evidence>; // key = field path, e.g. "income.months[2].credits_aed"
};

// One row of rules/rules.json, built from docs/rules-research.md (only H/M confidence).
export type Rule = {
  id: string;
  moment: string;
  requirement: string;
  proof_field: string;
  threshold: string | number | null;
  source_url: string;
  source_type: "PRIMARY" | "SECONDARY";
  confidence: "H" | "M";
};

export type VerdictStatus = "READY" | "ALMOST" | "NOT_YET";

export type Verdict = {
  moment: string; // matches Rule.moment
  status: VerdictStatus;
  met: { rule_id: string; detail: string }[];
  missing: { rule_id: string; what_to_get: string; how_to_fix: string }[];
  sources: string[];
  eta_text?: string; // e.g. "about 10 more months of trading history"
};

// Relocation contracts. IncomeProfile remains the optional evidence contract above.
// Market facts, demo records, and user-reported progress must remain distinguishable.
export type WorkType = "employee" | "freelancer" | "self_employed";
export type CompanyJurisdiction = "mainland" | "adgm" | "kezad";
export type RelocationCategory = "housing" | "workspace" | "setup" | "residence" | "insurance" | "finance";

export type SourceRecord = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: "government" | "regulator" | "provider" | "property_portal";
  checkedAt: string;
  publishedAt?: string;
  confidence: "high" | "medium";
  verification: "page_opened" | "search_only" | "access_blocked";
  supportedClaims: string[];
  limitations: string[];
};

export type AreaRecord = {
  id: string;
  name: string;
  summary: string;
  sourceIds: string[];
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  areaId: string;
  address: string;
  kind: "coworking" | "serviced_office";
  actionUrl: string;
  actionLabel: "Open venue website" | "Open booking page" | "Open contact page";
  priceAed: number | null;
  sourceIds: string[];
};

export type OfficialServiceRecord = {
  id: string;
  title: string;
  category: RelocationCategory;
  authority: string;
  audience: "person" | "employer" | "company_setup";
  jurisdictions: CompanyJurisdiction[];
  workTypes: WorkType[];
  actionUrl: string;
  nextAction: string;
  requirements: string[];
  sourceIds: string[];
  limitations: string[];
};

export type FinancialReadinessFactor = {
  id: string;
  title: string;
  detail: string;
  sourceIds: string[];
  providerDecides: true;
};

export type ReferenceCatalog = {
  version: string;
  checkedAt: string;
  sources: SourceRecord[];
  areas: AreaRecord[];
  workspaces: WorkspaceRecord[];
  services: OfficialServiceRecord[];
  financialFactors: FinancialReadinessFactor[];
};

export type HousingPolicy = {
  annualAllowanceAed: number;
  maxRentShareOfIncome: number; // Planning assumption selected by the program/person, never a government rule.
};

export type Household = { adults: number; children: number };
export type IncomeRange = { minMonthlyAed: number; maxMonthlyAed: number };
export type PersonProfile = {
  id: string;
  displayName: string;
  workType: WorkType;
  household: Household;
  income: IncomeRange;
  preferredAreaIds: string[];
  planningContext?: {
    nationality: string;
    purposeOfMove: string;
    employmentStatus: string;
    sponsor: string;
    alreadyInUae: string;
    documentsAvailable: string[];
    completedSteps: string[];
  };
  createdAt: string;
  updatedAt: string;
  synthetic: boolean;
  privateEvidence?: {
    incomeDocuments: string[];
    identityEvidence: string[];
    bankResults: string[];
  };
};

export type Organization = { id: string; name: string; createdAt: string; synthetic: boolean };
export type MoveProgram = {
  id: string;
  organizationId: string;
  hasUaeEntity: boolean;
  jurisdiction?: CompanyJurisdiction;
  officeAreaId: string;
  teamSize: number;
  moveDate: string;
  housingPolicy: HousingPolicy;
  createdAt: string;
  synthetic: boolean;
};

export type RelocationCase = {
  id: string;
  personId: string;
  programId: string | null;
  housingPolicy: HousingPolicy;
  sharedWithEmployer: boolean;
  selectedListingId: string | null;
  createdAt: string;
};

export type ActionState = "not_started" | "saved" | "opened" | "reported_submitted" | "reported_booked" | "confirmed" | "blocked";
export type StatusSource = {
  kind: "system" | "user_report" | "hr_report" | "provider";
  actorId: string;
  label: string;
  reference?: string;
};
export type StatusEvent = {
  id: string;
  caseId: string;
  taskId: string;
  state: ActionState;
  source: StatusSource;
  updatedAt: string;
  owner: string;
  nextAction: string;
  blocker: string | null;
};
export type RelocationTask = {
  id: string;
  caseId: string;
  title: string;
  category: RelocationCategory;
  resourceId: string | null;
  actionUrl: string | null;
  sourceIds: string[];
  sharedWithEmployer: boolean;
  state: ActionState;
  source: StatusSource;
  updatedAt: string;
  owner: string;
  nextAction: string;
  blocker: string | null;
};

export type ConsentField = "income" | "income_documents" | "identity_evidence" | "bank_results";
export type ConsentGrant = {
  id: string;
  personId: string;
  recipient: { type: "organization" | "provider"; id: string; name: string };
  fields: ConsentField[];
  grantedAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type RentalHome = {
  id: string;
  title: string;
  imageUrl?: string;
  imageAlt?: string;
  imageSourceUrl?: string;
  area: string;
  areaId: string;
  annualRentAed: number;
  bedrooms: number;
  bathrooms: number | null;
  sizeSqft: number | null;
  synthetic: boolean;
  source: "dubizzle" | "propertyfinder" | "synthetic";
  sourceUrl: string | null;
  listingUrl: string | null;
  checkedAt: string;
  sourceKind: "live" | "snapshot" | "synthetic";
  contactable: boolean;
  availability: "unconfirmed" | "illustrative";
};
export type HousingMatch = {
  home: RentalHome;
  annualBudgetAed: number;
  monthlyRentAed: number;
  score: number;
  reasons: string[];
};
export type HousingSearchResult = {
  matches: HousingMatch[];
  excluded: { listingId: string; reasons: string[] }[];
  annualBudgetAed: number;
  assumptions: string[];
};
