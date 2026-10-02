import referenceCatalog from "../../data/abu-dhabi/catalog.json" with { type: "json" };
import demoMove from "../../data/demo/established-company-move.json" with { type: "json" };
import { getRentalCatalog, toAreaId } from "../properties/catalog.ts";
import { matchHomes } from "../properties/match.ts";
import type {
  ConsentGrant,
  HrProgramView,
  HousingSearchResult,
  MoveProgram,
  Organization,
  PersonProfile,
  PublicPersonHub,
  Recommendation,
  RelocationCase,
  RelocationCategory,
  RelocationStoreData,
  RelocationTask,
  SourceRecord,
  StatusEvent,
} from "./types.ts";

const CHECKED_AT = "2026-10-02T10:50:00+04:00";
const CREATED_AT = "2026-10-02T10:50:00+04:00";
const BANKABLE_SOURCE = {
  kind: "system" as const,
  actorId: "bankable-demo-engine",
  label: "Bankable deterministic demo engine",
};

type DemoEmployee = (typeof demoMove.employees)[number];

export function createEstablishedCompanyDemo(createdAt = CREATED_AT): RelocationStoreData {
  const organization: Organization = {
    id: demoMove.organization.id,
    name: demoMove.organization.name,
    createdAt,
    synthetic: true,
  };
  const program: MoveProgram = {
    id: demoMove.program.id,
    organizationId: organization.id,
    hasUaeEntity: demoMove.organization.hasUaeEntity,
    jurisdiction: "adgm",
    officeAreaId: toAreaId(demoMove.program.officeArea),
    teamSize: demoMove.program.teamSize,
    moveDate: demoMove.program.moveDate,
    housingPolicy: {
      annualAllowanceAed: demoMove.program.housingAllowanceAnnualAed,
      maxRentShareOfIncome: 0.33,
    },
    createdAt,
    synthetic: true,
  };
  const people = demoMove.employees.map((employee) => personFromDemo(employee, createdAt));
  const cases: RelocationCase[] = people.map((person) => {
    const employee = required(demoMove.employees.find((item) => item.personId === person.id), "Missing demo employee");
    return {
      id: employee.caseId,
      personId: person.id,
      programId: program.id,
      housingPolicy: program.housingPolicy,
      sharedWithEmployer: true,
      selectedListingId: null,
      createdAt,
    };
  });
  const tasks = cases.flatMap((relocationCase) => baseTasks(program, relocationCase.id, createdAt));
  const recommendations = Object.fromEntries(
    cases.map((relocationCase) => {
      const person = required(people.find((item) => item.id === relocationCase.personId), "Missing person");
      return [relocationCase.id, buildRecommendations(person, program)];
    }),
  );

  return {
    people,
    organizations: [organization],
    programs: [program],
    cases,
    tasks,
    recommendations,
    events: seedEvents(cases, tasks, createdAt),
    consents: [],
    sessions: [],
    pendingInvites: [],
  };
}

export function buildRecommendations(profile: PersonProfile, program: MoveProgram | null): Recommendation[] {
  const search = housingSearchFor(profile, program?.housingPolicy);
  const catalog = getRentalCatalog();
  const homes: Recommendation[] = [
    ...search.matches.filter((match) => match.home.sourceKind === "snapshot"),
    ...search.matches.filter((match) => match.home.sourceKind !== "snapshot"),
  ].slice(0, 3).map((match) => ({
    id: `home-${match.home.id}-${profile.id}`,
    type: "home" as const,
    home: match.home,
    affordable: match.home.annualRentAed <= search.annualBudgetAed,
    policyFit: !program || match.home.annualRentAed <= program.housingPolicy.annualAllowanceAed,
    canContact: match.home.contactable,
    reasons: [
      ...match.reasons,
      match.home.availability === "unconfirmed"
        ? "Availability is unconfirmed; open the original listing before contacting."
        : "Illustrative planning option only.",
    ],
    sources: sourceRecordsForHome(catalog.sources, match.home),
  }));

  return [
    ...homes,
    ...workspaceRecommendations(profile),
    ...serviceRecommendations(profile, program),
    financeRecommendation(profile, program),
  ];
}

