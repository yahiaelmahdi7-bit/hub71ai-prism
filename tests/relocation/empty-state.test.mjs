import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import test from "node:test";

const dbPath = `/tmp/bankable-relocation-empty-${process.pid}.sqlite`;
process.env.BANKABLE_DB_PATH = dbPath;

const meRoute = await import("../../app/api/relocation/profiles/me/route.ts");
const hrRoute = await import("../../app/api/relocation/programs/[programId]/hr/route.ts");
const profilesRoute = await import("../../app/api/relocation/profiles/route.ts");
const programsRoute = await import("../../app/api/relocation/programs/route.ts");
const invitesRoute = await import("../../app/api/relocation/invites/route.ts");
const acceptInviteRoute = await import("../../app/api/relocation/invites/[inviteId]/accept/route.ts");
const statusRoute = await import("../../app/api/relocation/actions/status/route.ts");
const openedRoute = await import("../../app/api/relocation/actions/opened/route.ts");
const consentRoute = await import("../../app/api/relocation/consents/route.ts");
const revokeConsentRoute = await import("../../app/api/relocation/consents/[consentId]/route.ts");
const bootstrapRoute = await import("../../app/api/relocation/bootstrap/route.ts");
const { relocationStore } = await import("../../lib/relocation/api.ts");

function jsonRequest(url, body, token = null) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test.after(async () => {
  await unlink(dbPath).catch(() => {});
});

test("fresh DB creates a zero-employee program without seeding demo data", async () => {
  const response = await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: true,
    officeAreaId: "al-maryah-island",
    teamSize: 0,
    moveDate: "2026-12-01",
    annualAllowanceAed: 100000,
  }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.program.teamSize, 0);

  const stored = await relocationStore.read(false);
  assert.equal(stored.people.length, 0);
  assert.equal(stored.programs.some((program) => program.id === "program-falcon-october-2026"), false);

  const hrResponse = await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${body.program.id}/hr`, {
      headers: { authorization: `Bearer ${body.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: body.program.id }) },
  );
  const hrBody = await hrResponse.json();
  assert.equal(hrResponse.status, 200);
  assert.deepEqual(hrBody.view.aggregate, { invited: 0, accepted: 0, cases: 0, blocked: 0, policyFit: 0, openedHandoffs: 0 });
});

