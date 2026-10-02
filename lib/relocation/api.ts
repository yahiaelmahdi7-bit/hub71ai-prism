import crypto from "node:crypto";
import { buildRecommendations, canonicalizeRecommendations, createEstablishedCompanyDemo, hrProgramView, personHub } from "./data.ts";
import { getRentalCatalog } from "../properties/catalog.ts";
import { SqliteRelocationStore, defaultStorePath } from "./store.ts";
import { grantConsent, hashToken, randomToken, recordExternalOpen, reportManualStatus, revokeConsent } from "./status.ts";
import type {
  CapabilityActor,
  CapabilitySession,
  MoveProgram,
  PendingInvite,
  PersonProfile,
  RelocationCase,
  RelocationStoreData,
  RelocationTask,
} from "./types.ts";

export const relocationStore = new SqliteRelocationStore(defaultStorePath());

type ProfileInput = Record<string, unknown>;

const VALID_JURISDICTIONS = new Set(["mainland", "adgm", "kezad"]);
const AREA_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function json(payload: unknown, status = 200) {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export function jsonError(error: unknown, status: number) {
  const responseStatus = error instanceof PrototypeSessionsDisabledError ? 503 : status;
  return json({ error: error instanceof Error ? error.message : "Unknown relocation API error." }, responseStatus);
}

export function liveDemoBootstrapAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.YALA_LIVE_DEMO === "true";
}

function prototypeSessionsAllowed() {
  return process.env.NODE_ENV !== "production";
}

class PrototypeSessionsDisabledError extends Error {
  constructor() {
    super(process.env.NODE_ENV === "production" && process.env.YALA_LIVE_DEMO === "true"
      ? "This hackathon deployment accepts demo-scoped profiles and company programs only. Do not enter sensitive identity or financial documents."
      : "Prototype relocation sessions are disabled in production. Configure production identity and durable storage before enabling these routes.");
    this.name = "PrototypeSessionsDisabledError";
  }
}

export async function seedDemoWithCapabilities() {
  if (!liveDemoBootstrapAllowed()) throw new PrototypeSessionsDisabledError();
  const demo = createEstablishedCompanyDemo();
  const programId = "program-falcon-october-2026";
  const organizationId = "org-falcon-analytics";
  let response: { programId: string; hrSessionToken: string; hrView: ReturnType<typeof hrProgramView>; employees: { personId: string; displayName: string; sessionToken: string }[]; views: ReturnType<typeof personHub>[] } | null = null;

  await relocationStore.update((current) => {
    const hasDemo = current.programs.some((program) => program.id === demo.programs[0]?.id);
    const data: RelocationStoreData = hasDemo
      ? current
      : {
          ...current,
          people: [...current.people, ...demo.people],
          organizations: [...current.organizations, ...demo.organizations],
          programs: [...current.programs, ...demo.programs],
          cases: [...current.cases, ...demo.cases],
          tasks: [...current.tasks, ...demo.tasks],
          recommendations: { ...current.recommendations, ...demo.recommendations },
          events: [...current.events, ...demo.events],
          consents: current.consents,
          sessions: current.sessions,
          pendingInvites: current.pendingInvites ?? [],
        };
    const organization = requiredOrganization(data, organizationId);
    const program = requiredProgram(data, programId);
    const people = data.people.filter((person) => data.cases.some((relocationCase) => relocationCase.programId === program.id && relocationCase.personId === person.id));
    const { token: hrSessionToken, session: hrSession } = createSession({
      kind: "organization",
      id: `session-hr-falcon-${crypto.randomUUID()}`,
      label: `${organization.name} HR`,
      organizationId: organization.id,
      programId: program.id,
    }, true);
    const employeeTokens = people.map((person) => {
      const { token, session } = createSession({
        kind: "person",
        id: `session-${person.id}-${crypto.randomUUID()}`,
        label: person.displayName,
        personId: person.id,
        activeCaseId: data.cases.find((relocationCase) => relocationCase.programId === program.id && relocationCase.personId === person.id)?.id,
      }, true);
      return { person, token, session };
    });

    const nextData = { ...data, sessions: [...data.sessions, hrSession, ...employeeTokens.map((item) => item.session)] };
    response = {
      programId: program.id,
      hrSessionToken,
      hrView: hrProgramView(nextData, program.id, organization.id),
      employees: employeeTokens.map(({ person, token }) => ({
        personId: person.id,
        displayName: person.displayName,
        sessionToken: token,
      })),
      views: employeeTokens.map(({ person, session }) => personHub(nextData, person.id, session.actor.kind === "person" ? session.actor.activeCaseId : undefined)),
    };

    return nextData;
  }, false);

  if (!response) throw new Error("Demo bootstrap failed.");
  return response;
}

