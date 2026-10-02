import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '/Users/y/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

// Existing local Chrome/Playwright only. No external messages, filings or bookings.
const base = process.env.BANKABLE_TEST_URL ?? 'http://127.0.0.1:3000';
const origin = new URL(base).origin;
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Run this mutation smoke against localhost only.');
const output = resolve('docs/qa');
await mkdir(output, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const prefix = `relocation-browser-${stamp}`;
const results = [];
const errors = [];
const failedRequests = [];
const externalVisits = [];
const contexts = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const sessionKey = 'bankable-relocation-session-v2';
let company;
let employee;
let personal;
let demo;
let invitation;
let employeeHub;
let originalPersonalId;
let originalPersonalCase;
let hrSession;

function safeText(value) {
  return String(value).replace(/([?&](?:token|inviteId)=)[^\s&"']+/gi, '$1[redacted]').replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]');
}
function requireValue(value, message) { assert(value, message); return value; }
async function check(name, task) {
  const start = performance.now();
  try {
    const detail = await task();
    results.push({ name, status: 'PASS', ms: Math.round(performance.now() - start), ...(detail ? { detail } : {}) });
  } catch (error) {
    const detail = safeText(error.message).split('\n').slice(0, 5).join(' ');
    const blocked = /^(Active company|Created invitation|Accepted employee|Created personal profile|Journey page|Company session|Person session|Browser session).*needed|^(Active company|Created invitation|Accepted employee|Created personal profile|Journey page|Company session|Person session|Browser session).*exist/.test(detail);
    results.push({ name, status: blocked ? 'BLOCKED' : 'FAIL', ms: Math.round(performance.now() - start), detail });
  }
  const result = results.at(-1);
  console.log(`${result.status} ${name} (${result.ms} ms)${result.status !== 'PASS' ? `: ${result.detail}` : ''}`);
}
async function fresh() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  contexts.push(context);
  await context.route('**/*', async (route) => {
    const request = route.request();
    if (request.isNavigationRequest() && new URL(request.url()).origin !== origin) {
      externalVisits.push({ url: request.url(), at: Date.now() });
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>QA provider handoff</title><p>External navigation intercepted for local QA. Nothing submitted.</p>' });
    } else await route.continue();
  });
  context.on('page', (page) => {
    page.setDefaultTimeout(12000);
    page.on('pageerror', (error) => errors.push(safeText(error.message)));
    page.on('requestfailed', (request) => {
      if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
      failedRequests.push({ path: new URL(request.url()).pathname, reason: request.failure()?.errorText });
    });
  });
  return context.newPage();
}
async function visit(page, path) {
  const response = await page.goto(new URL(path, base).toString(), { waitUntil: 'networkidle', timeout: 30000 });
  if (response) assert.equal(response.status(), 200, `${path} must return 200`);
  else assert.equal(new URL(page.url()).origin, origin, `${path} must remain in the local workspace`);
  await page.locator('main').waitFor({ state: 'visible' });
  if (path === '/company/dashboard') await page.getByRole('heading', { name: 'Restoring company dashboard' }).waitFor({ state: 'hidden' });
}
async function visible(locator) { await locator.waitFor({ state: 'visible' }); }
async function shot(page, label) {
  // Root owns the final visual gate; opt in explicitly to masked QA screenshots.
  if (process.env.BANKABLE_QA_SCREENSHOTS !== '1') return undefined;
  const path = resolve(output, `${prefix}-${label}.png`);
  await page.locator('.invite-panel code').evaluateAll((nodes) => nodes.forEach((node) => { node.textContent = 'Private invite link hidden for QA screenshot'; }));
  await page.screenshot({ path, fullPage: true });
  return `docs/qa/${prefix}-${label}.png`;
}
async function saved(page) { return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? 'null'), sessionKey); }
async function hub(page) {
  const state = requireValue(await saved(page), 'Browser session must exist');
  const entry = state.employeeTokens.find((item) => item.personId === state.selectedId) ?? state.employeeTokens[0];
  assert(entry?.sessionToken, 'Person session must exist');
  const response = await page.context().request.get(`${base}/api/relocation/profiles/me`, { headers: { authorization: `Bearer ${entry.sessionToken}` } });
  assert.equal(response.status(), 200, 'Private own-profile read must succeed');
  return (await response.json()).view;
}
async function hr() {
  assert(hrSession?.hrToken && hrSession?.programId, 'Company session must exist');
  const response = await company.context().request.get(`${base}/api/relocation/programs/${hrSession.programId}/hr`, { headers: { authorization: `Bearer ${hrSession.hrToken}` } });
  assert.equal(response.status(), 200, 'Scoped company read must succeed');
  return (await response.json()).view;
}
function assertPrivateProjection(value) {
  const forbidden = new Set(['income', 'privateEvidence', 'incomeDocuments', 'identityEvidence', 'bankResults', 'financeReadiness', 'minMonthlyIncomeAed', 'annualBudgetAed']);
  function inspect(item) {
    if (!item || typeof item !== 'object') return;
    for (const [key, child] of Object.entries(item)) {
      assert(!forbidden.has(key), `HR payload must not contain private ${key}`);
      inspect(child);
    }
  }
  inspect(value);
}
async function personalFields(page, { name = '', work = 'employee', household = 'single', income = '28000', upper = '' } = {}) {
  await page.getByLabel('Name', { exact: false }).fill(name);
  await page.getByLabel('Work type').selectOption(work);
  await page.getByLabel('Household').selectOption(household);
  await page.locator('input[name="incomeMin"]').fill(income);
  await page.getByLabel('Monthly income upper range').fill(upper);
}
async function postClick(page, button, suffix, method = 'POST') {
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith(suffix) && response.request().method() === method);
  await button.click();
  const response = await responsePromise;
  const payload = await response.json();
  assert(response.ok(), `${method} ${suffix} must succeed; got ${response.status()}${typeof payload.error === 'string' ? `: ${safeText(payload.error)}` : ''}`);
  return payload;
}
async function assertNoOverflow(page) {
  const dims = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }));
  assert(Math.max(dims.body, dims.document) <= dims.viewport + 1, `Horizontal overflow: ${JSON.stringify(dims)}`);
}
async function reportStatus(page, taskId, state, { next = 'Follow up with the responsible provider.', reference = '', blocker = '' } = {}) {
  await page.locator('.roadmap-form').getByRole('combobox').first().selectOption(taskId);
  await page.locator('.roadmap-form').getByRole('combobox').nth(1).selectOption(state);
  await page.getByLabel('Next action', { exact: true }).fill(next);
  await page.getByLabel('Reference', { exact: false }).fill(reference);
  if (state === 'blocked') await page.getByLabel('Blocker', { exact: true }).fill(blocker);
  const result = await postClick(page, page.getByRole('button', { name: 'Save user-reported status', exact: true }), '/actions/status');
  await visible(page.getByRole('status').filter({ hasText: 'Status saved' }));
  return result;
}
async function openAction(page, hash, locator) {
  const route = `/move${hash}`;
  await visit(page, route);
  const prior = externalVisits.length;
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/actions/opened') && response.request().method() === 'POST');
  await locator(page).click();
  const response = await responsePromise;
  assert(response.ok(), `Opening action must persist; got ${response.status()}`);
  const result = await response.json();
  assert.equal(result.latestEvent?.state, 'opened', 'External navigation must be opened only');
  assert(result.latestEvent?.source && result.latestEvent.updatedAt && result.latestEvent.owner && result.latestEvent.nextAction, 'Opened event must retain complete provenance');
  await page.waitForTimeout(300);
  assert(externalVisits.length > prior, 'Actual provider navigation must occur');
  const stayed = new URL(page.url()).origin === origin && new URL(page.url()).pathname === '/move' && new URL(page.url()).hash === hash;
  for (const popup of page.context().pages()) if (popup !== page) await popup.close();
  if (!stayed) await visit(page, route);
  assert(stayed, 'External action must keep the private workspace open in its original tab');
  return 'Provider URL observed and intercepted; no submission or booking occurred.';
}