test("fresh program invite creates the first employee private hub and survives refresh", async () => {
  const programBody = await (await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: false,
    jurisdiction: "adgm",
    officeAreaId: "al-maryah-island",
    teamSize: 0,
    moveDate: "2026-12-15",
    annualAllowanceAed: 105000,
  }))).json();

  const inviteBody = await (await invitesRoute.POST(jsonRequest("http://bankable.test/api/relocation/invites", { employeeLabel: "First employee" }, programBody.hrSessionToken))).json();
  const accepted = await acceptInviteRoute.POST(
    jsonRequest(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      token: inviteBody.token,
      profile: { displayName: "First Employee", workType: "employee", adults: 1, children: 0, minMonthlyAed: 21000 },
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  );
  const acceptedBody = await accepted.json();
  assert.equal(accepted.status, 200);
  assert.equal(acceptedBody.case.programId, programBody.program.id);

  const refreshed = await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${acceptedBody.sessionToken}` },
  }));
  const refreshedBody = await refreshed.json();
  assert.equal(refreshed.status, 200);
  assert.equal(refreshedBody.view.profile.displayName, "First Employee");

  const hrBody = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${programBody.program.id}/hr`, {
      headers: { authorization: `Bearer ${programBody.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: programBody.program.id }) },
  )).json();
  assert.equal(hrBody.view.aggregate.invited, 1);
  assert.equal(hrBody.view.aggregate.cases, 1);
  assert.equal(hrBody.view.aggregate.accepted, 1);

  await invitesRoute.POST(jsonRequest("http://bankable.test/api/relocation/invites", { employeeLabel: "Second employee" }, programBody.hrSessionToken));
  const afterSecondInvite = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${programBody.program.id}/hr`, {
      headers: { authorization: `Bearer ${programBody.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: programBody.program.id }) },
  )).json();
  assert.equal(afterSecondInvite.view.aggregate.invited, 2);
  assert.equal(afterSecondInvite.view.aggregate.accepted, 1);
});

test("low-income private profile keeps setup, workspace and finance actions with no-match reasons", async () => {
  const created = await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    workType: "freelancer",
    adults: 1,
    children: 0,
    minMonthlyAed: 1000,
    annualAllowanceAed: 100000,
  }));
  const createdBody = await created.json();
  assert.equal(created.status, 200);

  const hub = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }))).json();
  assert.equal(hub.view.recommendations.some((item) => item.type === "home"), false);
  assert.ok(hub.view.housingSearch.excluded.length > 0);
  assert.ok(hub.view.housingSearch.assumptions.some((text) => text.includes("No homes remained")));
  assert.ok(hub.view.recommendations.some((item) => item.type === "workspace"));
  assert.ok(hub.view.recommendations.some((item) => item.type === "official_service"));
  assert.ok(hub.view.recommendations.some((item) => item.type === "finance_readiness"));
});

test("zero-income profile and edit return honest no-match instead of rejection", async () => {
  const created = await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    workType: "freelancer",
    adults: 1,
    children: 0,
    minMonthlyAed: 0,
  }));
  const createdBody = await created.json();
  assert.equal(created.status, 200);

  const patched = await meRoute.PATCH(jsonRequest("http://bankable.test/api/relocation/profiles/me", {
    minMonthlyAed: 0,
  }, createdBody.sessionToken));
  const patchedBody = await patched.json();
  assert.equal(patched.status, 200);
  assert.equal(patchedBody.view.profile.income.minMonthlyAed, 0);
  assert.equal(patchedBody.view.recommendations.some((item) => item.type === "home"), false);
  assert.ok(patchedBody.view.housingSearch.assumptions.some((text) => text.includes("No homes remained under AED 0")));
});

test("demo bootstrap appends without invalidating saved fresh sessions", async () => {
  const createdBody = await (await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    workType: "employee",
    adults: 1,
    children: 0,
    minMonthlyAed: 18000,
  }))).json();
  await bootstrapRoute.POST();
  const refreshed = await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }));
  assert.equal(refreshed.status, 200);
});

test("concurrent profile mutations preserve all profiles", async () => {
  const responses = await Promise.all(Array.from({ length: 5 }, (_, index) =>
    profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
      displayName: `Concurrent ${index}`,
      workType: "employee",
      adults: 1,
      children: 0,
      minMonthlyAed: 17000 + index,
    })),
  ));
  assert.deepEqual(responses.map((response) => response.status), [200, 200, 200, 200, 200]);
  const stored = await relocationStore.read(false);
  for (let index = 0; index < 5; index += 1) {
    assert.ok(stored.people.some((person) => person.displayName === `Concurrent ${index}`));
  }
});

test("append-only ledger rejects event deletion as well as rewrite", async () => {
  await bootstrapRoute.POST();
  const before = await relocationStore.read(false);
  const originalCount = before.events.length;
  await assert.rejects(
    () => relocationStore.update((current) => ({ ...current, events: current.events.slice(1) })),
    /append-only|immutable/,
  );
  const after = await relocationStore.read(false);
  assert.equal(after.events.length, originalCount);
});


test("existing private profile can join a company invite and refresh opens joined case", async () => {
  const soloBody = await (await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    displayName: "Reusable Profile",
    workType: "employee",
    adults: 1,
    children: 0,
    minMonthlyAed: 24000,
  }))).json();
  const programBody = await (await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: true,
    officeAreaId: "al-maryah-island",
    teamSize: 1,
    moveDate: "2026-12-20",
    annualAllowanceAed: 105000,
  }))).json();
  const inviteBody = await (await invitesRoute.POST(jsonRequest("http://bankable.test/api/relocation/invites", {}, programBody.hrSessionToken))).json();
  const joined = await acceptInviteRoute.POST(
    jsonRequest(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      token: inviteBody.token,
      existingSessionToken: soloBody.sessionToken,
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  );
  const joinedBody = await joined.json();
  assert.equal(joined.status, 200);
  assert.equal(joinedBody.case.programId, programBody.program.id);

  const refreshed = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${soloBody.sessionToken}` },
  }))).json();
  assert.equal(refreshed.view.case.id, joinedBody.case.id);
  assert.equal(refreshed.view.case.programId, programBody.program.id);
});