export function personHub(data: RelocationStoreData, personId: string, activeCaseId?: string): PublicPersonHub {
  const profile = required(data.people.find((person) => person.id === personId), `Unknown person ${personId}`);
  const personCases = data.cases.filter((item) => item.personId === personId);
  const relocationCase = required(
    activeCaseId ? personCases.find((item) => item.id === activeCaseId) : personCases.at(-1),
    `No case for ${personId}`,
  );
  const recommendations = data.recommendations[relocationCase.id] ?? [];
  const housingSearch = housingSearchFor(profile, relocationCase.housingPolicy);
  const { privateEvidence, ...publicProfile } = profile;
  void privateEvidence;

  return {
    profile: publicProfile,
    case: relocationCase,
    tasks: data.tasks.filter((task) => task.caseId === relocationCase.id),
    recommendations,
    timeline: data.events.filter((event) => event.caseId === relocationCase.id),
    housingSearch,
    budget: {
      minMonthlyIncomeAed: profile.income.minMonthlyAed,
      annualBudgetAed: housingSearch.annualBudgetAed,
      policyAllowanceAnnualAed: relocationCase.housingPolicy.annualAllowanceAed,
      estimatedInitialCashAed: null,
      paymentTermsUnknown: true,
      paymentTermsNote: "Initial cash need is unknown until the listing or provider confirms deposit, commission, cheque schedule and handover terms.",
    },
    financeReadiness: financeFactors(profile, relocationCase.housingPolicy),
  };
}

export function hrProgramView(data: RelocationStoreData, programId: string, organizationId: string): HrProgramView {
  const program = required(data.programs.find((item) => item.id === programId), `Unknown program ${programId}`);
  if (program.organizationId !== organizationId) throw new Error("Organization cannot view this program.");
  const organization = required(data.organizations.find((item) => item.id === organizationId), `Unknown organization ${organizationId}`);
  const cases = data.cases.filter((item) => item.programId === program.id && item.sharedWithEmployer);
  const pendingInvites = (data.pendingInvites ?? []).filter((invite) => invite.programId === program.id && !invite.acceptedAt);
  const employees = cases.map((relocationCase) => {
    const person = required(data.people.find((item) => item.id === relocationCase.personId), `Missing profile ${relocationCase.personId}`);
    const events = data.events.filter((event) => event.caseId === relocationCase.id);
    const latestByTask = new Map<string, StatusEvent>();
    for (const event of events) latestByTask.set(event.taskId, event);
    const tasks = data.tasks.filter((task) => task.caseId === relocationCase.id && task.sharedWithEmployer);
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    const homeRecommendations = (data.recommendations[relocationCase.id] ?? []).filter(
      (item): item is Extract<Recommendation, { type: "home" }> => item.type === "home",
    );
    const sharedPrivateScopes = consentFieldsFor(data.consents, person.id, "organization", organization.id);
    return {
      caseId: relocationCase.id,
      personId: person.id,
      displayName: person.displayName,
      inviteAccepted: events.some((event) => event.taskId.startsWith("invite-") && event.state !== "not_started"),
      housingPolicyFit:
        homeRecommendations.length === 0
          ? "no_home_shortlist" as const
          : homeRecommendations.some((item) => item.policyFit)
            ? "fits" as const
            : "over_allowance" as const,
      milestones: tasks.map((task) => {
          const latest = latestByTask.get(task.id);
          return {
            category: task.category,
            state: latest?.state ?? task.state,
            owner: latest?.owner ?? task.owner,
            nextAction: task.nextAction,
          };
        }),
      blockers: tasks
        .map((task) => latestByTask.get(task.id))
        .filter((event): event is StatusEvent => event !== undefined && event.state === "blocked")
        .map((event) => {
          const task = required(tasksById.get(event.taskId), "Missing shared task");
          return `${task.category}: ${event.owner} next action - ${task.nextAction}`;
        }),
      sharedPrivateScopes,
    };
  });

  return {
    program,
    organization,
    aggregate: {
      invited: cases.length + pendingInvites.length,
      accepted: employees.filter((employee) => employee.inviteAccepted).length,
      cases: cases.length,
      blocked: employees.filter((employee) => employee.blockers.length > 0).length,
      policyFit: employees.filter((employee) => employee.housingPolicyFit === "fits").length,
      openedHandoffs: data.events.filter((event) => {
        if (event.state !== "opened") return false;
        if (!cases.some((item) => item.id === event.caseId)) return false;
        const task = data.tasks.find((item) => item.id === event.taskId);
        return task?.sharedWithEmployer === true;
      }).length,
    },
    employees,
  };
}