export async function readSeeded() {
  return canonicalizeRecommendations(await relocationStore.read(false));
}

export async function requireActor(request: Request): Promise<{ data: RelocationStoreData; actor: CapabilityActor }> {
  if (!prototypeSessionsAllowed() && !liveDemoBootstrapAllowed()) throw new PrototypeSessionsDisabledError();
  const token = bearerToken(request);
  if (!token) throw new Error("Bearer session token is required.");
  const data = await readSeeded();
  const session = data.sessions.find((item) => item.tokenHash === hashToken(token));
  if (!session) throw new Error("Session token is invalid.");
  if (!prototypeSessionsAllowed() && (!liveDemoBootstrapAllowed() || session.demoOnly !== true)) {
    throw new PrototypeSessionsDisabledError();
  }
  if (Date.parse(session.expiresAt) <= Date.now()) throw new Error("Session token has expired.");
  return { data, actor: session.actor };
}

export function publicProfile(profile: PersonProfile) {
  const { privateEvidence, ...safe } = profile;
  void privateEvidence;
  return safe;
}

export function requirePersonHub(data: RelocationStoreData, actor: CapabilityActor) {
  if (actor.kind !== "person") throw new Error("Person session is required.");
  return personHub(data, actor.personId, actor.activeCaseId);
}

export function requireHrView(data: RelocationStoreData, actor: CapabilityActor, programId: string) {
  if (actor.kind !== "organization" || actor.programId !== programId) throw new Error("HR session is required for this program.");
  return hrProgramView(data, programId, actor.organizationId);
}

export async function createProgram(body: Record<string, unknown>) {
  const createdAt = new Date().toISOString();
  const hasUaeEntity = requiredBoolean(body.hasUaeEntity, "hasUaeEntity");
  const jurisdiction = validJurisdiction(body.jurisdiction, hasUaeEntity);
  const organizationId = `org-${crypto.randomUUID()}`;
  const programId = `program-${crypto.randomUUID()}`;
  const organization = {
    id: organizationId,
    name: optionalString(body.organizationName, "New company move"),
    createdAt,
    synthetic: false,
  };
  const program: MoveProgram = {
    id: programId,
    organizationId,
    hasUaeEntity,
    jurisdiction,
    officeAreaId: requiredAreaId(body.officeAreaId, "officeAreaId"),
    teamSize: requiredWholeNumber(body.teamSize, "teamSize", 0),
    moveDate: requiredDate(body.moveDate, "moveDate"),
    housingPolicy: {
      annualAllowanceAed: requiredMoney(body.annualAllowanceAed, "annualAllowanceAed", 0),
      maxRentShareOfIncome: optionalShare(body.maxRentShareOfIncome, 0.33),
    },
    createdAt,
    synthetic: false,
  };
  const { token, session } = createSession({
    kind: "organization",
    id: `session-${organizationId}-${crypto.randomUUID()}`,
    label: `${organization.name} HR`,
    organizationId,
    programId,
  }, !prototypeSessionsAllowed());
  let nextData: RelocationStoreData | null = null;
  await relocationStore.update((current) => {
    nextData = {
      ...current,
      organizations: [...current.organizations, organization],
      programs: [...current.programs, program],
      sessions: [...current.sessions, session],
    };
    return nextData;
  }, false);
  if (!nextData) throw new Error("Company program creation failed.");
  return { hrSessionToken: token, program, view: hrProgramView(nextData, programId, organizationId) };
}

