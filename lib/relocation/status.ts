import crypto from "node:crypto";
import referenceCatalog from "../../data/abu-dhabi/catalog.json" with { type: "json" };
import type { ActionState, CapabilityActor, ConsentGrant, RelocationCategory, RelocationStoreData, StatusEvent } from "./types.ts";

const CLIENT_FORBIDDEN_STATES = new Set<ActionState>(["confirmed"]);

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function appendStatusEvent(
  data: RelocationStoreData,
  input: {
    caseId: string;
    taskId: string;
    state: ActionState;
    owner: string;
    nextAction: string;
    blocker?: string | null;
    reference?: string;
  },
  actor: CapabilityActor,
): RelocationStoreData {
  if (CLIENT_FORBIDDEN_STATES.has(input.state)) {
    throw new Error("Confirmed status requires a provider integration and cannot be client-reported.");
  }
  const relocationCase = data.cases.find((item) => item.id === input.caseId);
  if (!relocationCase) throw new Error(`Unknown relocation case ${input.caseId}.`);
  if (!canAccessCase(actor, relocationCase.personId, relocationCase.programId)) {
    throw new Error("Actor cannot update this relocation case.");
  }
  const source = sourceFor(actor);
  const event: StatusEvent = {
    id: crypto.randomUUID(),
    caseId: input.caseId,
    taskId: input.taskId,
    state: input.state,
    source: input.reference ? { ...source, reference: input.reference } : source,
    updatedAt: new Date().toISOString(),
    owner: input.owner,
    nextAction: input.nextAction,
    blocker: input.blocker ?? null,
  };
  return { ...data, events: [...data.events, event] };
}

export function reportManualStatus(
  data: RelocationStoreData,
  input: { caseId: string; taskId: string; state: ActionState; reference?: string; blocker?: string; nextAction?: string },
  actor: CapabilityActor,
): RelocationStoreData {
  const task = data.tasks.find((item) => item.caseId === input.caseId && item.id === input.taskId);
  if (!task) throw new Error(`Unknown task ${input.taskId} for case ${input.caseId}.`);
  const allowed = new Set<ActionState>(["saved", "reported_submitted", "reported_booked", "blocked"]);
  if (!allowed.has(input.state)) {
    throw new Error("Manual status must be saved, reported_submitted, reported_booked, or blocked.");
  }
  const relocationCase = data.cases.find((item) => item.id === input.caseId);
  if (!relocationCase) throw new Error(`Unknown relocation case ${input.caseId}.`);
  if (actor.kind === "organization" && !task.sharedWithEmployer) {
    throw new Error("HR cannot update private tasks.");
  }
  if (input.state === "reported_submitted" || input.state === "reported_booked") {
    if (!input.reference) throw new Error(`${input.state} requires a reference.`);
  }
  return appendStatusEvent(
    data,
    {
      caseId: input.caseId,
      taskId: input.taskId,
      state: input.state,
      owner: task.owner,
      nextAction: input.nextAction?.trim() || task.nextAction,
      blocker: input.state === "blocked" ? input.blocker?.trim() || "Blocked; safe details withheld unless explicitly shared." : null,
      reference: input.reference?.trim(),
    },
    actor,
  );
}

export function recordExternalOpen(
  data: RelocationStoreData,
  input: { caseId: string; targetId: string },
  actor: CapabilityActor,
): RelocationStoreData {
  const action = findAction(data, input.caseId, input.targetId, actor);
  if (!action.url) throw new Error("Target has no server-owned external URL to open.");
  return appendStatusEvent(
    data,
    {
      caseId: input.caseId,
      taskId: action.taskId,
      state: "opened",
      owner: action.owner,
      nextAction: action.nextAction,
      blocker: null,
      reference: action.url,
    },
    actor,
  );
}

