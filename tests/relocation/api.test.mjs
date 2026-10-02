import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import test from "node:test";

const dbPath = `/tmp/bankable-relocation-api-${process.pid}.sqlite`;
process.env.BANKABLE_DB_PATH = dbPath;

const bootstrapRoute = await import("../../app/api/relocation/bootstrap/route.ts");
const relocationRoute = await import("../../app/api/relocation/route.ts");
const meRoute = await import("../../app/api/relocation/profiles/me/route.ts");
const hrRoute = await import("../../app/api/relocation/programs/[programId]/hr/route.ts");
const openedRoute = await import("../../app/api/relocation/actions/opened/route.ts");
const profilesRoute = await import("../../app/api/relocation/profiles/route.ts");
const programsRoute = await import("../../app/api/relocation/programs/route.ts");
const invitesRoute = await import("../../app/api/relocation/invites/route.ts");
const acceptInviteRoute = await import("../../app/api/relocation/invites/[inviteId]/accept/route.ts");
const statusRoute = await import("../../app/api/relocation/actions/status/route.ts");
const { relocationStore } = await import("../../lib/relocation/api.ts");

test.after(async () => {
  await unlink(dbPath).catch(() => {});
});

test("production live-demo switch enables only fictional demo sessions", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLiveDemo = process.env.YALA_LIVE_DEMO;
  process.env.NODE_ENV = "production";
  delete process.env.YALA_LIVE_DEMO;

  try {
    const disabled = await bootstrapRoute.POST();
    assert.equal(disabled.status, 403);
    const disabledGeneric = await relocationRoute.POST(new Request("http://bankable.test/api/relocation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "bootstrap_demo" }),
    }));
    assert.equal(disabledGeneric.status, 403);

    process.env.YALA_LIVE_DEMO = "1";
    const invalidFlag = await bootstrapRoute.POST();
    assert.equal(invalidFlag.status, 403);

    process.env.YALA_LIVE_DEMO = "true";
    const response = await bootstrapRoute.POST();
    const demo = await response.json();
    assert.equal(response.status, 200);
    assert.equal(demo.employees.length, 5);

    const employeeHub = await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
      headers: { authorization: `Bearer ${demo.employees[0].sessionToken}` },
    }));
    assert.equal(employeeHub.status, 200);

    const profileCreation = await profilesRoute.POST(new Request("http://bankable.test/api/relocation/profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workType: "freelancer", adults: 1, children: 0, minMonthlyAed: 12000 }),
    }));
    assert.equal(profileCreation.status, 503);
    assert.match((await profileCreation.json()).error, /Only the seeded fictional demo is enabled/);

    const programCreation = await programsRoute.POST(new Request("http://bankable.test/api/relocation/programs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hasUaeEntity: true,
        officeAreaId: "al-maryah-island",
        teamSize: 1,
        moveDate: "2026-12-01",
        annualAllowanceAed: 100000,
      }),
    }));
    assert.equal(programCreation.status, 503);

    delete process.env.YALA_LIVE_DEMO;
    const disabledAgain = await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
      headers: { authorization: `Bearer ${demo.employees[0].sessionToken}` },
    }));
    assert.equal(disabledAgain.status, 503);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalLiveDemo === undefined) delete process.env.YALA_LIVE_DEMO;
    else process.env.YALA_LIVE_DEMO = originalLiveDemo;
  }
});

test("bootstrap returns capability tokens without leaking all private hubs", async () => {
  const response = await bootstrapRoute.POST();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof body.hrSessionToken, "string");
  assert.equal(body.employees.length, 5);
  assert.equal("view" in body.employees[0], false);
  assert.equal("privateEvidence" in body.employees[0], false);
});