export async function createPrivateProfile(body: Record<string, unknown>) {
  const createdAt = new Date().toISOString();
  const profile = profileFromInput(body, createdAt);
  const relocationCase = personalCase(profile.id, null, personalHousingPolicy(body), false, createdAt);
  const tasks = personalTasks(relocationCase.id, createdAt, false);
  const { token, session } = createSession({ kind: "person", id: `session-${profile.id}-${crypto.randomUUID()}`, label: profile.displayName, personId: profile.id, activeCaseId: relocationCase.id }, !prototypeSessionsAllowed());
  let nextData: RelocationStoreData | null = null;
  await relocationStore.update((current) => {
    nextData = {
      ...current,
      people: [...current.people, profile],
      cases: [...current.cases, relocationCase],
      tasks: [...current.tasks, ...tasks],
      recommendations: { ...current.recommendations, [relocationCase.id]: buildRecommendations(profile, null) },
      sessions: [...current.sessions, session],
    };
    return nextData;
  }, false);
  if (!nextData) throw new Error("Private profile creation failed.");
  return { ...createProfileResponse(profile, relocationCase, token), view: requirePersonHub(nextData, session.actor) };
}

export async function updatePrivateProfile(request: Request, body: Record<string, unknown>) {
  const { actor } = await requireActor(request);
  if (actor.kind !== "person") throw new Error("Person session is required.");
  const updatedAt = new Date().toISOString();
  let view: ReturnType<typeof requirePersonHub> | null = null;

  await relocationStore.update((current) => {
    const existing = requiredPerson(current, actor.personId);
    const activeCase = activeCaseFor(current, actor);
    const mergedInput = {
      displayName: body.displayName ?? existing.displayName,
      workType: body.workType ?? existing.workType,
      adults: body.adults ?? existing.household.adults,
      children: body.children ?? existing.household.children,
      minMonthlyAed: body.minMonthlyAed ?? existing.income.minMonthlyAed,
      maxMonthlyAed: body.maxMonthlyAed ?? existing.income.maxMonthlyAed,
      preferredAreaIds: body.preferredAreaIds ?? existing.preferredAreaIds,
      planningContext: body.planningContext ?? existing.planningContext,
    };
    const validated = profileFromInput(mergedInput, existing.createdAt);
    const profile: PersonProfile = {
      ...existing,
      displayName: validated.displayName,
      workType: validated.workType,
      household: validated.household,
      income: validated.income,
      preferredAreaIds: validated.preferredAreaIds,
      planningContext: validated.planningContext,
      updatedAt,
    };
    const program = activeCase.programId ? current.programs.find((item) => item.id === activeCase.programId) ?? null : null;
    const next: RelocationStoreData = {
      ...current,
      people: current.people.map((item) => item.id === profile.id ? profile : item),
      recommendations: {
        ...current.recommendations,
        [activeCase.id]: buildRecommendations(profile, program),
      },
      sessions: current.sessions.map((session) => session.actor.kind === "person" && session.actor.personId === profile.id
        ? { ...session, actor: { ...session.actor, label: profile.displayName } }
        : session),
    };
    view = requirePersonHub(next, { ...actor, label: profile.displayName, activeCaseId: activeCase.id });
    return next;
  });

  if (!view) throw new Error("Profile update failed.");
  return { view };
}