test("recommendation opens advance shared HR progress and HR cannot open private finance", async () => {
  const programBody = await (await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: true,
    officeAreaId: "al-maryah-island",
    teamSize: 1,
    moveDate: "2026-12-22",
    annualAllowanceAed: 105000,
  }))).json();
  const inviteBody = await (await invitesRoute.POST(jsonRequest("http://bankable.test/api/relocation/invites", {}, programBody.hrSessionToken))).json();
  const acceptedBody = await (await acceptInviteRoute.POST(
    jsonRequest(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      token: inviteBody.token,
      profile: { displayName: "Action Tester", workType: "employee", adults: 1, children: 0, minMonthlyAed: 28000 },
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  )).json();
  const hub = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${acceptedBody.sessionToken}` },
  }))).json();
  const workspace = hub.view.recommendations.find((item) => item.type === "workspace" && item.actionUrl);
  const finance = hub.view.recommendations.find((item) => item.type === "finance_readiness");

  const opened = await openedRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/opened", {
    caseId: hub.view.case.id,
    targetId: workspace.id,
  }, programBody.hrSessionToken));
  const openedBody = await opened.json();
  assert.equal(opened.status, 200);
  assert.ok(openedBody.latestEvent.taskId.startsWith("task-workspace-"));

  const hrBody = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${programBody.program.id}/hr`, {
      headers: { authorization: `Bearer ${programBody.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: programBody.program.id }) },
  )).json();
  assert.equal(hrBody.view.aggregate.openedHandoffs, 1);

  const blocked = await openedRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/opened", {
    caseId: hub.view.case.id,
    targetId: finance.id,
  }, programBody.hrSessionToken));
  assert.ok([400, 401, 403].includes(blocked.status));
});

test("input validation rejects invalid work type, impossible date and unsupported area", async () => {
  const badProfile = await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    workType: "wizard",
    adults: 1,
    children: 0,
    minMonthlyAed: 18000,
  }));
  assert.equal(badProfile.status, 400);

  const badDate = await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: true,
    officeAreaId: "al-maryah-island",
    teamSize: 1,
    moveDate: "2026-02-31",
    annualAllowanceAed: 90000,
  }));
  assert.equal(badDate.status, 400);

  const badArea = await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: true,
    officeAreaId: "made-up-area",
    teamSize: 1,
    moveDate: "2026-12-01",
    annualAllowanceAed: 90000,
  }));
  assert.equal(badArea.status, 400);
});


test("HR projection does not leak personal free-text next actions from shared status", async () => {
  const programBody = await (await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: true,
    officeAreaId: "al-maryah-island",
    teamSize: 1,
    moveDate: "2026-12-25",
    annualAllowanceAed: 105000,
  }))).json();
  const inviteBody = await (await invitesRoute.POST(jsonRequest("http://bankable.test/api/relocation/invites", {}, programBody.hrSessionToken))).json();
  const acceptedBody = await (await acceptInviteRoute.POST(
    jsonRequest(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      token: inviteBody.token,
      profile: { displayName: "Private Note", workType: "employee", adults: 1, children: 0, minMonthlyAed: 26000 },
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  )).json();
  const hub = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${acceptedBody.sessionToken}` },
  }))).json();
  const sharedTask = hub.view.tasks.find((task) => task.category === "housing" && task.sharedWithEmployer);
  const privateText = "private bank identity document note should not appear";

  const reported = await statusRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/status", {
    caseId: hub.view.case.id,
    taskId: sharedTask.id,
    state: "blocked",
    blocker: privateText,
    nextAction: privateText,
  }, acceptedBody.sessionToken));
  assert.equal(reported.status, 200);

  const hrBody = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${programBody.program.id}/hr`, {
      headers: { authorization: `Bearer ${programBody.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: programBody.program.id }) },
  )).json();
  const serialized = JSON.stringify(hrBody.view);
  assert.equal(serialized.includes(privateText), false);
  const employee = hrBody.view.employees.find((item) => item.caseId === hub.view.case.id);
  assert.ok(employee.blockers.every((text) => text.includes(sharedTask.nextAction)));
  assert.ok(employee.milestones.every((milestone) => milestone.nextAction !== privateText));
});