test("person hub requires bearer and omits private evidence", async () => {
  const boot = await (await bootstrapRoute.POST()).json();
  const denied = await meRoute.GET(
    new Request("http://bankable.test/api/relocation/profiles/me", {
      headers: { "x-bankable-actor-kind": "person", "x-bankable-actor-id": "person-sara" },
    }),
  );
  assert.equal(denied.status, 401);

  const allowed = await meRoute.GET(
    new Request("http://bankable.test/api/relocation/profiles/me", {
      headers: { authorization: `Bearer ${boot.employees[0].sessionToken}` },
    }),
  );
  const body = await allowed.json();

  assert.equal(allowed.status, 200);
  assert.equal("privateEvidence" in body.view.profile, false);
  assert.equal(body.view.budget.estimatedInitialCashAed, null);
  assert.ok(body.view.recommendations.some((item) => item.type === "home"));
  assert.equal(body.view.recommendations.some((item) => item.type === "official_service" && item.title.includes("MoHRE")), false);
  assert.equal(JSON.stringify(body.view.financeReadiness).includes("15000"), false);

  const employeeHub = await (await meRoute.GET(
    new Request("http://bankable.test/api/relocation/profiles/me", {
      headers: { authorization: `Bearer ${boot.employees[1].sessionToken}` },
    }),
  )).json();
  assert.ok(employeeHub.view.recommendations.some((item) => item.type === "official_service" && item.title.includes("ADGM")));
  assert.equal(employeeHub.view.recommendations.some((item) => item.type === "official_service" && item.title.includes("MoHRE")), false);
});

test("HR projection excludes private budgets and private evidence", async () => {
  const boot = await (await bootstrapRoute.POST()).json();
  const response = await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${boot.programId}/hr`, {
      headers: { authorization: `Bearer ${boot.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: boot.programId }) },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.view.aggregate.cases, 5);
  assert.equal(JSON.stringify(body).includes("privateEvidence"), false);
  assert.equal(JSON.stringify(body).includes("annualBudgetAed"), false);
  assert.equal(JSON.stringify(body).includes("minMonthlyIncomeAed"), false);
  assert.ok(body.view.employees.every((employee) => !("income" in employee)));
});

test("opened action uses server-known URL and records opened only", async () => {
  const boot = await (await bootstrapRoute.POST()).json();
  const hub = await (await meRoute.GET(
    new Request("http://bankable.test/api/relocation/profiles/me", {
      headers: { authorization: `Bearer ${boot.employees[0].sessionToken}` },
    }),
  )).json();
  const target = hub.view.recommendations.find((item) => item.type === "home" && item.canContact);

  const response = await openedRoute.POST(
    new Request("http://bankable.test/api/relocation/actions/opened", {
      method: "POST",
      headers: { authorization: `Bearer ${boot.employees[0].sessionToken}`, "content-type": "application/json" },
      body: JSON.stringify({ caseId: hub.view.case.id, targetId: target.id, url: "https://evil.example" }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.latestEvent.state, "opened");
  assert.equal(body.latestEvent.source.kind, "user_report");
  assert.equal(body.latestEvent.source.label, boot.employees[0].displayName);
  assert.equal(JSON.stringify(body.latestEvent).includes("evil.example"), false);
});

test("bootstrap preserves unrelated user-created profile and event ledger is immutable", async () => {
  const created = await profilesRoute.POST(
    new Request("http://bankable.test/api/relocation/profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Private Tester",
        workType: "employee",
        adults: 1,
        children: 0,
        minMonthlyAed: 18000,
        preferredAreaIds: ["khalifa-city"],
        annualAllowanceAed: 90000,
      }),
    }),
  );
  const createdBody = await created.json();
  await bootstrapRoute.POST();
  const data = await relocationStore.read();
  const stillAllowed = await meRoute.GET(
    new Request("http://bankable.test/api/relocation/profiles/me", {
      headers: { authorization: `Bearer ${createdBody.sessionToken}` },
    }),
  );

  assert.equal(stillAllowed.status, 200);
  assert.ok(data.people.some((person) => person.id === createdBody.profile.id));
  await assert.rejects(
    () =>
      relocationStore.update((current) => ({
        ...current,
        events: current.events.map((event, index) => index === 0 ? { ...event, nextAction: "tampered" } : event),
      })),
    /immutable/,
  );
});