export async function createInvite(request: Request, body: Record<string, unknown>) {
  const { actor } = await requireActor(request);
  if (actor.kind !== "organization") throw new Error("HR session is required to create invites.");
  const createdAt = new Date().toISOString();
  const expiresAt = optionalFutureDate(body.expiresAt, new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), "expiresAt");
  const inviteId = `invite-${crypto.randomUUID()}`;
  const token = randomToken();
  const invite: PendingInvite = {
    id: inviteId,
    programId: actor.programId,
    organizationId: actor.organizationId,
    tokenHash: hashToken(token),
    employeeLabel: typeof body.employeeLabel === "string" && body.employeeLabel.trim() ? body.employeeLabel.trim() : null,
    createdAt,
    expiresAt,
    acceptedAt: null,
    acceptedPersonId: null,
    ...(!prototypeSessionsAllowed() ? { demoOnly: true as const } : {}),
  };
  await relocationStore.update((current) => {
    requiredProgram(current, actor.programId);
    return { ...current, pendingInvites: [...(current.pendingInvites ?? []), invite] };
  });
  return { inviteId, token, expiresAt };
}

export async function acceptInvite(inviteId: string, body: Record<string, unknown>) {
  if (!prototypeSessionsAllowed() && !liveDemoBootstrapAllowed()) throw new PrototypeSessionsDisabledError();
  const token = requiredString(body.token, "token");
  const createdAt = new Date().toISOString();
  let response: (ReturnType<typeof createProfileResponse> & { view: ReturnType<typeof requirePersonHub> }) | null = null;

  await relocationStore.update((current) => {
    const invite = (current.pendingInvites ?? []).find((item) => item.id === inviteId);
    if (!invite) throw new Error(`Unknown invite ${inviteId}.`);
    if (!prototypeSessionsAllowed() && invite.demoOnly !== true) throw new PrototypeSessionsDisabledError();
    if (invite.acceptedAt) throw new Error("Invite has already been accepted.");
    if (Date.parse(invite.expiresAt) <= Date.now()) throw new Error("Invite has expired.");
    if (invite.tokenHash !== hashToken(token)) throw new Error("Invite token is invalid.");
    const program = requiredProgram(current, invite.programId);
    const { profile, existingSession } = profileForAcceptedInvite(current, body, createdAt);
    const existingCase = current.cases.find((item) => item.personId === profile.id && item.programId === program.id);
    const relocationCase = existingCase ?? personalCase(profile.id, program.id, program.housingPolicy, true, createdAt);
    const inviteTask = inviteAcceptanceTask(invite, relocationCase.id, profile.id, profile.displayName, createdAt);
    const tasks = existingCase ? [inviteTask] : [...personalTasks(relocationCase.id, createdAt, true), inviteTask];
    const { token: sessionToken, session } = existingSession ?? createSession({
      kind: "person",
      id: `session-${profile.id}-${crypto.randomUUID()}`,
      label: profile.displayName,
      personId: profile.id,
      activeCaseId: relocationCase.id,
    }, !prototypeSessionsAllowed());
    const acceptEvent = {
      id: `event-${relocationCase.id}-${invite.id}`,
      caseId: relocationCase.id,
      taskId: invite.id,
      state: "saved" as const,
      source: { kind: "user_report" as const, actorId: profile.id, label: profile.displayName },
      updatedAt: createdAt,
      owner: "person",
      nextAction: "Continue private move plan.",
      blocker: null,
    };

    const next: RelocationStoreData = {
      ...current,
      people: current.people.some((item) => item.id === profile.id) ? current.people : [...current.people, profile],
      cases: existingCase ? current.cases : [...current.cases, relocationCase],
      tasks: [...current.tasks, ...tasks],
      recommendations: {
        ...current.recommendations,
        [relocationCase.id]: current.recommendations[relocationCase.id] ?? buildRecommendations(profile, program),
      },
      events: [...current.events, acceptEvent],
      sessions: existingSession
        ? current.sessions.map((item) => item.id === existingSession.session.id && item.actor.kind === "person"
          ? { ...item, actor: { ...item.actor, activeCaseId: relocationCase.id } }
          : item)
        : [...current.sessions, session],
      pendingInvites: (current.pendingInvites ?? []).map((item) => item.id === invite.id ? { ...item, acceptedAt: createdAt, acceptedPersonId: profile.id } : item),
    };
    response = {
      ...createProfileResponse(profile, relocationCase, sessionToken),
      view: requirePersonHub(next, { ...session.actor, kind: "person", personId: profile.id, activeCaseId: relocationCase.id }),
    };
    return next;
  });

  if (!response) throw new Error("Invite acceptance failed.");
  return response;
}