test("solo finance readiness does not show fabricated unlimited allowance cap", async () => {
  const createdBody = await (await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    displayName: "Solo Finance",
    workType: "freelancer",
    adults: 1,
    children: 0,
    minMonthlyAed: 30000,
  }))).json();
  const hub = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }))).json();
  const factors = JSON.stringify(hub.view.financeReadiness.factors);
  assert.equal(factors.includes("9,007,199,254,740,991"), false);
  assert.ok(factors.includes("No company housing allowance"));
});

test("profile patch keeps IDs and timeline while recalculating no-match housing", async () => {
  const createdBody = await (await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    displayName: "Adjustable",
    workType: "employee",
    adults: 1,
    children: 0,
    minMonthlyAed: 1000,
    annualAllowanceAed: 100000,
  }))).json();
  const before = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }))).json();
  const task = before.view.tasks.find((item) => item.category === "housing");
  await statusRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/status", {
    caseId: before.view.case.id,
    taskId: task.id,
    state: "blocked",
    blocker: "Need to adjust affordability.",
  }, createdBody.sessionToken));
  const eventCount = (await relocationStore.read(false)).events.length;

  const patched = await meRoute.PATCH(jsonRequest("http://bankable.test/api/relocation/profiles/me", {
    minMonthlyAed: 28000,
    maxMonthlyAed: 30000,
    adults: 1,
    children: 0,
    preferredAreaIds: ["khalifa-city"],
  }, createdBody.sessionToken));
  const patchedBody = await patched.json();
  assert.equal(patched.status, 200);
  assert.equal(patchedBody.view.profile.id, createdBody.profile.id);
  assert.equal(patchedBody.view.case.id, before.view.case.id);
  assert.equal(patchedBody.view.profile.income.minMonthlyAed, 28000);
  assert.ok(patchedBody.view.recommendations.some((item) => item.type === "home"));
  assert.equal((await relocationStore.read(false)).events.length, eventCount);
});

test("company profile patch recalculates private plan without leaking income to HR", async () => {
  const programBody = await (await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: true,
    officeAreaId: "al-maryah-island",
    teamSize: 1,
    moveDate: "2026-12-28",
    annualAllowanceAed: 90000,
  }))).json();
  const inviteBody = await (await invitesRoute.POST(jsonRequest("http://bankable.test/api/relocation/invites", {}, programBody.hrSessionToken))).json();
  const acceptedBody = await (await acceptInviteRoute.POST(
    jsonRequest(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      token: inviteBody.token,
      profile: { displayName: "HR Privacy", workType: "employee", adults: 1, children: 0, minMonthlyAed: 12000 },
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  )).json();

  const patched = await meRoute.PATCH(jsonRequest("http://bankable.test/api/relocation/profiles/me", {
    minMonthlyAed: 33000,
    maxMonthlyAed: 34000,
    adults: 1,
    children: 0,
  }, acceptedBody.sessionToken));
  assert.equal(patched.status, 200);

  const hrBody = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${programBody.program.id}/hr`, {
      headers: { authorization: `Bearer ${programBody.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: programBody.program.id }) },
  )).json();
  const serialized = JSON.stringify(hrBody.view);
  assert.equal(serialized.includes("33000"), false);
  assert.equal(serialized.includes("34000"), false);
  assert.equal(serialized.includes("minMonthlyAed"), false);
});