export function housingSearchFor(
  profile: PersonProfile,
  policy = { annualAllowanceAed: Number.MAX_SAFE_INTEGER, maxRentShareOfIncome: 0.33 },
  homes = [...getRentalCatalog().snapshot, ...getRentalCatalog().synthetic],
): HousingSearchResult {
  return matchHomes(
    { household: profile.household, income: profile.income, preferredAreaIds: profile.preferredAreaIds },
    policy,
    homes,
  );
}

export function financeFactors(profile: PersonProfile, policy = { annualAllowanceAed: 0, maxRentShareOfIncome: 0.33 }) {
  const blockedBy = ["No lender result or provider evidence has been shared with Bankable for this private plan."];
  if ((profile.privateEvidence?.bankResults.length ?? 0) > 0) {
    blockedBy.push("Existing bank-result references stay private unless shared by recipient-specific consent.");
  }
  return {
    factors: [
      "CBUAE important ratios require lender review of income, obligations and mortgage exposure before approval.",
      "Deposit, agency fee, cheque schedule and move-in cash are unknown until the listing or provider confirms terms.",
      policy.annualAllowanceAed === Number.MAX_SAFE_INTEGER
        ? "No company housing allowance is attached; affordability uses the person's private income range and planning rent-share assumption."
        : `Housing allowance caps annual rent at AED ${policy.annualAllowanceAed.toLocaleString("en-US")}; affordability still uses the person's private income range.`,
      "Only the lender can approve or pre-approve a product; Bankable shows readiness factors only.",
    ],
    blockedBy,
    noApprovalProbability: true as const,
  };
}

function personFromDemo(employee: DemoEmployee, createdAt: string): PersonProfile {
  return {
    id: employee.personId,
    displayName: employee.name,
    workType: employee.workType === "employee" ? "employee" : "self_employed",
    household: householdFromDemo(employee.household),
    income: { minMonthlyAed: employee.monthlyIncomeAed, maxMonthlyAed: employee.monthlyIncomeAed },
    preferredAreaIds: employee.preferredAreas.map(toAreaId),
    createdAt,
    updatedAt: createdAt,
    synthetic: true,
    privateEvidence: {
      incomeDocuments: employee.privateDocuments.filter((kind) => !kind.includes("id") && !kind.includes("passport")),
      identityEvidence: employee.privateDocuments.filter((kind) => kind.includes("id") || kind.includes("passport")),
      bankResults: [],
    },
  };
}

function householdFromDemo(household: string) {
  if (household === "single") return { adults: 1, children: 0 };
  if (household === "couple") return { adults: 2, children: 0 };
  if (household === "couple_with_child") return { adults: 2, children: 1 };
  return { adults: 2, children: 2 };
}