export async function openExternal(request: Request, body: Record<string, unknown>) {
  const { actor } = await requireActor(request);
  return relocationStore.update((current) =>
    recordExternalOpen(
      canonicalizeRecommendations(current),
      { caseId: requiredString(body.caseId, "caseId"), targetId: requiredString(body.targetId, "targetId") },
      actor,
    ),
  );
}

export async function selectProperty(request: Request, body: Record<string, unknown>) {
  const { actor } = await requireActor(request);
  if (actor.kind !== "person") throw new Error("Person session is required to select a property.");
  const caseId = requiredString(body.caseId, "caseId");
  const listingId = body.listingId === null ? null : requiredString(body.listingId, "listingId");
  const data = await relocationStore.update((current) => {
    const relocationCase = activeCaseFor(current, actor);
    if (relocationCase.id !== caseId) throw new Error("Property selection must target your active move.");
    if (listingId) {
      const recommendations = canonicalizeRecommendations(current).recommendations[caseId] ?? [];
      const selected = recommendations.find((item) => item.type === "home" && item.home.id === listingId);
      if (!selected || selected.type !== "home") throw new Error("Choose a home from your current recommendations.");
      if (!selected.affordable || !selected.policyFit) throw new Error("Choose a home that passes your current income and housing allowance filters.");
    }
    return {
      ...current,
      cases: current.cases.map((item) => item.id === caseId ? { ...item, selectedListingId: listingId } : item),
    };
  });
  return { view: requirePersonHub(data, { ...actor, activeCaseId: caseId }) };
}

export async function reportStatus(request: Request, body: Record<string, unknown>) {
  const { actor } = await requireActor(request);
  const next = await relocationStore.update((current) =>
    reportManualStatus(
      current,
      {
        caseId: requiredString(body.caseId, "caseId"),
        taskId: requiredString(body.taskId, "taskId"),
        state: requiredActionState(body.state),
        reference: typeof body.reference === "string" ? body.reference : undefined,
        blocker: typeof body.blocker === "string" ? body.blocker : undefined,
        nextAction: typeof body.nextAction === "string" ? body.nextAction : undefined,
      },
      actor,
    ),
  );
  return { latestEvent: next.events.at(-1) };
}

export async function addConsent(request: Request, body: Record<string, unknown>) {
  const { actor } = await requireActor(request);
  return relocationStore.update((current) =>
    grantConsent(
      current,
      {
        recipient: {
          type: body.recipientType === "provider" ? "provider" : "organization",
          id: requiredString(body.recipientId, "recipientId"),
          name: requiredString(body.recipientName, "recipientName"),
        },
        fields: asFields(body.fields),
        expiresAt: optionalFutureDate(body.expiresAt, requiredString(body.expiresAt, "expiresAt"), "expiresAt"),
      },
      actor,
    ),
  );
}

export async function revokeConsentById(request: Request, consentId: string) {
  const { actor } = await requireActor(request);
  return relocationStore.update((current) => revokeConsent(current, consentId, actor));
}

export function createProfileResponse(profile: PersonProfile, relocationCase: RelocationCase, token: string) {
  return { sessionToken: token, profile: publicProfile(profile), case: relocationCase };
}

function profileForAcceptedInvite(data: RelocationStoreData, body: Record<string, unknown>, createdAt: string) {
  if (typeof body.existingSessionToken === "string" && body.existingSessionToken.trim()) {
    const session = data.sessions.find((item) => item.tokenHash === hashToken(body.existingSessionToken as string));
    if (!session || session.actor.kind !== "person") throw new Error("Existing person session token is invalid.");
    if (!prototypeSessionsAllowed() && session.demoOnly !== true) throw new PrototypeSessionsDisabledError();
    if (Date.parse(session.expiresAt) <= Date.now()) throw new Error("Existing person session token has expired.");
    const profile = requiredPerson(data, session.actor.personId);
    return { profile, existingSession: { token: body.existingSessionToken as string, session } };
  }
  const rawProfile = body.profile;
  if (!rawProfile || typeof rawProfile !== "object" || Array.isArray(rawProfile)) throw new Error("profile is required when accepting an invite.");
  return { profile: profileFromInput(rawProfile as ProfileInput, createdAt), existingSession: null };
}

