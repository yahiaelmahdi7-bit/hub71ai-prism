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
