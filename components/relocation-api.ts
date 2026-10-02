import type { HrProgramView, PublicPersonHub, Recommendation, StatusEvent } from "@/lib/relocation/types.ts";

export type RouteChoice = "my-move" | "join-company" | "move-team";
export type ViewMode = "employee" | "hr";
export type RelocationScreen =
  | "start"
  | "move"
  | "move-timeline"
  | "move-homes"
  | "move-setup"
  | "move-workspaces"
  | "move-finance"
  | "move-profile"
  | "company"
  | "company-dashboard"
  | "join";

export type PersonHub = PublicPersonHub;
export type HrView = HrProgramView;
export type { Recommendation, StatusEvent };

export type DemoCapabilities = {
  programId: string;
  hrSessionToken: string;
  hrView: HrView;
  employees: { personId: string; displayName: string; sessionToken: string }[];
  views: PersonHub[];
};

export type PersonHubPayload = { view: PersonHub };
export type HrViewPayload = { view: HrView };
export type ProfileCreatePayload = { sessionToken: string; profile: PersonHub["profile"]; case: PersonHub["case"]; view?: PersonHub };
export type ProgramCreatePayload = { hrSessionToken: string; program: HrView["program"]; view?: HrView };
export type InviteCreatePayload = { inviteId: string; token: string; expiresAt?: string };
export type OpenedActionPayload = { ok: true; latestEvent?: StatusEvent };
export type ManualStatusPayload = { latestEvent?: StatusEvent };

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

export async function apiPatch<T>(path: string, body?: unknown, sessionToken?: string): Promise<T> {
  const response = await fetch(path, {
    method: "PATCH",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return readJson<T>(response);
}