function baseTasks(program: MoveProgram, caseId: string, updatedAt: string): RelocationTask[] {
  const jurisdiction = program.jurisdiction;
  const setupService = jurisdiction
    ? referenceCatalog.services.find((service) => service.audience === "company_setup" && service.jurisdictions.includes(jurisdiction))
    : undefined;
  const residenceService = jurisdiction
    ? referenceCatalog.services.find((service) => service.audience === "employer" && service.category === "residence" && service.jurisdictions.includes(jurisdiction))
    : undefined;

  return [
    task(caseId, "housing", "Shortlist a home within policy and cash budget", "person", null, null, "Open a contactable observed listing or keep a synthetic planning option saved.", true, updatedAt),
    task(caseId, "workspace", "Choose a work base near office or shortlisted area", "person", null, null, "Open provider booking or contact page.", true, updatedAt),
    task(
      caseId,
      "setup",
      setupService?.title ?? "Confirm company jurisdiction before establishment handoff",
      "organization",
      setupService?.sourceIds[0] ?? null,
      setupService?.actionUrl ?? null,
      setupService?.nextAction ?? "Confirm whether the entity route is mainland, ADGM, or KEZAD before opening an official service.",
      true,
      updatedAt,
    ),
    task(
      caseId,
      "residence",
      residenceService?.title ?? "Track employee permit and residence handoff",
      "organization",
      residenceService?.sourceIds[0] ?? null,
      residenceService?.actionUrl ?? null,
      residenceService?.nextAction ?? "Confirm the employer route before opening a work-permit or residence provider channel.",
      true,
      updatedAt,
    ),
    task(caseId, "insurance", "Arrange Abu Dhabi health insurance", "organization", "uae-health-insurance", "https://u.ae/en/information-and-services/health-and-fitness/getting-a-health-insurance", "Employer or broker confirms policy status; Bankable records only evidence-backed updates.", true, updatedAt),
    task(caseId, "finance", "Review bank and mortgage readiness factors", "person", "cbuae-mortgage-ratios", "https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios", "Open lender application only when the person chooses to share specific information.", false, updatedAt),
  ];
}

function task(
  caseId: string,
  category: RelocationCategory,
  title: string,
  owner: string,
  resourceId: string | null,
  actionUrl: string | null,
  nextAction: string,
  sharedWithEmployer: boolean,
  updatedAt: string,
): RelocationTask {
  return {
    id: `task-${category}-${caseId}`,
    caseId,
    title,
    category,
    resourceId,
    actionUrl,
    sourceIds: resourceId ? [resourceId] : [],
    sharedWithEmployer,
    state: "not_started",
    source: { ...BANKABLE_SOURCE },
    updatedAt,
    owner,
    nextAction,
    blocker: null,
  };
}

function seedEvents(cases: RelocationCase[], tasks: RelocationTask[], updatedAt: string): StatusEvent[] {
  return cases.flatMap((relocationCase, index) => {
    const housingTask = required(tasks.find((item) => item.caseId === relocationCase.id && item.category === "housing"), "Missing housing task");
    return [
      {
        id: `event-${relocationCase.id}-invite`,
        caseId: relocationCase.id,
        taskId: `invite-${relocationCase.personId}`,
        state: index < 4 ? "saved" : "not_started",
        source: { ...BANKABLE_SOURCE },
        updatedAt,
        owner: "person",
        nextAction: index < 4 ? "Continue private move plan." : "Employee opens invite before expiry.",
        blocker: null,
      },
      {
        id: `event-${relocationCase.id}-housing`,
        caseId: relocationCase.id,
        taskId: housingTask.id,
        state: index === 2 ? "blocked" : "not_started",
        source: { ...BANKABLE_SOURCE },
        updatedAt,
        owner: "person",
        nextAction: index === 2 ? "Review family-sized homes against allowance." : "Shortlist one home.",
        blocker: index === 2 ? "Family-sized preferred areas are tight against allowance." : null,
      },
    ];
  });
}

function workspaceRecommendations(profile: PersonProfile): Recommendation[] {
  return referenceCatalog.workspaces.slice(0, 2).map((workspace) => ({
    id: `workspace-${workspace.id}-${profile.id}`,
    type: "workspace" as const,
    title: workspace.name,
    areaId: workspace.areaId,
    actionUrl: workspace.actionUrl,
    actionLabel: workspace.actionLabel,
    canContact: true,
    category: "workspace" as const,
    resourceId: workspace.id,
    reasons: ["Public workspace provider page.", workspace.address],
    sources: sourcesForIds(workspace.sourceIds),
  }));
}

