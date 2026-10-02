// Exercise the actual local company/employee journey. All people created here are fictional.
import assert from "node:assert/strict";

const base = new URL(process.env.BANKABLE_TEST_URL ?? "http://127.0.0.1:3000");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Run the relocation smoke against a local instance");

async function request(path, { body, token, allowFailure = false } = {}) {
  const response = await fetch(new URL(path, base), {
    method: body === undefined ? "GET" : "POST",
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
  assert.equal(privateHub.budget.estimatedInitialCashAed, null, "Unknown lease terms cannot become a fabricated cash estimate");
  assert.ok(privateHub.recommendations.some((item) => item.type === "official_service"));
  console.log("PASS: personal three-answer start produces a persisted private housing/setup plan");

  const moveDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const company = (await request("/api/relocation/programs", {
    body: { hasUaeEntity: true, officeAreaId: "al-maryah-island", teamSize: 2, moveDate, annualAllowanceAed: 105000 },
  })).payload;
  assert.ok(company.hrSessionToken);
  const hrPath = `/api/relocation/programs/${company.program.id}/hr`;
  privateFieldsAbsent((await request(hrPath, { token: company.hrSessionToken })).payload);

  const invite = (await request("/api/relocation/invites", {
    token: company.hrSessionToken,
    body: { displayName: "Fictional smoke employee" },
  })).payload;
  const inviteBody = { token: invite.token, workType: "employee", adults: 2, children: 1, minMonthlyAed: 28000, maxMonthlyAed: 28000 };
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