function profileFromInput(body: ProfileInput, createdAt: string): PersonProfile {
  const adults = requiredWholeNumber(body.adults, "adults", 0);
  const children = requiredWholeNumber(body.children ?? 0, "children", 0);
  if (adults + children <= 0) throw new Error("household must include at least one person.");
  const minMonthlyAed = requiredMoney(body.minMonthlyAed, "minMonthlyAed", 0);
  const maxMonthlyAed = typeof body.maxMonthlyAed === "number" ? requiredMoney(body.maxMonthlyAed, "maxMonthlyAed", minMonthlyAed) : minMonthlyAed;
  if (maxMonthlyAed < minMonthlyAed) throw new Error("maxMonthlyAed must be greater than or equal to minMonthlyAed.");
  const rawContext = body.planningContext && typeof body.planningContext === "object" ? body.planningContext as Record<string, unknown> : {};
  const planningContext = {
    nationality: boundedText(rawContext.nationality, 80),
    purposeOfMove: boundedText(rawContext.purposeOfMove, 40),
    employmentStatus: boundedText(rawContext.employmentStatus, 40),
    sponsor: boundedText(rawContext.sponsor, 40),
    alreadyInUae: boundedText(rawContext.alreadyInUae, 20),
    documentsAvailable: boundedStringList(rawContext.documentsAvailable),
    completedSteps: boundedStringList(rawContext.completedSteps),
  };
  return {
    id: `person-${crypto.randomUUID()}`,
    displayName: optionalString(body.displayName, "Private mover"),
    workType: requiredWorkType(body.workType),
    household: { adults, children },
    income: { minMonthlyAed, maxMonthlyAed },
    preferredAreaIds: Array.isArray(body.preferredAreaIds) ? body.preferredAreaIds.filter((item): item is string => typeof item === "string" && isKnownAreaId(item)) : [],
    planningContext,
    createdAt,
    updatedAt: createdAt,
    synthetic: false,
    privateEvidence: { incomeDocuments: [], identityEvidence: [], bankResults: [] },
  };
}

function boundedText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function boundedStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 60)).filter(Boolean).slice(0, 20) : [];
}

function personalHousingPolicy(body: Record<string, unknown>) {
  return {
    annualAllowanceAed: typeof body.annualAllowanceAed === "number" ? requiredMoney(body.annualAllowanceAed, "annualAllowanceAed", 0) : Number.MAX_SAFE_INTEGER,
    maxRentShareOfIncome: optionalShare(body.maxRentShareOfIncome, 0.33),
  };
}

function activeCaseFor(data: RelocationStoreData, actor: Extract<CapabilityActor, { kind: "person" }>) {
  const cases = data.cases.filter((item) => item.personId === actor.personId);
  const relocationCase = actor.activeCaseId ? cases.find((item) => item.id === actor.activeCaseId) : cases.at(-1);
  if (!relocationCase) throw new Error(`No case for ${actor.personId}.`);
  return relocationCase;
}

function personalCase(
  personId: string,
  programId: string | null,
  housingPolicy: MoveProgram["housingPolicy"],
  sharedWithEmployer: boolean,
  createdAt: string,
): RelocationCase {
  return {
    id: `case-${crypto.randomUUID()}`,
    personId,
    programId,
    housingPolicy,
    sharedWithEmployer,
    selectedListingId: null,
    createdAt,
  };
}