test("solo finance recommendation does not serialize AED 0 allowance cap", async () => {
  const createdBody = await (await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    displayName: "Solo Finance Recommendation",
    workType: "freelancer",
    adults: 1,
    children: 0,
    minMonthlyAed: 30000,
  }))).json();
  const hub = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }))).json();
  const finance = hub.view.recommendations.find((item) => item.type === "finance_readiness");
  assert.ok(finance);
  const reasons = JSON.stringify(finance.reasons);
  assert.equal(reasons.includes("AED 0"), false);
  assert.ok(reasons.includes("No company housing allowance"));
});

test("unknown company jurisdiction recommends confirming channel instead of all employer branches", async () => {
  const programBody = await (await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: true,
    officeAreaId: "al-maryah-island",
    teamSize: 1,
    moveDate: "2026-12-29",
    annualAllowanceAed: 100000,
  }))).json();
  const inviteBody = await (await invitesRoute.POST(jsonRequest("http://bankable.test/api/relocation/invites", {}, programBody.hrSessionToken))).json();
  const acceptedBody = await (await acceptInviteRoute.POST(
    jsonRequest(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      token: inviteBody.token,
      profile: { displayName: "Unknown Jurisdiction", workType: "employee", adults: 1, children: 0, minMonthlyAed: 24000 },
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  )).json();
  const hub = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${acceptedBody.sessionToken}` },
  }))).json();
  const services = hub.view.recommendations.filter((item) => item.type === "official_service");
  assert.ok(services.some((item) => item.id.includes("confirm-employer-channel") && item.canContact === false));
  const serviceText = JSON.stringify(services);
  assert.equal(serviceText.includes("ADGM establishment handoff") && serviceText.includes("KEZAD") && serviceText.includes("mainland"), false);
});


test("official service opens map to service category and keep banking private from HR", async () => {
  const programBody = await (await programsRoute.POST(jsonRequest("http://bankable.test/api/relocation/programs", {
    hasUaeEntity: false,
    jurisdiction: "adgm",
    officeAreaId: "al-maryah-island",
    teamSize: 1,
    moveDate: "2026-12-30",
    annualAllowanceAed: 105000,
  }))).json();
  const inviteBody = await (await invitesRoute.POST(jsonRequest("http://bankable.test/api/relocation/invites", {}, programBody.hrSessionToken))).json();
  const acceptedBody = await (await acceptInviteRoute.POST(
    jsonRequest(`http://bankable.test/api/relocation/invites/${inviteBody.inviteId}/accept`, {
      token: inviteBody.token,
      profile: { displayName: "Category Mapping", workType: "employee", adults: 1, children: 0, minMonthlyAed: 30000 },
    }),
    { params: Promise.resolve({ inviteId: inviteBody.inviteId }) },
  )).json();
  const hub = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${acceptedBody.sessionToken}` },
  }))).json();
  const bank = hub.view.recommendations.find((item) => item.resourceId === "personal-bank-current-account");
  const permit = hub.view.recommendations.find((item) => item.resourceId === "adgm-employee-visa-services");
  const insurance = hub.view.recommendations.find((item) => item.resourceId === "abu-dhabi-health-insurance");
  assert.equal(bank.category, "finance");
  assert.equal(permit.category, "residence");
  assert.equal(insurance.category, "insurance");

  const bankOpen = await openedRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/opened", {
    caseId: hub.view.case.id,
    targetId: bank.id,
  }, acceptedBody.sessionToken));
  const bankBody = await bankOpen.json();
  assert.equal(bankOpen.status, 200);
  assert.ok(bankBody.latestEvent.taskId.startsWith("task-finance-"));
  assert.match(bankBody.latestEvent.source.reference, /emiratesnbd/);

  const hrBankOpen = await openedRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/opened", {
    caseId: hub.view.case.id,
    targetId: bank.id,
  }, programBody.hrSessionToken));
  assert.ok([400, 401, 403].includes(hrBankOpen.status));

  let hrBody = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${programBody.program.id}/hr`, {
      headers: { authorization: `Bearer ${programBody.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: programBody.program.id }) },
  )).json();
  assert.equal(hrBody.view.aggregate.openedHandoffs, 0);

  const permitOpen = await openedRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/opened", {
    caseId: hub.view.case.id,
    targetId: permit.id,
  }, programBody.hrSessionToken));
  const permitBody = await permitOpen.json();
  assert.equal(permitOpen.status, 200);
  assert.ok(permitBody.latestEvent.taskId.startsWith("task-residence-"));

  const insuranceOpen = await openedRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/opened", {
    caseId: hub.view.case.id,
    targetId: insurance.id,
  }, programBody.hrSessionToken));
  const insuranceBody = await insuranceOpen.json();
  assert.equal(insuranceOpen.status, 200);
  assert.ok(insuranceBody.latestEvent.taskId.startsWith("task-insurance-"));

  hrBody = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${programBody.program.id}/hr`, {
      headers: { authorization: `Bearer ${programBody.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: programBody.program.id }) },
  )).json();
  assert.equal(hrBody.view.aggregate.openedHandoffs, 2);
  const employee = hrBody.view.employees.find((item) => item.caseId === hub.view.case.id);
  assert.equal(employee.milestones.find((item) => item.category === "residence").state, "opened");
  assert.equal(employee.milestones.find((item) => item.category === "insurance").state, "opened");
  assert.equal(employee.milestones.some((item) => item.category === "finance"), false);
});

test("hub canonicalizes stale stored recommendations with current sources, images and finance provenance", async () => {
  const createdBody = await (await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    workType: "employee",
    adults: 1,
    children: 0,
    minMonthlyAed: 8000,
  }))).json();
  const initial = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }))).json();
  const caseId = initial.view.case.id;
  const lowBudgetHome = initial.view.recommendations.find((item) => item.type === "home" && item.home.id === "snapshot-dubizzle-mbz-studio-105317-xsihcq");
  assert.ok(lowBudgetHome?.home.imageUrl);

  await relocationStore.update((current) => ({
    ...current,
    recommendations: {
      ...current.recommendations,
      [caseId]: current.recommendations[caseId].map((item) => item.id === lowBudgetHome.id
        ? {
            ...item,
            sources: [{ id: "legacy-blank", title: "", publisher: "", url: "", kind: "property_portal", checkedAt: "", confidence: "low", verification: "search_only", supportedClaims: [], limitations: [] }],
            home: { ...item.home, imageUrl: undefined, imageAlt: undefined, imageSourceUrl: undefined },
          }
        : item),
    },
  }));

  const refreshed = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }))).json();
  const fixedHome = refreshed.view.recommendations.find((item) => item.id === lowBudgetHome.id);
  const finance = refreshed.view.recommendations.find((item) => item.type === "finance_readiness");
  assert.ok(fixedHome.home.imageUrl?.startsWith("https://dbz-images.dubizzle.com/"));
  assert.ok(fixedHome.sources[0].title);
  assert.equal(finance.sources[0].checkedAt, "2026-10-02T10:40:06+04:00");
  assert.equal(finance.sources[0].publisher, "Central Bank of the UAE");
});

test("consent expiry and revoke keep active consent list honest", async () => {
  const createdBody = await (await profilesRoute.POST(jsonRequest("http://bankable.test/api/relocation/profiles", {
    workType: "employee",
    adults: 1,
    children: 0,
    minMonthlyAed: 19000,
  }))).json();
  const active = await consentRoute.POST(jsonRequest("http://bankable.test/api/relocation/consents", {
    recipientType: "organization",
    recipientId: "org-test",
    recipientName: "Test Org",
    fields: ["income"],
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }, createdBody.sessionToken));
  const activeBody = await active.json();
  assert.equal(active.status, 200);

  await relocationStore.update((current) => ({
    ...current,
    consents: [
      ...current.consents,
      {
        id: "expired-consent-test",
        personId: createdBody.profile.id,
        recipient: { type: "organization", id: "org-test", name: "Test Org" },
        fields: ["identity_evidence"],
        grantedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        revokedAt: null,
      },
    ],
  }));

  const listed = await (await consentRoute.GET(new Request("http://bankable.test/api/relocation/consents", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }))).json();
  assert.deepEqual(listed.consents.map((consent) => consent.id), [activeBody.consent.id]);

  const revoked = await revokeConsentRoute.DELETE(
    new Request(`http://bankable.test/api/relocation/consents/${activeBody.consent.id}`, {
      headers: { authorization: `Bearer ${createdBody.sessionToken}` },
    }),
    { params: Promise.resolve({ consentId: activeBody.consent.id }) },
  );
  assert.equal(revoked.status, 200);
  const afterRevoke = await (await consentRoute.GET(new Request("http://bankable.test/api/relocation/consents", {
    headers: { authorization: `Bearer ${createdBody.sessionToken}` },
  }))).json();
  assert.deepEqual(afterRevoke.consents, []);
});

