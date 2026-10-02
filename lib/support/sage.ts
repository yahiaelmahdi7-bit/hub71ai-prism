import { createRequire } from "node:module";

export type SageAction = {
  kind: "navigate";
  label: string;
  href: string;
  note: string;
};

export type SageSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
};

export type SageReply = {
  mode: "local_navigator";
  assistant: "Sage";
  message: string;
  actions: SageAction[];
  sources: SageSource[];
};

type Intent = "start" | "company" | "join" | "areas" | "homes" | "setup" | "timeline" | "finance" | "support";

const require = createRequire(import.meta.url);
const catalog = require("../../data/abu-dhabi/catalog.json") as { sources: SageSource[] };

const ROUTES: Record<Intent, SageAction[]> = {
  start: [
    { kind: "navigate", label: "Choose move type", href: "/start", note: "Pick My move, Join my company's move, or Move my team." },
    { kind: "navigate", label: "Create my private hub", href: "/move", note: "Use work type, household and income range to build your plan." },
  ],
  company: [
    { kind: "navigate", label: "Create company move", href: "/company", note: "Set entity status, office area, team size, move date and allowance." },
    { kind: "navigate", label: "Open HR dashboard", href: "/company/dashboard", note: "View aggregate progress, policy fit and shared blockers only." },
  ],
  join: [
    { kind: "navigate", label: "Join company move", href: "/join", note: "Use an invite link and keep your personal plan private." },
    { kind: "navigate", label: "Open private hub", href: "/move", note: "Continue your own move after joining." },
  ],
  areas: [
    { kind: "navigate", label: "Compare areas", href: "/areas", note: "Open source-backed Abu Dhabi area guides." },
    { kind: "navigate", label: "Filter my workspace", href: "/move#areas", note: "Use one area filter across homes, workspaces and setup." },
  ],
  homes: [
    { kind: "navigate", label: "Open homes in my hub", href: "/move#homes", note: "Shows only homes that pass affordability and policy filters." },
    { kind: "navigate", label: "Review housing sources", href: "/homes", note: "See how dated listings and synthetic examples are separated." },
  ],
  setup: [
    { kind: "navigate", label: "Open setup actions", href: "/move#setup", note: "Track official and provider handoffs from your private hub." },
    { kind: "navigate", label: "Compare setup routes", href: "/setup", note: "Mainland, ADGM and KEZAD stay separate." },
    { kind: "navigate", label: "Use for company move", href: "/company", note: "Create a move program with the right jurisdiction and office area." },
  ],
  timeline: [
    { kind: "navigate", label: "Open move roadmap", href: "/move#timeline", note: "See source, time, owner and next action for each event." },
    { kind: "navigate", label: "Edit my plan", href: "/move/profile", note: "Update inputs without losing timeline history." },
  ],
  finance: [
    { kind: "navigate", label: "Open budget and finance", href: "/move#budget", note: "Review budget and bank readiness factors." },
    { kind: "navigate", label: "Open setup actions", href: "/move#setup", note: "Bank and official actions remain provider-owned." },
  ],
  support: [
    { kind: "navigate", label: "Start a move", href: "/start", note: "Begin with the right journey." },
    { kind: "navigate", label: "Explore areas", href: "/areas", note: "Compare areas before ranking homes." },
  ],
};

const SOURCE_IDS: Record<Intent, string[]> = {
  start: ["uae-leasing", "uae-work-permits"],
  company: ["added-licensing", "adgm-registration", "kezad-setup"],
  join: ["uae-working-residence", "uae-health-insurance"],
  areas: ["adrec-rental-index", "adgm-office-space", "masdar-city-about"],
  homes: ["uae-leasing", "adrec-rental-index"],
  setup: ["added-licensing", "adgm-registration", "kezad-setup"],
  timeline: ["uae-work-permits", "uae-leasing"],
  finance: ["cbuae-mortgage-ratios", "enbd-current-account"],
  support: ["uae-leasing", "added-licensing"],
};

const ALLOWED_HREF = /^\/(?:$|start$|move(?:$|\/profile$|#[a-z-]+$)|company(?:$|\/dashboard$)|join$|areas$|homes$|setup$)/;

export function createSageReply(input: { message: string; path?: string }): SageReply {
  const text = normalize(input.message);
  const path = normalize(input.path ?? "");
  const intent = detectIntent(text, path);
  const actions = ROUTES[intent].filter((action) => ALLOWED_HREF.test(action.href));

  return {
    mode: "local_navigator",
    assistant: "Sage",
    message: messageFor(intent),
    actions,
    sources: sourcesFor(intent),
  };
}

export function detectIntent(text: string, path = ""): Intent {
  const combined = `${text} ${path}`;
  if (matches(combined, ["join", "invite link", "token"])) return "join";
  if (matches(combined, ["setup", "licence", "license", "mainland", "adgm", "kezad", "visa", "permit", "residence", "green"])) return "setup";
  if (matches(combined, ["company", "hr", "team", "employee", "allowance", "invite", "dashboard"])) return "company";
  if (matches(combined, ["area", "where", "reem", "maryah", "yas", "masdar", "khalifa", "raha", "saadiyat"])) return "areas";
  if (matches(combined, ["home", "rent", "listing", "agent", "housing", "apartment", "villa"])) return "homes";
  if (matches(combined, ["roadmap", "timeline", "status", "blocker", "opened", "submitted", "booking"])) return "timeline";
  if (matches(combined, ["bank", "finance", "mortgage", "budget", "income", "salary", "loan", "account"])) return "finance";
  if (matches(combined, ["start", "begin", "move type", "first"])) return "start";
  return "support";
}

function messageFor(intent: Intent) {
  if (intent === "company") return "I can get HR to the company move flow. Create the program first, then Sage can guide you back to the dashboard to create invite links and review aggregate blockers. I cannot see private employee income, documents or bank results.";
  if (intent === "join") return "Use the invite flow to connect to the company move while keeping your personal housing, finance and identity evidence private. HR sees only aggregate progress and shared blockers unless you grant specific consent.";
  if (intent === "areas") return "Area choice should shape the shortlist, not replace evidence. Start with the area guide, then use the workspace filter so homes, workspaces and setup actions stay aligned.";
  if (intent === "homes") return "Open homes from the private hub so Yala AD applies affordability and allowance filters first. Synthetic planning examples stay labeled and never get contact buttons.";
  if (intent === "setup") return "Choose the setup route before opening official services. Mainland, ADGM and KEZAD use different paths; Yala AD records opened handoffs only and the provider owns submissions and approvals.";
  if (intent === "timeline") return "The roadmap shows each action with source, time, owner and next action. Opening a portal is recorded as opened only; user-reported statuses stay labeled as user reports.";
  if (intent === "finance") return "Finance is readiness, not approval prediction. Review budget, document readiness and provider-owned bank factors without sharing private evidence in chat.";
  if (intent === "start") return "Start with the journey type. A person needs work type, household and income range; a company needs entity status, office area, team size, move date and housing allowance.";
  return "I am Sage, the Yala AD support navigator. I can route you through the relocation app, explain source-backed steps and help you prepare a setup path. I cannot submit government forms, confirm provider status, or inspect private evidence from this chat.";
}

function sourcesFor(intent: Intent): SageSource[] {
  const sourceIds = new Set(SOURCE_IDS[intent]);
  return catalog.sources
    .filter((source) => sourceIds.has(source.id))
    .slice(0, 3)
    .map((source) => ({ id: source.id, title: source.title, publisher: source.publisher, url: source.url, checkedAt: source.checkedAt }));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 1200);
}

function matches(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}