function personalTasks(caseId: string, updatedAt: string, sharedWithEmployer: boolean): RelocationTask[] {
  const source = { kind: "system" as const, actorId: "bankable", label: "Yala AD" };
  return [
    {
      id: `task-housing-${caseId}`,
      caseId,
      title: sharedWithEmployer ? "Shortlist a home within policy and cash budget" : "Shortlist a home within cash budget",
      category: "housing",
      resourceId: null,
      actionUrl: null,
      sourceIds: [],
      sharedWithEmployer,
      state: "not_started",
      source,
      updatedAt,
      owner: "person",
      nextAction: "Open a contactable observed listing or save a planning option.",
      blocker: null,
    },
    {
      id: `task-workspace-${caseId}`,
      caseId,
      title: "Choose a work base near the office or shortlisted area",
      category: "workspace",
      resourceId: null,
      actionUrl: null,
      sourceIds: [],
      sharedWithEmployer,
      state: "not_started",
      source,
      updatedAt,
      owner: "person",
      nextAction: "Open provider booking or contact page; provider owns booking confirmation.",
      blocker: null,
    },
    {
      id: `task-setup-${caseId}`,
      caseId,
      title: "Start the relevant official setup service",
      category: "setup",
      resourceId: null,
      actionUrl: null,
      sourceIds: [],
      sharedWithEmployer,
      state: "not_started",
      source,
      updatedAt,
      owner: sharedWithEmployer ? "organization" : "person",
      nextAction: "Open the official service and record a reference only after provider submission.",
      blocker: null,
    },
    {
      id: `task-residence-${caseId}`,
      caseId,
      title: "Track residence and work-permit handoff",
      category: "residence",
      resourceId: null,
      actionUrl: null,
      sourceIds: [],
      sharedWithEmployer,
      state: "not_started",
      source,
      updatedAt,
      owner: sharedWithEmployer ? "organization" : "person",
      nextAction: "Use the official provider flow and record a reference once submitted.",
      blocker: null,
    },
    {
      id: `task-insurance-${caseId}`,
      caseId,
      title: "Arrange Abu Dhabi health insurance",
      category: "insurance",
      resourceId: null,
      actionUrl: null,
      sourceIds: [],
      sharedWithEmployer,
      state: "not_started",
      source,
      updatedAt,
      owner: sharedWithEmployer ? "organization" : "person",
      nextAction: "Provider or broker confirms policy status; Yala AD records only evidence-backed updates.",
      blocker: null,
    },
    {
      id: `task-finance-${caseId}`,
      caseId,
      title: "Review finance readiness factors",
      category: "finance",
      resourceId: "cbuae-mortgage-ratios",
      actionUrl: null,
      sourceIds: ["cbuae-mortgage-ratios"],
      sharedWithEmployer: false,
      state: "not_started",
      source,
      updatedAt,
      owner: "person",
      nextAction: "Open lender application only after choosing what to share.",
      blocker: null,
    },
  ];
}

function inviteAcceptanceTask(invite: PendingInvite, caseId: string, personId: string, displayName: string, updatedAt: string): RelocationTask {
  return {
    id: invite.id,
    caseId,
    title: `Invite accepted by ${displayName}`,
    category: "setup",
    resourceId: null,
    actionUrl: null,
    sourceIds: [],
    sharedWithEmployer: true,
    state: "saved",
    source: { kind: "user_report", actorId: personId, label: displayName },
    updatedAt,
    owner: "person",
    nextAction: "Continue private move plan.",
    blocker: null,
  };
}

function createSession(actor: CapabilityActor, demoOnly = false): { token: string; session: CapabilitySession } {
  if (!prototypeSessionsAllowed() && (!demoOnly || !liveDemoBootstrapAllowed())) throw new PrototypeSessionsDisabledError();
  const token = randomToken();
  const createdAt = new Date().toISOString();
  return {
    token,
    session: {
      id: crypto.randomUUID(),
      tokenHash: hashToken(token),
      actor,
      createdAt,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      devOnly: true,
      ...(demoOnly ? { demoOnly: true as const } : {}),
    },
  };
}

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function requiredPerson(data: RelocationStoreData, personId: string) {
  const person = data.people.find((item) => item.id === personId);
  if (!person) throw new Error(`Unknown person ${personId}.`);
  return person;
}