test("latest shared blocker clears after resolved transition and provider confirmation is rejected", async () => {
  const boot = await (await bootstrapRoute.POST()).json();
  const hub = await (await meRoute.GET(new Request("http://bankable.test/api/relocation/profiles/me", {
    headers: { authorization: `Bearer ${boot.employees[0].sessionToken}` },
  }))).json();
  const task = hub.view.tasks.find((item) => item.sharedWithEmployer);

  const blocked = await statusRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/status", {
    caseId: hub.view.case.id,
    taskId: task.id,
    state: "blocked",
    blocker: "Waiting on safe document category.",
  }, boot.hrSessionToken));
  assert.equal(blocked.status, 200);
  let hrBody = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${boot.programId}/hr`, {
      headers: { authorization: `Bearer ${boot.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: boot.programId }) },
  )).json();
  assert.ok(hrBody.view.employees.find((employee) => employee.caseId === hub.view.case.id).blockers.length > 0);

  const resolved = await statusRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/status", {
    caseId: hub.view.case.id,
    taskId: task.id,
    state: "resolved",
    nextAction: "Continue shortlist.",
  }, boot.employees[0].sessionToken));
  const resolvedBody = await resolved.json();
  assert.equal(resolved.status, 200);
  assert.equal(resolvedBody.latestEvent.state, "saved");

  hrBody = await (await hrRoute.GET(
    new Request(`http://bankable.test/api/relocation/programs/${boot.programId}/hr`, {
      headers: { authorization: `Bearer ${boot.hrSessionToken}` },
    }),
    { params: Promise.resolve({ programId: boot.programId }) },
  )).json();
  assert.deepEqual(hrBody.view.employees.find((employee) => employee.caseId === hub.view.case.id).blockers, []);

  const confirmed = await statusRoute.POST(jsonRequest("http://bankable.test/api/relocation/actions/status", {
    caseId: hub.view.case.id,
    taskId: task.id,
    state: "confirmed",
  }, boot.hrSessionToken));
  assert.equal(confirmed.status, 400);
});