try {
  await check('Landing and start are distinct focused pages', async () => {
    personal = await fresh();
    await visit(personal, '/');
    assert.equal(await saved(personal), null, 'Landing must not automatically select a demo');
    await personal.getByRole('link', { name: 'Get started', exact: false }).first().click();
    await personal.waitForURL('**/start');
    await visible(personal.getByRole('heading', { name: 'Start with the move you are making.' }));
    assert.equal(await personal.locator('input[name="incomeMin"]').count(), 0, 'Journey choice must not duplicate personal intake');
    return await shot(personal, 'start-desktop');
  });
  await check('Public area directory and detail lead to personal planning', async () => {
    await visit(personal, '/areas');
    await personal.getByRole('link').filter({ has: personal.getByRole('heading', { name: 'Al Reem Island', exact: true }) }).click();
    await personal.waitForURL('**/areas/al-reem-island');
    await visible(personal.getByRole('heading', { name: 'Al Reem Island', exact: true }));
    const href = await personal.getByRole('link', { name: 'Use in my move', exact: true }).getAttribute('href');
    assert.equal(href, '/move?area=al-reem-island');
    assert(await personal.locator('a[target="_blank"]').count() > 0, 'Area detail needs real source links');
  });
  await check('Mainland, ADGM and KEZAD information routes remain separate', async () => {
    for (const route of ['mainland', 'adgm', 'kezad']) {
      await visit(personal, `/setup/${route}`);
      const url = await personal.getByRole('link', { name: /^Open (official service|source page)$/ }).getAttribute('href');
      assert(url?.startsWith('https://'), 'Official service must have an external source URL');
    }
  });
  await check('Fresh company dashboard offers a functional create-program action', async () => {
    company = await fresh();
    await visit(company, '/company/dashboard');
    await visible(company.getByRole('heading', { name: 'No company program yet.' }));
    assert.equal(await company.getByRole('link', { name: 'Create company program', exact: true }).getAttribute('href'), '/company');
    assert.equal(await saved(company), null, 'Empty state must not load seeded employees');
    return await shot(company, 'empty-company-desktop');
  });
  await check('Company server validation preserves entered information', async () => {
    await company.getByRole('link', { name: 'Create company program', exact: true }).click();
    await company.waitForURL('**/company');
    await company.getByLabel('Company name', { exact: false }).fill('Fictional browser QA company');
    await company.getByLabel('Office area', { exact: true }).fill('Invalid QA office area');
    await company.getByLabel('Team size', { exact: true }).fill('5');
    await company.getByLabel('Move date', { exact: true }).fill(new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10));
    await company.getByLabel('Annual housing allowance', { exact: true }).fill('105000');
    const responsePromise = company.waitForResponse((response) => new URL(response.url()).pathname === '/api/relocation/programs' && response.request().method() === 'POST');
    await company.getByRole('button', { name: 'Create company dashboard', exact: true }).click();
    const response = await responsePromise;
    assert(response.status() >= 400 && response.status() < 500, 'Unknown office area must produce a recoverable validation error');
    await visible(company.locator('main').getByRole('alert'));
    assert.equal(await company.getByLabel('Team size', { exact: true }).inputValue(), '5');
    assert.equal(await company.getByLabel('Annual housing allowance', { exact: true }).inputValue(), '105000');
    assert.equal(await company.getByLabel('Company name', { exact: false }).inputValue(), 'Fictional browser QA company');
  });
  await check('Create company redirects to a zero-employee dashboard with enabled invitation', async () => {
    await company.getByLabel('Office area', { exact: true }).fill('Al Maryah Island');
    await postClick(company, company.getByRole('button', { name: 'Create company dashboard', exact: true }), '/programs');
    await company.waitForURL('**/company/dashboard');
    await visible(company.getByRole('heading', { name: 'No employees yet', exact: true }));
    assert(await company.getByRole('button', { name: 'Create invite link', exact: true }).isEnabled(), 'Invite button must be enabled for an active program');
    assert.equal(await company.locator('main').getByText('Create local invite token', { exact: true }).count(), 0);
    assert.equal(await company.locator('main').getByText('0 opened handoffs', { exact: true }).count(), 0);
    hrSession = await saved(company);
    const view = await hr();
    assert.equal(view.aggregate.cases, 0);
    assert.equal(view.employees.length, 0);
    assertPrivateProjection(view);
    return await shot(company, 'created-empty-company-desktop');
  });
  await check('Create and copy an actual invite link without claiming delivery', async () => {
    requireValue(hrSession, 'Active company needed');
    await company.getByLabel('Employee label', { exact: false }).fill('Fictional invited employee');
    invitation = await postClick(company, company.getByRole('button', { name: 'Create invite link', exact: true }), '/invites');
    assert(invitation.inviteId && invitation.token, 'Invite endpoint must return a real access link');
    await visible(company.getByRole('button', { name: 'Copy invite link', exact: true }));
    await company.getByRole('button', { name: 'Copy invite link', exact: true }).click();
    const copied = await company.evaluate(() => navigator.clipboard.readText());
    const parsed = new URL(copied);
    assert.equal(parsed.origin, origin);
    assert.equal(parsed.pathname, '/join');
    assert(parsed.searchParams.get('inviteId') === invitation.inviteId, 'Copied link must carry the issued invite identifier');
    assert(parsed.searchParams.get('token') === invitation.token, 'Copied link must carry the issued private access code');
    assert((await company.locator('.invite-panel').innerText()).includes('does not send or confirm delivery'));
    return 'Private access link copied; its token is excluded from artifacts.';
  });
  await check('Employee accepts the full invite in a separate browser session', async () => {
    requireValue(invitation, 'Created invitation needed');
    employee = await fresh();
    await visit(employee, `/join?inviteId=${encodeURIComponent(invitation.inviteId)}&token=${encodeURIComponent(invitation.token)}`);
    assert((await employee.getByLabel('Invite ID', { exact: true }).inputValue()) === invitation.inviteId, 'Complete invite URL must fill invite ID');
    assert((await employee.getByLabel('Invite access code', { exact: true }).inputValue()) === invitation.token, 'Complete invite URL must fill access code');
    await personalFields(employee, { name: 'Fictional browser QA employee', household: 'family', income: '28000' });
    await postClick(employee, employee.getByRole('button', { name: 'Accept invite with new private profile', exact: true }), '/accept');
    await employee.waitForURL('**/move');
    await visible(employee.getByRole('heading', { name: 'Fictional browser QA employee', exact: true }));
    employeeHub = await hub(employee);
    assert.equal(employeeHub.case.programId, hrSession.programId);
    assert(employeeHub.recommendations.some((item) => item.type === 'official_service'), 'New employee must have a real setup path');
    assert(employeeHub.timeline.every((event) => event.state === 'saved' && event.source.kind === 'user_report'), 'Only the genuine invite acceptance may appear in the initial employee timeline');
  });
  await check('Employee refresh restores the same private profile', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    const id = employeeHub.profile.id;
    await employee.reload({ waitUntil: 'networkidle' });
    await visible(employee.getByRole('heading', { name: 'Fictional browser QA employee', exact: true }));
    assert.equal((await hub(employee)).profile.id, id);
    assert.equal((await saved(employee)).hrToken, null, 'Employee must not acquire the HR capability');
    return await shot(employee, 'employee-overview-desktop');
  });
  await check('Timeline route shows the roadmap with genuine initial events only', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    await visit(employee, '/move#timeline');
    await visible(employee.getByRole('heading', { name: 'Move roadmap', exact: true }));
    assert.equal((await hub(employee)).timeline.length, 1, 'Timeline should begin with the actual invite acceptance only');
    await visible(employee.locator('#timeline').getByRole('heading', { name: 'No event for this step yet', exact: true }));
  });
  await check('Report a blocker with provenance; HR receives only shared progress', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    const task = requireValue(employeeHub.tasks.find((item) => item.category === 'housing'), 'Housing task needed');
    await reportStatus(employee, task.id, 'blocked', { next: 'PRIVATE-QA-NOTE: inspect my personal cash', blocker: 'PRIVATE-QA-BLOCKER: personal income details' });
    employeeHub = await hub(employee);
    const event = employeeHub.timeline.at(-1);
    assert.equal(event.state, 'blocked');
    assert.equal(event.source.kind, 'user_report');
    assert(event.updatedAt && event.owner && event.nextAction);
    const view = await hr();
    assertPrivateProjection(view);
    assert.equal(view.aggregate.accepted, 1);
    assert.equal(view.aggregate.blocked, 1, 'Shared blocker must affect HR aggregate');
    assert(!JSON.stringify(view).includes('PRIVATE-QA'), 'Personal free-text notes must stay private');
    await company.reload({ waitUntil: 'networkidle' });
    await visible(company.getByText('Fictional browser QA employee', { exact: true }));
  });
  await check('Saved progress resolves the current shared blocker without erasing history', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    const task = employeeHub.tasks.find((item) => item.category === 'housing');
    await reportStatus(employee, task.id, 'saved');
    employeeHub = await hub(employee);
    assert(employeeHub.timeline.some((event) => event.state === 'blocked'), 'Earlier blocker history must remain');
    assert.equal(employeeHub.timeline.at(-1).state, 'saved');
    assert.equal((await hr()).aggregate.blocked, 0, 'Resolved blockers must not remain in the aggregate');
  });
  await check('Reported booking requires a reference and remains user-reported', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    const task = employeeHub.tasks.find((item) => item.category === 'housing');
    await reportStatus(employee, task.id, 'reported_booked', { reference: 'FICTIONAL-QA-BOOKING-001' });
    employeeHub = await hub(employee);
    const event = employeeHub.timeline.at(-1);
    assert.equal(event.state, 'reported_booked');
    assert.equal(event.source.kind, 'user_report');
    assert.equal(event.source.reference, 'FICTIONAL-QA-BOOKING-001');
    const timelineText = await employee.locator('#timeline').innerText();
    assert.match(timelineText, /reported booked/i, `Roadmap should render its newly reported housing event: ${timelineText}`);
    return await shot(employee, 'employee-timeline-desktop');
  });
  await check('An affordable real home opens its original listing and preserves the workspace tab', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    assert(employeeHub.recommendations.some((item) => item.type === 'home' && item.home.contactable && !item.home.synthetic), 'Employee needs at least one real contactable listing');
    return openAction(employee, '#homes', (page) => page.getByRole('button', { name: /^(Open listing|View) on / }).first());
  });
  await check('Official-service navigation records opened only and preserves the private tab', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    return openAction(employee, '#setup', (page) => page.locator('#setup .action-row button:not([disabled])').first());
  });
  await check('Workspace navigation records opened only and preserves the private tab', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    return openAction(employee, '#workspaces', (page) => page.locator('#workspaces .action-row button:not([disabled])').first());
  });
  await check('A browser-blocked popup explains recovery without inventing an opened event', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    await visit(employee, '/move#workspaces');
    const before = (await hub(employee)).timeline.length;
    let attempts = 0;
    const listener = (request) => { if (new URL(request.url()).pathname.endsWith('/actions/opened') && request.method() === 'POST') attempts += 1; };
    employee.on('request', listener);
    await employee.evaluate(() => { window.__qaOriginalOpen = window.open; window.open = () => null; });
    try {
      await employee.locator('#workspaces .action-row button:not([disabled])').first().click();
      await visible(employee.locator('main').getByRole('alert'));
      assert.equal(attempts, 0, 'A blocked new tab must not be recorded as opened');
      assert.equal((await hub(employee)).timeline.length, before);
    } finally {
      employee.off('request', listener);
      await employee.evaluate(() => { window.open = window.__qaOriginalOpen; delete window.__qaOriginalOpen; });
    }
  });
  await check('Final employee/HR progress persists without private financial data', async () => {
    requireValue(employeeHub, 'Accepted employee needed');
    employeeHub = await hub(employee);
    assert(employeeHub.timeline.filter((event) => event.state === 'opened').length >= 3);
    assert.equal(employeeHub.timeline.filter((event) => event.state === 'confirmed').length, 0);
    await company.reload({ waitUntil: 'networkidle' });
    await visible(company.getByText('Fictional browser QA employee', { exact: true }));
    const view = await hr();
    assertPrivateProjection(view);
    assert(view.aggregate.openedHandoffs > 0);
    return await shot(company, 'employee-progress-hr-desktop');
  });
  await check('Personal API error leaves the form intact for retry', async () => {
    await visit(personal, '/move');
    await personalFields(personal, { name: 'Fictional low-income browser QA', work: 'freelancer', income: '1000' });
    await personal.route('**/api/relocation/profiles', async (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service temporarily unavailable. Please try again.' }) }), { times: 1 });
    const failedResponse = personal.waitForResponse((response) => new URL(response.url()).pathname === '/api/relocation/profiles' && response.request().method() === 'POST');
    await personal.getByRole('button', { name: 'Create private hub', exact: true }).click();
    assert.equal((await failedResponse).status(), 503);
    await visible(personal.locator('main').getByRole('alert'));
    assert.equal(await personal.locator('input[name="incomeMin"]').inputValue(), '1000');
    assert.equal(await personal.getByLabel('Name', { exact: false }).inputValue(), 'Fictional low-income browser QA');
    assert.equal(await personal.getByLabel('Work type').inputValue(), 'freelancer');
  });
  await check('Low-income personal journey has an actionable housing empty state and setup options', async () => {
    await postClick(personal, personal.getByRole('button', { name: 'Create private hub', exact: true }), '/profiles');
    await visible(personal.getByRole('heading', { name: 'Fictional low-income browser QA', exact: true }));
    const view = await hub(personal);
    originalPersonalId = view.profile.id;
    originalPersonalCase = view.case.id;
    assert.equal(view.recommendations.filter((item) => item.type === 'home').length, 0);
    assert(view.recommendations.some((item) => item.type === 'official_service'));
    await visit(personal, '/move#homes');
    await visible(personal.getByRole('heading', { name: 'No affordable source-linked homes yet', exact: true }));
    assert.equal(await personal.getByRole('link', { name: 'Edit my plan', exact: true }).last().getAttribute('href'), '/move/profile');
    assert.equal(await personal.getByRole('button', { name: /^(Open listing|View) on / }).count(), 0);
    return await shot(personal, 'housing-empty-desktop');
  });
  await check('Editing income to zero keeps the same profile and complete useful setup plan', async () => {
    requireValue(originalPersonalId, 'Created personal profile needed');
    await visit(personal, '/move#timeline');
    await visible(personal.getByRole('heading', { name: 'No event for this step yet', exact: true }));
    const before = await hub(personal);
    await reportStatus(personal, before.tasks[0].id, 'saved');
    await visit(personal, '/move/profile');
    await personal.locator('input[name="incomeMin"]').fill('0');
    await postClick(personal, personal.getByRole('button', { name: 'Save plan inputs', exact: true }), '/profiles/me', 'PATCH');
    await personal.waitForURL('**/move');
    const after = await hub(personal);
    assert.equal(after.profile.id, originalPersonalId);
    assert.equal(after.case.id, originalPersonalCase);
    assert.equal(after.profile.income.minMonthlyAed, 0);
    assert(after.timeline.some((event) => event.state === 'saved'));
    assert.equal(after.recommendations.filter((item) => item.type === 'home').length, 0);
    assert(after.recommendations.some((item) => item.type === 'official_service'));
    await personal.reload({ waitUntil: 'networkidle' });
    await visible(personal.getByRole('heading', { name: 'Fictional low-income browser QA', exact: true }));
    assert.equal((await hub(personal)).profile.id, originalPersonalId);
  });
  await check('Fictional demo is opt-in and contains five useful private journeys', async () => {
    demo = await fresh();
    await visit(demo, '/start');
    assert.equal(await saved(demo), null);
    await postClick(demo, demo.getByRole('button', { name: 'Explore fictional five-person demo', exact: true }), '/bootstrap');
    await demo.waitForURL('**/company/dashboard');
    await visible(demo.getByRole('button', { name: 'Fictional demo loaded', exact: true }));
    const state = await saved(demo);
    assert.equal(state.employeeTokens.length, 5);
    await demo.getByRole('link', { name: 'My move', exact: true }).click();
    await demo.waitForURL('**/move');
    await visible(demo.getByRole('combobox', { name: 'Choose private profile', exact: true }));
    for (const entry of state.employeeTokens) {
      await demo.getByRole('combobox', { name: 'Choose private profile', exact: true }).selectOption(entry.personId);
      await visible(demo.getByRole('heading', { name: entry.displayName, exact: true }));
      assert((await demo.locator('.metric').allTextContents()).some((value) => value.includes('Rent budget')));
      await visit(demo, '/move#setup');
      await visible(demo.getByRole('heading', { name: entry.displayName, exact: true }));
      assert(await demo.locator('#setup .action-row').count() > 0, 'Each selected demo employee needs setup actions');
      await visit(demo, '/move');
    }
    const token = state.hrToken;
    const response = await demo.context().request.get(`${base}/api/relocation/programs/${state.programId}/hr`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status(), 200);
    const view = (await response.json()).view;
    assert.equal(view.employees.length, 5);
    assertPrivateProjection(view);
    return await shot(demo, 'demo-private-desktop');
  });
  for (const width of [1440, 390]) {
    await check(`Desktop/mobile focused routes have no overflow at ${width}px`, async () => {
      for (const [page, paths] of [[personal, ['/', '/start', '/areas', '/move', '/move/profile', '/move#timeline']], [company, ['/company/dashboard']], [employee, ['/move#homes', '/move#setup', '/move#workspaces', '/move#budget']]]) {
        requireValue(page, 'Journey page needed');
        await page.setViewportSize({ width, height: 900 });
        for (const path of paths) {
          await visit(page, path);
          await page.waitForTimeout(150);
          await assertNoOverflow(page);
        }
      }
      if (width === 390) {
        await visit(personal, '/move#timeline');
        await shot(personal, 'timeline-mobile');
        await visit(company, '/company/dashboard');
        await shot(company, 'company-mobile');
        await visit(personal, '/');
        return await shot(personal, 'landing-mobile');
      }
    });
  }
  await check('Browser has no JavaScript exceptions or unexpected failed requests', async () => {
    assert.equal(errors.length, 0, `${errors.length} JavaScript exceptions: ${errors.slice(0, 3).join(' | ')}`);
    assert.equal(failedRequests.length, 0, `${failedRequests.length} failed requests: ${JSON.stringify(failedRequests.slice(0, 5))}`);
  });
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  const failures = results.filter((result) => result.status !== 'PASS');
  const slow = results.filter((result) => result.ms > 20000);
  const report = {
    target: origin,
    checkedAt: new Date().toISOString(),
    verdict: failures.length ? 'FAIL' : 'PASS',
    checks: results,
    javascriptErrors: errors,
    failedRequests,
    externalNavigationCount: externalVisits.length,
    externalNavigation: 'Provider URLs were observed in memory and intercepted; no external submission or booking was made. Private tokens and invitation URLs are not persisted.',
  };
  await writeFile(resolve(output, `${prefix}.json`), `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    `${report.verdict} — ${results.length - failures.length}/${results.length} browser checks passed.`,
    '',
    `Target: ${origin}. Checked: ${report.checkedAt}. Fresh isolated browser contexts used for personal, company, employee and fictional demo journeys. All records created by this script are fictional local QA records.`,
    '',
    'Provider navigation was intercepted after observing the actual link. No messages, official filings or bookings were submitted. Bearer tokens and invite access codes are excluded from artifacts; invite links are masked before screenshots.',
    '',
    '| Check | Result | Time | Evidence or failure |',
    '| --- | --- | --- | --- |',
    ...results.map((result) => `| ${result.name} | ${result.status} | ${(result.ms / 1000).toFixed(2)} s | ${(result.detail ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')} |`),
    '',
    `SLOW (>20 s): ${slow.length ? slow.map((result) => result.name).join('; ') : 'None.'}`,
    `JavaScript exceptions: ${errors.length}. Unexpected failed requests: ${failedRequests.length}.`,
    '',
    `Reproduce: \`BANKABLE_TEST_URL=${origin} node tests/e2e/relocation-browser.mjs\` with the matching local production server running. The script closes every browser context and exits non-zero if a check fails.`,
    '',
    'Production identity, provider webhooks, document extraction and hosted-storage deployment are outside this browser gate.',
  ];
  await writeFile(resolve(output, `${prefix}.md`), `${md.join('\n')}\n`);
  console.log(`${report.verdict}: ${results.length - failures.length}/${results.length}. Report docs/qa/${prefix}.md`);
  if (failures.length) process.exitCode = 1;
}