function requiredOrganization(data: RelocationStoreData, organizationId: string) {
  const organization = data.organizations.find((item) => item.id === organizationId);
  if (!organization) throw new Error(`Unknown organization ${organizationId}.`);
  return organization;
}

function requiredProgram(data: RelocationStoreData, programId: string) {
  const program = data.programs.find((item) => item.id === programId);
  if (!program) throw new Error(`Unknown program ${programId}.`);
  return program;
}

function requiredActionState(value: unknown) {
  if (value === "resolved") return "saved";
  if (value === "saved" || value === "reported_submitted" || value === "reported_booked" || value === "blocked") return value;
  if (value === "confirmed") throw new Error("confirmed requires a provider integration and cannot be client-reported.");
  throw new Error("state must be saved, resolved, reported_submitted, reported_booked, or blocked.");
}

function asFields(value: unknown) {
  const allowed = new Set(["income", "income_documents", "identity_evidence", "bank_results"]);
  if (!Array.isArray(value) || value.length === 0) throw new Error("fields must be a non-empty array.");
  return value.map((field) => {
    if (typeof field !== "string" || !allowed.has(field)) throw new Error(`Unsupported consent field ${String(field)}.`);
    return field as "income" | "income_documents" | "identity_evidence" | "bank_results";
  });
}

export function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${field} is required.`);
  return value.trim();
}

function optionalString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function requiredBoolean(value: unknown, field: string) {
  if (typeof value !== "boolean") throw new Error(`${field} must be true or false.`);
  return value;
}

function requiredWholeNumber(value: unknown, field: string, minimum: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) throw new Error(`${field} must be a whole number >= ${minimum}.`);
  return value;
}

function requiredMoney(value: unknown, field: string, minimum: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) throw new Error(`${field} must be a number >= ${minimum}.`);
  return value;
}

function optionalShare(value: unknown, fallback: number) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1) throw new Error("maxRentShareOfIncome must be greater than 0 and less than or equal to 1.");
  return value;
}

function requiredDate(value: unknown, field: string) {
  const text = requiredString(value, field);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw new Error(`${field} must be a YYYY-MM-DD date.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`${field} must be a real YYYY-MM-DD date.`);
  }
  return text;
}

function optionalFutureDate(value: unknown, fallback: string, field: string) {
  const text = value === undefined || value === null ? fallback : requiredString(value, field);
  if (Number.isNaN(Date.parse(text))) throw new Error(`${field} must be an ISO date/time.`);
  if (Date.parse(text) <= Date.now()) throw new Error(`${field} must be in the future.`);
  return text;
}

function requiredAreaId(value: unknown, field: string) {
  const text = requiredString(value, field);
  if (!AREA_ID_PATTERN.test(text) || !isKnownAreaId(text)) throw new Error(`${field} must be a supported Abu Dhabi area id.`);
  return text;
}

function isKnownAreaId(value: string) {
  const catalog = getRentalCatalog();
  return [...catalog.snapshot, ...catalog.synthetic].some((home) => home.areaId === value);
}

function requiredWorkType(value: unknown) {
  if (value === "employee" || value === "freelancer" || value === "self_employed") return value;
  throw new Error("workType must be employee, freelancer, or self_employed.");
}

function validJurisdiction(value: unknown, hasUaeEntity: boolean): MoveProgram["jurisdiction"] {
  if (value === undefined || value === null || value === "") {
    if (!hasUaeEntity) throw new Error("jurisdiction is required when the company does not already have a UAE entity.");
    return undefined;
  }
  const text = requiredString(value, "jurisdiction");
  if (!VALID_JURISDICTIONS.has(text)) throw new Error("jurisdiction must be mainland, adgm, or kezad.");
  return text as MoveProgram["jurisdiction"];
}