function serviceRecommendations(profile: PersonProfile, program: MoveProgram | null): Recommendation[] {
  const jurisdiction = program?.jurisdiction;
  const services = referenceCatalog.services
    .filter((service) => service.audience !== "company_setup")
    .filter((service) => service.workTypes.includes(profile.workType))
    .filter((service) => service.audience !== "employer" || Boolean(program))
    .filter((service) => service.audience !== "employer" || Boolean(jurisdiction))
    .filter((service) => !jurisdiction || service.jurisdictions.includes(jurisdiction));
  const recommendations: Recommendation[] = services.map((service) => ({
      id: `service-${service.id}-${profile.id}`,
      type: "official_service" as const,
      title: service.title,
      areaId: program?.officeAreaId ?? null,
      actionUrl: service.actionUrl,
      actionLabel: "Open official service",
      canContact: true,
      category: service.category as RelocationCategory,
      resourceId: service.id,
      reasons: [service.nextAction, ...service.limitations.slice(0, 1)],
      sources: sourcesForIds(service.sourceIds),
    }));
  if (program && !jurisdiction) {
    recommendations.unshift({
      id: `service-confirm-employer-channel-${profile.id}`,
      type: "official_service" as const,
      title: "Confirm employer jurisdiction before official setup handoff",
      areaId: program.officeAreaId,
      actionUrl: null,
      actionLabel: null,
      canContact: false,
      category: "setup" as const,
      resourceId: "confirm-employer-channel",
      reasons: [
        "HR must confirm whether this move uses mainland, ADGM, or KEZAD before Bankable recommends a specific work-permit, residence, or setup channel.",
        "Bankable should not present all jurisdiction branches as one generic legal checklist.",
      ],
      sources: [],
    });
  }
  return recommendations;
}

function financeRecommendation(profile: PersonProfile, program: MoveProgram | null): Recommendation {
  return {
    id: `finance-readiness-${profile.id}`,
    type: "finance_readiness",
    title: "Finance readiness factors",
    areaId: null,
    actionUrl: null,
    actionLabel: null,
    canContact: false,
    category: "finance" as const,
    resourceId: "cbuae-mortgage-ratios",
    reasons: financeFactors(profile, program?.housingPolicy ?? { annualAllowanceAed: Number.MAX_SAFE_INTEGER, maxRentShareOfIncome: 0.33 }).factors,
    sources: [
      sourceRecord(
        "cbuae-mortgage-ratios",
        "Mortgage loan important ratios",
        "Central Bank of the UAE",
        "https://rulebook.centralbank.ae/en/rulebook/article-3-important-ratios",
        "regulator",
      ),
    ],
  };
}

function sourceRecordsForHome(sources: SourceRecord[], home: { sourceUrl: string | null; checkedAt: string }) {
  const found = sources.find((source) => source.url === home.sourceUrl);
  if (found) return [found];
  return [
    sourceRecord(
      "synthetic-property-calibration",
      "Synthetic rental calibration",
      "Bankable demo",
      "data/property-calibration.json",
      "property_portal",
      home.checkedAt,
      "medium",
    ),
  ];
}

function sourcesForIds(sourceIds: string[]) {
  return sourceIds
    .map((sourceId) => referenceCatalog.sources.find((source) => source.id === sourceId))
    .filter((source): source is SourceRecord => Boolean(source));
}

function sourceRecord(
  id: string,
  title: string,
  publisher: string,
  url: string,
  kind: SourceRecord["kind"],
  checkedAt = CHECKED_AT,
  confidence: SourceRecord["confidence"] = "high",
): SourceRecord {
  return {
    id,
    title,
    publisher,
    url,
    kind,
    checkedAt,
    confidence,
    verification: "page_opened",
    supportedClaims: [],
    limitations: ["Status and final outcome remain with the responsible provider or authority."],
  };
}

export function consentFieldsFor(
  consents: ConsentGrant[],
  personId: string,
  recipientType: ConsentGrant["recipient"]["type"],
  recipientId: string,
) {
  const at = Date.now();
  return Array.from(
    new Set(
      consents
        .filter(
          (grant) =>
            grant.personId === personId &&
            grant.recipient.type === recipientType &&
            grant.recipient.id === recipientId &&
            !grant.revokedAt &&
            Date.parse(grant.expiresAt) > at,
        )
        .flatMap((grant) => grant.fields),
    ),
  );
}

function required<T>(value: T | undefined, message: string): T {
  if (!value) throw new Error(message);
  return value;
}