export function grantConsent(
  data: RelocationStoreData,
  grant: { fields: ConsentGrant["fields"]; recipient: ConsentGrant["recipient"]; expiresAt: string },
  actor: CapabilityActor,
): RelocationStoreData {
  if (actor.kind !== "person") throw new Error("Only a person session can grant private evidence consent.");
  return {
    ...data,
    consents: [
      ...data.consents,
      {
        id: crypto.randomUUID(),
        personId: actor.personId,
        recipient: grant.recipient,
        fields: grant.fields,
        grantedAt: new Date().toISOString(),
        expiresAt: grant.expiresAt,
        revokedAt: null,
      },
    ],
  };
}

export function revokeConsent(data: RelocationStoreData, consentId: string, actor: CapabilityActor): RelocationStoreData {
  const grant = data.consents.find((item) => item.id === consentId);
  if (!grant) throw new Error(`Unknown consent ${consentId}.`);
  if (actor.kind !== "person" || actor.personId !== grant.personId) {
    throw new Error("Only the person who granted consent can revoke it.");
  }
  return {
    ...data,
    consents: data.consents.map((item) =>
      item.id === consentId ? { ...item, revokedAt: item.revokedAt ?? new Date().toISOString() } : item,
    ),
  };
}

function findAction(data: RelocationStoreData, caseId: string, targetId: string, actor?: CapabilityActor) {
  const task = data.tasks.find((item) => item.caseId === caseId && item.id === targetId);
  if (task) {
    if (actor?.kind === "organization" && !task.sharedWithEmployer) throw new Error("HR cannot open private tasks.");
    return { taskId: task.id, url: task.actionUrl, owner: task.owner, nextAction: task.nextAction };
  }
  const recommendation = data.recommendations[caseId]?.find((item) => item.id === targetId);
  if (!recommendation) throw new Error(`Unknown action target ${targetId}.`);
  const category = recommendationCategory(recommendation);
  const linkedTask = data.tasks.find((item) => item.caseId === caseId && item.category === category);
  if (actor?.kind === "organization" && linkedTask?.sharedWithEmployer !== true) {
    throw new Error("HR cannot open private recommendations.");
  }
  if (recommendation.type === "home") {
    return {
      taskId: linkedTask?.id ?? targetId,
      url: recommendation.home.listingUrl,
      owner: linkedTask?.owner ?? "person",
      nextAction: "Open original listing page. Availability, reply and booking remain unconfirmed until provider or user evidence exists.",
    };
  }
  return {
    taskId: linkedTask?.id ?? targetId,
    url: recommendation.actionUrl,
    owner: linkedTask?.owner ?? "person",
    nextAction: recommendation.actionLabel ?? linkedTask?.nextAction ?? "Open external service.",
  };
}

function recommendationCategory(recommendation: NonNullable<RelocationStoreData["recommendations"][string]>[number]): RelocationCategory {
  if (recommendation.type === "home") return "housing";
  if (recommendation.type === "workspace") return "workspace";
  if (recommendation.type === "finance_readiness") return "finance";
  if (recommendation.category) return recommendation.category;
  if (recommendation.resourceId) {
    const service = referenceCatalog.services.find((item) => item.id === recommendation.resourceId);
    if (service) return service.category as RelocationCategory;
  }
  const serviceId = recommendation.id.match(/^service-(.+)-person-/)?.[1];
  if (serviceId) {
    const service = referenceCatalog.services.find((item) => item.id === serviceId);
    if (service) return service.category as RelocationCategory;
  }
  const serviceByTitle = referenceCatalog.services.find((item) => item.title === recommendation.title);
  if (serviceByTitle) return serviceByTitle.category as RelocationCategory;
  throw new Error(`Cannot resolve action category for ${recommendation.id}.`);
}

function canAccessCase(actor: CapabilityActor, personId: string, programId: string | null) {
  if (actor.kind === "bankable") return true;
  if (actor.kind === "person") return actor.personId === personId;
  return actor.programId === programId;
}

function sourceFor(actor: CapabilityActor): StatusEvent["source"] {
  if (actor.kind === "person") return { kind: "user_report", actorId: actor.id, label: actor.label };
  if (actor.kind === "organization") return { kind: "hr_report", actorId: actor.id, label: actor.label };
  return { kind: "system", actorId: actor.id, label: actor.label };
}