test("program invite creates a new private employee case once and rejects replay", async () => {
  const programResponse = await programsRoute.POST(
    new Request("http://bankable.test/api/relocation/programs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hasUaeEntity: true,
        officeAreaId: "al-maryah-island",
        teamSize: 2,
        moveDate: "2026-11-15",
        annualAllowanceAed: 105000,
      }),
    }),
  );
  const programBody = await programResponse.json();
  assert.equal(programResponse.status, 200);
  assert.equal(programBody.program.hasUaeEntity, true);
  assert.equal(programBody.program.jurisdiction, undefined);

  const inviteResponse = await invitesRoute.POST(
    new Request("http://bankable.test/api/relocation/invites", {
      method: "POST",
      headers: { authorization: `Bearer ${programBody.hrSessionToken}`, "content-type": "application/json" },
      body: JSON.stringify({ employeeLabel: "New hire" }),
    }),
  );
  const inviteBody = await inviteResponse.json();
  assert.equal(inviteResponse.status, 200);
  assert.equal(typeof inviteBody.token, "string");

  const acceptResponse = await acceptInviteRoute.POST(
    new Request(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: inviteBody.token,
        profile: { workType: "employee", adults: 1, children: 0, minMonthlyAed: 22000 },
      }),
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  );
  const acceptBody = await acceptResponse.json();
  assert.equal(acceptResponse.status, 200);
  assert.equal(acceptBody.profile.displayName, "Private mover");
  assert.equal(acceptBody.case.programId, programBody.program.id);

  const replayResponse = await acceptInviteRoute.POST(
    new Request(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: inviteBody.token,
        profile: { workType: "employee", adults: 1, children: 0, minMonthlyAed: 22000 },
      }),
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  );
  assert.equal(replayResponse.status, 400);
});

test("program onboarding validates jurisdiction, dates, ranges and household counts", async () => {
  const badProgram = await programsRoute.POST(
    new Request("http://bankable.test/api/relocation/programs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hasUaeEntity: false,
        officeAreaId: "al-maryah-island",
        teamSize: 1,
        moveDate: "2026-11-15",
        annualAllowanceAed: 90000,
      }),
    }),
  );
  assert.equal(badProgram.status, 400);

  const badProfile = await profilesRoute.POST(
    new Request("http://bankable.test/api/relocation/profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workType: "employee", adults: 1.5, children: -1, minMonthlyAed: 20000, maxMonthlyAed: 10000 }),
    }),
  );
  assert.equal(badProfile.status, 400);
});

test("manual status reports are scoped and cannot claim provider confirmation", async () => {
  const boot = await (await bootstrapRoute.POST()).json();
  const hub = await (await meRoute.GET(
    new Request("http://bankable.test/api/relocation/profiles/me", {
      headers: { authorization: `Bearer ${boot.employees[0].sessionToken}` },
    }),
  )).json();
  const sharedTask = hub.view.tasks.find((task) => task.sharedWithEmployer);
  const privateTask = hub.view.tasks.find((task) => task.category === "finance" && !task.sharedWithEmployer);

  const submitted = await statusRoute.POST(
    new Request("http://bankable.test/api/relocation/actions/status", {
      method: "POST",
      headers: { authorization: `Bearer ${boot.hrSessionToken}`, "content-type": "application/json" },
      body: JSON.stringify({ caseId: hub.view.case.id, taskId: sharedTask.id, state: "reported_submitted", reference: "HR-REF-1" }),
    }),
  );
  const submittedBody = await submitted.json();
  assert.equal(submitted.status, 200);
  assert.equal(submittedBody.latestEvent.state, "reported_submitted");
  assert.equal(submittedBody.latestEvent.source.kind, "hr_report");
  assert.equal(submittedBody.latestEvent.source.reference, "HR-REF-1");

  const privateHrWrite = await statusRoute.POST(
    new Request("http://bankable.test/api/relocation/actions/status", {
      method: "POST",
      headers: { authorization: `Bearer ${boot.hrSessionToken}`, "content-type": "application/json" },
      body: JSON.stringify({ caseId: hub.view.case.id, taskId: privateTask.id, state: "blocked", blocker: "raw private bank note" }),
    }),
  );
  assert.equal(privateHrWrite.status, 400);

  const confirmed = await statusRoute.POST(
    new Request("http://bankable.test/api/relocation/actions/status", {
      method: "POST",
      headers: { authorization: `Bearer ${boot.employees[0].sessionToken}`, "content-type": "application/json" },
      body: JSON.stringify({ caseId: hub.view.case.id, taskId: privateTask.id, state: "confirmed" }),
    }),
  );
  assert.equal(confirmed.status, 400);
});
