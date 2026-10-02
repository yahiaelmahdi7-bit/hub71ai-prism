// Exercise the actual local company/employee journey. All people created here are fictional.
import assert from "node:assert/strict";

const base = new URL(process.env.BANKABLE_TEST_URL ?? "http://127.0.0.1:3000");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Run the relocation smoke against a local instance");

async function request(path, { body, token, method, allowFailure = false } = {}) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(20000),
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!allowFailure) assert.ok(response.ok, `${path}: HTTP ${response.status}, ${payload.error ?? "unexpected response"}`);
  return { status: response.status, payload };
}

function privateFieldsAbsent(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /"(?:privateEvidence|incomeDocuments|identityEvidence|bankResults|income|minMonthlyAed|minMonthlyIncomeAed|annualBudgetAed)"\s*:/);
}

try {
  const personal = (await request("/api/relocation/profiles", {
    body: { workType: "freelancer", adults: 1, children: 0, minMonthlyAed: 18000, maxMonthlyAed: 22000 },
  })).payload;
  assert.ok(personal.sessionToken);
  const privateHub = (await request("/api/relocation/profiles/me", { token: personal.sessionToken })).payload.view;
  assert.equal(privateHub.profile.workType, "freelancer");
  assert.equal(privateHub.timeline.length, 0, "New profiles must start without invented progress");
  assert.equal(privateHub.budget.estimatedInitialCashAed, null, "Unknown lease terms cannot become a fabricated cash estimate");
  assert.ok(privateHub.recommendations.some((item) => item.type === "official_service"));
  console.log("PASS: personal three-answer start produces a persisted private housing/setup plan");

  const noHomes = (await request("/api/relocation/profiles/me", {
    method: "PATCH", token: personal.sessionToken, body: { minMonthlyAed: 1000, maxMonthlyAed: 1000 },
  })).payload.view;
  assert.equal(noHomes.profile.id, privateHub.profile.id);
  assert.equal(noHomes.case.id, privateHub.case.id);
  assert.equal(noHomes.housingSearch.matches.length, 0);
  assert.ok(noHomes.housingSearch.excluded.length > 0);
  assert.ok(noHomes.recommendations.some((item) => item.type === "official_service"));
  assert.ok(noHomes.recommendations.some((item) => item.type === "workspace"));
  assert.doesNotMatch(noHomes.financeReadiness.factors.join(" "), /9,007,199,254,740,991/);
  console.log("PASS: a no-home plan remains useful and profile edits preserve the journey");

  const moveDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const company = (await request("/api/relocation/programs", {
    body: { hasUaeEntity: true, officeAreaId: "al-maryah-island", teamSize: 2, moveDate, annualAllowanceAed: 105000 },
  })).payload;
  assert.ok(company.hrSessionToken);
  const hrPath = `/api/relocation/programs/${company.program.id}/hr`;
  const emptyProgram = (await request(hrPath, { token: company.hrSessionToken })).payload;
  privateFieldsAbsent(emptyProgram);
  assert.equal(emptyProgram.view.aggregate.cases, 0);
  assert.equal(emptyProgram.view.aggregate.invited, 0);

  const invite = (await request("/api/relocation/invites", {
    token: company.hrSessionToken,
    body: { employeeLabel: "Fictional smoke employee" },
  })).payload;
  const inviteBody = { token: invite.token, profile: { workType: "employee", adults: 2, children: 1, minMonthlyAed: 28000, maxMonthlyAed: 28000 } };
  const joined = (await request(`/api/relocation/invites/${invite.inviteId}/accept`, { body: inviteBody })).payload;
  assert.ok(joined.sessionToken);
  const replay = await request(`/api/relocation/invites/${invite.inviteId}/accept`, { body: inviteBody, allowFailure: true });
  assert.ok(replay.status >= 400 && replay.status < 500, "Invite must be single-use");
  console.log("PASS: a new company invites an employee into their own private journey; replay is rejected");

  const joinedHub = (await request("/api/relocation/profiles/me", { token: joined.sessionToken })).payload.view;
  assert.equal(joinedHub.case.programId, company.program.id);
  const home = joinedHub.recommendations.find((item) => item.type === "home" && item.canContact);
  if (home) {
    assert.ok(home.home.annualRentAed <= joinedHub.housingSearch.annualBudgetAed);
    const opened = (await request("/api/relocation/actions/opened", {
      token: joined.sessionToken,
      body: { caseId: joinedHub.case.id, targetId: home.id },
    })).payload.latestEvent;
    assert.equal(opened.state, "opened");
    assert.ok(opened.updatedAt && opened.source && opened.owner && opened.nextAction);
  } else {
    assert.ok(joinedHub.housingSearch.excluded.length > 0, "No-match plans must explain the housing gap");
  }
  const hr = (await request(hrPath, { token: company.hrSessionToken })).payload.view;
  assert.equal(hr.aggregate.cases, 1);
  privateFieldsAbsent(hr);
  assert.ok(hr.employees.some((employee) => employee.personId === joinedHub.profile.id));
  console.log("PASS: employee actions keep opened provenance and HR sees only permitted progress");

  const sharedTask = joinedHub.tasks.find((task) => task.sharedWithEmployer);
  assert.ok(sharedTask);
  const privateNote = "Fictional private identity and bank note";
  const blocked = (await request("/api/relocation/actions/status", {
    token: joined.sessionToken,
    body: { caseId: joinedHub.case.id, taskId: sharedTask.id, state: "blocked", blocker: privateNote, nextAction: privateNote },
  })).payload.latestEvent;
  assert.equal(blocked.state, "blocked");
  assert.equal(blocked.source.kind, "user_report");
  const blockedHr = (await request(hrPath, { token: company.hrSessionToken })).payload.view;
  assert.equal(blockedHr.aggregate.blocked, 1);
  assert.ok(!JSON.stringify(blockedHr).includes(privateNote), "Private free text cannot leak into HR progress");
  await request("/api/relocation/actions/status", {
    token: joined.sessionToken,
    body: { caseId: joinedHub.case.id, taskId: sharedTask.id, state: "resolved" },
  });
  assert.equal((await request(hrPath, { token: company.hrSessionToken })).payload.view.aggregate.blocked, 0);
  console.log("PASS: reported blockers and resolution reach HR without exposing personal notes");

  const denied = await request(hrPath, { token: personal.sessionToken, allowFailure: true });
  assert.ok([401, 403, 404].includes(denied.status));
  const stillPrivate = await request("/api/relocation/profiles/me", { token: personal.sessionToken });
  assert.equal(stillPrivate.payload.view.profile.id, personal.profile.id);
  console.log("PASS: company/person access is isolated and earlier private sessions remain usable");
  console.log("Relocation HTTP smoke passed. No provider filings, messages, bookings, or approvals were submitted.");
} catch (error) {
  console.error("RELOCATION SMOKE FAILED:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
