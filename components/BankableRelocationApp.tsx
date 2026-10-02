"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  apiGet,
  apiPost,
  type BootstrapPreviewPayload,
  type DemoCapabilities,
  type HrView,
  type HrViewPayload,
  type InviteCreatePayload,
  type OpenedActionPayload,
  type PersonHub,
  type PersonHubPayload,
  type ProfileCreatePayload,
  type ProgramCreatePayload,
  type Recommendation,
  type RouteChoice,
  type ViewMode,
} from "./relocation-api";

type HomeRecommendation = Extract<Recommendation, { type: "home" }>;
type ActionRecommendation = Exclude<Recommendation, { type: "home" }>;
type EmployeeToken = DemoCapabilities["employees"][number];
type EmployeeListItem = { personId: string; displayName: string; hub?: PersonHub };

type Notice = { tone: "neutral" | "success" | "error"; text: string } | null;

const money = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-AE");

const setupRoutes = [
  {
    id: "mainland",
    title: "Mainland through ADDED",
    authority: "Abu Dhabi Department of Economic Development",
    actionUrl: "https://www.added.gov.ae/en/set-up/establish-your-business/licensing-requirements",
    nextAction: "Open ADDED or TAMM and record only the official reference you receive.",
    source: "ADDED licensing requirements, checked 2026-10-02",
  },
  {
    id: "adgm",
    title: "ADGM establishment",
    authority: "ADGM Registration Authority",
    actionUrl: "https://www.adgm.com/registration-authority/registration-and-incorporation",
    nextAction: "Open the ADGM registry flow; Bankable does not claim submission until there is evidence.",
    source: "ADGM registration and incorporation, checked 2026-10-02",
  },
  {
    id: "kezad",
    title: "KEZAD free zone setup",
    authority: "KEZAD Group",
    actionUrl: "https://www.kezadgroup.com/business-facilities/free-zone-business-setup-solutions/",
    nextAction: "Open KEZAD setup and keep package, licence, and visa actions separate from mainland and ADGM.",
    source: "KEZAD setup, checked 2026-10-02",
  },
];

export function BankableRelocationApp() {
  const [route, setRoute] = useState<RouteChoice>("move-team");
  const [view, setView] = useState<ViewMode>("hr");
  const [preview, setPreview] = useState<BootstrapPreviewPayload["demo"] | null>(null);
  const [hrView, setHrView] = useState<HrView | null>(null);
  const [people, setPeople] = useState<PersonHub[]>([]);
  const [hrToken, setHrToken] = useState<string | null>(null);
  const [employeeTokens, setEmployeeTokens] = useState<EmployeeToken[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<InviteCreatePayload | null>(null);

  useEffect(() => {
    let mounted = true;
    apiGet<BootstrapPreviewPayload>("/api/relocation/bootstrap")
      .then((payload) => {
        if (!mounted) return;
        setPreview(payload.demo);
        setHrView(payload.demo.hr);
        setSelectedId(payload.demo.employees[0]?.personId ?? "");
      })
      .catch((error: Error) => mounted && setNotice({ tone: "error", text: error.message }))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const selected = people.find((person) => person.profile.id === selectedId) ?? people[0] ?? null;
  const selectedHrRow = hrView?.employees.find((employee) => employee.personId === (selected?.profile.id ?? selectedId));
  const selectedToken = employeeTokens.find((employee) => employee.personId === selected?.profile.id)?.sessionToken ?? null;
  const program = hrView?.program ?? preview?.hr.program ?? null;
  const organization = hrView?.organization ?? preview?.hr.organization ?? null;
  const previewEmployees = preview?.employees ?? [];
  const demoActive = people.length > 0 && employeeTokens.length > 0;
  const employeeList: EmployeeListItem[] = demoActive
    ? people.map((person) => ({ personId: person.profile.id, displayName: person.profile.displayName, hub: person }))
    : previewEmployees;

  async function refreshDemo(nextProgramId = program?.id, nextHrToken = hrToken, nextEmployeeTokens = employeeTokens) {
    if (!nextProgramId || !nextHrToken) return;
    const [hrPayload, hubs] = await Promise.all([
      apiGet<HrViewPayload>(`/api/relocation/programs/${nextProgramId}/hr`, nextHrToken),
      Promise.all(nextEmployeeTokens.map((employee) => apiGet<PersonHubPayload>("/api/relocation/profiles/me", employee.sessionToken))),
    ]);
    setHrView(hrPayload.view);
    setPeople(hubs.map((payload) => payload.view));
    setSelectedId((current) => current || nextEmployeeTokens[0]?.personId || "");
  }

  async function seedLocalDemo() {
    setBusy(true);
    setNotice(null);
    try {
      const seeded = await apiPost<DemoCapabilities>("/api/relocation/bootstrap");
      setHrToken(seeded.hrSessionToken);
      setEmployeeTokens(seeded.employees);
      setSelectedId(seeded.employees[0]?.personId ?? "");
      await refreshDemo(seeded.programId, seeded.hrSessionToken, seeded.employees);
      setView("employee");
      setNotice({ tone: "success", text: "Local five-person demo started. Tokens stay in this browser session and are used only to fetch permitted projections." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not start local demo." });
    } finally {
      setBusy(false);
    }
  }

  async function openTarget(target: { caseId: string; id: string; url: string | null; token: string | null }) {
    if (!target.url) return;
    if (!target.token) {
      setNotice({ tone: "error", text: "Start the local demo or create a private profile before recording opened actions." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await apiPost<OpenedActionPayload>("/api/relocation/actions/opened", { caseId: target.caseId, targetId: target.id }, target.token);
      window.open(target.url, "_blank", "noopener,noreferrer");
      if (demoActive) await refreshDemo();
      else if (target.token) {
        const hub = await apiGet<PersonHubPayload>("/api/relocation/profiles/me", target.token);
        setPeople([hub.view]);
      }
      setNotice({ tone: "success", text: "External handoff recorded as opened only. Submission, booking, contact and approval remain provider- or user-reported." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not record opened action." });
    } finally {
      setBusy(false);
    }
  }

  async function handleProfileCreate(values: PersonalValues) {
    setBusy(true);
    setNotice(null);
    try {
      const created = await apiPost<ProfileCreatePayload>("/api/relocation/profiles", {
        displayName: values.displayName.trim() || "My move",
        workType: values.workType,
        adults: values.household === "single" ? 1 : 2,
        children: values.household === "family" ? 1 : 0,
        minMonthlyAed: values.incomeMin,
        maxMonthlyAed: values.incomeMax || values.incomeMin,
      });
      const hub = await apiGet<PersonHubPayload>("/api/relocation/profiles/me", created.sessionToken);
      setPeople([hub.view]);
      setEmployeeTokens([{ personId: hub.view.profile.id, displayName: hub.view.profile.displayName, sessionToken: created.sessionToken }]);
      setSelectedId(hub.view.profile.id);
      setView("employee");
      setNotice({ tone: "success", text: "Private move hub created. It is separate from HR until you accept an invite or grant consent." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not create private profile." });
    } finally {
      setBusy(false);
    }
  }

  async function handleProgramCreate(values: ProgramValues) {
    setBusy(true);
    setNotice(null);
    try {
      const created = await apiPost<ProgramCreatePayload>("/api/relocation/programs", {
        organizationName: values.organizationName.trim() || "Company move",
        hasUaeEntity: values.hasUaeEntity,
        jurisdiction: values.hasUaeEntity ? undefined : values.jurisdiction,
        officeAreaId: values.officeAreaId,
        teamSize: values.teamSize,
        moveDate: values.moveDate,
        annualAllowanceAed: values.annualAllowanceAed,
      });
      setHrToken(created.hrSessionToken);
      const fresh = await apiGet<HrViewPayload>(`/api/relocation/programs/${created.program.id}/hr`, created.hrSessionToken);
      setHrView(fresh.view);
      setPeople([]);
      setEmployeeTokens([]);
      setView("hr");
      setNotice({ tone: "success", text: "Move program created. Employee invites can now be issued from HR, with private employee plans kept separate." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not create company program." });
    } finally {
      setBusy(false);
    }
  }

  async function handleInviteCreate() {
    const personId = selected?.profile.id ?? selectedId;
    if (!hrToken || !personId) {
      setNotice({ tone: "error", text: "Start the local company demo before issuing a demo invite." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const issued = await apiPost<InviteCreatePayload>("/api/relocation/invites", { personId }, hrToken);
      setInvite(issued);
      setNotice({ tone: "success", text: "Invite token created locally. It has not been emailed or sent externally." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not create invite." });
    } finally {
      setBusy(false);
    }
  }

  async function handleInviteAccept(inviteId: string, token: string) {
    setBusy(true);
    setNotice(null);
    try {
      const accepted = await apiPost<ProfileCreatePayload>(`/api/relocation/invites/${inviteId}/accept`, { token });
      const hub = await apiGet<PersonHubPayload>("/api/relocation/profiles/me", accepted.sessionToken);
      setPeople((current) => upsertHub(current, hub.view));
      setEmployeeTokens((current) => upsertToken(current, { personId: hub.view.profile.id, displayName: hub.view.profile.displayName, sessionToken: accepted.sessionToken }));
      setSelectedId(hub.view.profile.id);
      setView("employee");
      if (hrToken && hub.view.case.programId) await refreshDemo(hub.view.case.programId, hrToken, upsertToken(employeeTokens, { personId: hub.view.profile.id, displayName: hub.view.profile.displayName, sessionToken: accepted.sessionToken }));
      setNotice({ tone: "success", text: "Invite accepted. The employee continues in a private journey; HR receives only the permitted progress projection." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not accept invite." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="topbar" aria-label="Bankable header">
        <a href="#hub" className="brand" aria-label="Bankable home">
          <span className="brand-mark">B</span>
          <span>Bankable</span>
        </a>
        <nav aria-label="Primary">
          <a href="#routes">Start</a>
          <a href="#hub">Hub</a>
          <a href="#timeline">Timeline</a>
        </nav>
      </header>

      <section className="hero compact-hero" id="routes">
        <div className="hero-copy">
          <p className="kicker">Abu Dhabi relocation action hub</p>
          <h1>Your Abu Dhabi move, in one place.</h1>
          <p className="lead">
            Choose where to live and work, take the next real setup action, and keep every blocker on one honest timeline.
          </p>
          <div className="hero-actions">
            <button className="primary-action" type="button" onClick={seedLocalDemo} disabled={busy}>
              {busy ? "Working…" : "Start five-person local demo"}
            </button>
            <a href="#hub">View HR-safe preview</a>
          </div>
        </div>
        <RoutePanel
          route={route}
          setRoute={setRoute}
          onProfileCreate={handleProfileCreate}
          onProgramCreate={handleProgramCreate}
          onInviteAccept={handleInviteAccept}
          busy={busy}
          issuedInvite={invite}
        />
      </section>

      <section className="demo-strip" aria-label="Demo data notice">
        <strong>Demo boundary:</strong> {organization?.name ?? "Falcon Analytics"} and the five-person company scenario are fictional. Public preview shows HR-safe aggregate data only. Private employee hubs load only after a local bearer-session bootstrap.
      </section>

      {notice ? <section className={`notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</section> : null}

      <section className="workspace-grid" id="hub">
        <aside className="rail" aria-label="Company and employee selector">
          <p className="section-label">Company move</p>
          <h2>{organization?.name ?? "Loading move"}</h2>
          {program ? <ProgramFacts program={program} /> : <StatePanel title="Loading program" text="Fetching the safe HR preview." />}
          <div className="employee-list" role="list" aria-label="Fictional employees">
            {employeeList.map((employee) => {
              const row = hrView?.employees.find((item) => item.personId === employee.personId);
              const active = employee.personId === (selected?.profile.id ?? selectedId);
              return (
                <button
                  className="employee-row"
                  data-active={active}
                  type="button"
                  key={employee.personId}
                  onClick={() => setSelectedId(employee.personId)}
                >
                  <span>
                    <strong>{employee.displayName}</strong>
                    <small>{employee.hub ? `${householdLabel(employee.hub.profile.household)} · ${workTypeLabel(employee.hub.profile.workType)}` : "Private plan locked until local session"}</small>
                  </span>
                  <StatusPill status={statusFor(row)} />
                </button>
              );
            })}
          </div>
          {!demoActive ? <p className="form-note">Select an employee to see HR-safe progress only. Use the local demo button to load private employee journeys.</p> : null}
        </aside>

        <section className="hub-panel" aria-label="Relocation hub">
          <div className="hub-toolbar">
            <div>
              <p className="section-label">Permitted views</p>
              <h2>{view === "employee" ? `${selected?.profile.displayName ?? "Private employee"} journey` : "HR command center"}</h2>
            </div>
            <div className="segmented" role="tablist" aria-label="View mode">
              <button type="button" role="tab" aria-selected={view === "employee"} onClick={() => setView("employee")}>Private journey</button>
              <button type="button" role="tab" aria-selected={view === "hr"} onClick={() => setView("hr")}>HR view</button>
            </div>
          </div>

          {loading ? <StatePanel title="Loading Bankable" text="Preparing the HR-safe relocation preview." /> : null}
          {!loading && view === "employee" && !selected ? (
            <StatePanel
              title="Private journey requires a session"
              text="HR cannot open personal plans from the public preview. Start the local five-person demo or create a private profile to fetch an employee hub."
              action={<button className="primary-action" type="button" onClick={seedLocalDemo} disabled={busy}>Start local demo</button>}
            />
          ) : null}
          {!loading && view === "employee" && selected ? <EmployeeHub hub={selected} hrRow={selectedHrRow} token={selectedToken} busy={busy} onOpen={openTarget} /> : null}
          {!loading && view === "hr" && hrView ? <HrHub hr={hrView} onInviteCreate={handleInviteCreate} issuedInvite={invite} busy={busy} canIssueInvite={Boolean(hrToken && selectedId)} /> : null}
        </section>
      </section>
    </main>
  );
}

type PersonalValues = { displayName: string; workType: string; household: string; incomeMin: number; incomeMax: number };
type ProgramValues = { organizationName: string; hasUaeEntity: boolean; jurisdiction: string; officeAreaId: string; teamSize: number; moveDate: string; annualAllowanceAed: number };

function RoutePanel({ route, setRoute, onProfileCreate, onProgramCreate, onInviteAccept, busy, issuedInvite }: {
  route: RouteChoice;
  setRoute: (route: RouteChoice) => void;
  onProfileCreate: (values: PersonalValues) => Promise<void>;
  onProgramCreate: (values: ProgramValues) => Promise<void>;
  onInviteAccept: (inviteId: string, token: string) => Promise<void>;
  busy: boolean;
  issuedInvite: InviteCreatePayload | null;
}) {
  const [entityStatus, setEntityStatus] = useState("ready");
  const [inviteId, setInviteId] = useState("");
  const [inviteToken, setInviteToken] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (route === "move-team") {
      await onProgramCreate({
        organizationName: String(form.get("organizationName") ?? ""),
        hasUaeEntity: entityStatus === "ready",
        jurisdiction: String(form.get("jurisdiction") ?? "adgm"),
        officeAreaId: toAreaId(String(form.get("officeArea") ?? "Al Maryah Island")),
        teamSize: toPositiveNumber(form.get("teamSize"), 5),
        moveDate: String(form.get("moveDate") ?? "2026-11-15"),
        annualAllowanceAed: toPositiveNumber(form.get("annualAllowanceAed"), 105000),
      });
      return;
    }
    if (route === "join-company") {
      await onInviteAccept(inviteId.trim(), inviteToken.trim());
      return;
    }
    await onProfileCreate(personalValues(form));
  }

  return (
    <section className="route-card" aria-label="Start route">
      <div className="choice-grid">
        {[
          ["my-move", "My move", "Work type, household, income or range."],
          ["join-company", "Join my company's move", "Invite token, then the same private journey."],
          ["move-team", "Move my team", "Entity, office, team, date, allowances."],
        ].map(([id, label, helper]) => (
          <button key={id} type="button" data-active={route === id} onClick={() => setRoute(id as RouteChoice)}>
            <strong>{label}</strong>
            <span>{helper}</span>
          </button>
        ))}
      </div>
      <form className="intake-form" onSubmit={submit}>
        {route === "move-team" ? (
          <>
            <label>Company name <span>(optional)</span><input name="organizationName" placeholder="Company move" /></label>
            <label>
              UAE entity status
              <select value={entityStatus} onChange={(event) => setEntityStatus(event.target.value)}>
                <option value="ready">Already established</option>
                <option value="new">Need setup route</option>
              </select>
            </label>
            {entityStatus === "new" ? (
              <label>
                Setup jurisdiction
                <select name="jurisdiction" defaultValue="adgm">
                  <option value="mainland">Mainland through ADDED</option>
                  <option value="adgm">ADGM</option>
                  <option value="kezad">KEZAD</option>
                </select>
              </label>
            ) : null}
            <label>Office area<input name="officeArea" defaultValue="Al Maryah Island" /></label>
            <label>Team size<input name="teamSize" type="number" defaultValue={5} min={1} /></label>
            <label>Move date<input name="moveDate" type="date" defaultValue="2026-11-15" /></label>
            <label>Annual housing allowance<input name="annualAllowanceAed" defaultValue="105000" inputMode="numeric" /></label>
          </>
        ) : route === "join-company" ? (
          <>
            <label>Invite ID<input value={inviteId} onChange={(event) => setInviteId(event.target.value)} placeholder={issuedInvite?.inviteId ?? "invite-..."} /></label>
            <label>Invite token<input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} placeholder={issuedInvite?.token ?? "Paste token"} /></label>
            {issuedInvite ? <p className="form-note">Local demo invite ready. It is shown here only for testing and has not been sent externally.</p> : null}
          </>
        ) : <PersonFields />}
        <button type="submit" className="primary-action" disabled={busy}>{busy ? "Working…" : route === "join-company" ? "Accept invite" : "Create move hub"}</button>
        <p className="form-note">Only the fields shown here are needed to start. Bankable stores opened handoffs separately from provider outcomes.</p>
      </form>
    </section>
  );
}

function PersonFields() {
  return (
    <>
      <label>Name <span>(optional)</span><input name="displayName" placeholder="My move" /></label>
      <label>Work type<select name="workType" defaultValue="employee"><option value="employee">Employee</option><option value="freelancer">Freelancer</option><option value="self_employed">Self-employed</option></select></label>
      <label>Household<select name="household" defaultValue="single"><option value="single">Single</option><option value="couple">Couple</option><option value="family">Family with children</option></select></label>
      <label>Monthly income or range<input name="incomeMin" defaultValue="28000" inputMode="numeric" /></label>
      <label>Upper range <span>(optional)</span><input name="incomeMax" placeholder="Same as monthly income" inputMode="numeric" /></label>
    </>
  );
}

function EmployeeHub({ hub, hrRow, token, busy, onOpen }: { hub: PersonHub; hrRow?: HrView["employees"][number]; token: string | null; busy: boolean; onOpen: (target: { caseId: string; id: string; url: string | null; token: string | null }) => Promise<void> }) {
  const homes = hub.recommendations.filter((item): item is HomeRecommendation => item.type === "home" && item.affordable && item.policyFit);
  const workspaces = hub.recommendations.filter((item): item is ActionRecommendation => item.type === "workspace");
  const services = hub.recommendations.filter((item): item is ActionRecommendation => item.type === "official_service");
  const firstAction = nextTask(hub.tasks, hrRow);

  return (
    <div className="hub-stack">
      <section className="priority-panel">
        <div>
          <p className="section-label">Next real action</p>
          <h3>{firstAction.title}</h3>
          <p>{firstAction.nextAction} External handoffs are recorded as opened until user, HR, or provider evidence changes the state.</p>
        </div>
        {firstAction.actionUrl ? <button type="button" className="primary-action" disabled={busy} onClick={() => onOpen({ caseId: hub.case.id, id: firstAction.id, url: firstAction.actionUrl, token })}>Open and record</button> : <button type="button" className="primary-action" disabled>Choose from cards</button>}
      </section>

      <div className="metric-grid" aria-label="Budget and readiness">
        <Metric label="Income" value={`${money.format(hub.budget.minMonthlyIncomeAed)}/mo`} detail="Private to employee" />
        <Metric label="Rent budget" value={`${money.format(hub.budget.annualBudgetAed)}/yr`} detail={`Allowance cap ${money.format(hub.budget.policyAllowanceAnnualAed)}`} />
        <Metric label="Initial cash" value="Unknown" detail="Lease fees and payment terms are not verified by source" />
      </div>

      <section>
        <SectionHead label="Homes after affordability and allowance filter" action={`${homes.length} shown`} />
        {homes.length > 0 ? <div className="home-grid">{homes.map((item) => <HomeCard key={item.id} item={item} caseId={hub.case.id} token={token} busy={busy} onOpen={onOpen} />)}</div> : <EmptyState text="No homes fit both the affordability and company allowance filters yet." />}
      </section>

      <div className="two-column">
        <section className="plain-panel">
          <SectionHead label="Workspaces and official services" />
          {[...workspaces, ...services].map((item) => <ActionRow key={item.id} item={item} caseId={hub.case.id} token={token} busy={busy} onOpen={onOpen} />)}
        </section>
        <section className="plain-panel">
          <SectionHead label="Financial-readiness factors" />
          <ul className="check-list">
            {hub.financeReadiness.factors.map((factor) => <li key={factor}>{factor}</li>)}
            <li>No approval probability. Lender and bank decisions remain provider-owned.</li>
          </ul>
        </section>
      </div>

      <section className="plain-panel" id="timeline">
        <SectionHead label="Timeline" />
        {hub.timeline.length > 0 ? <Timeline events={hub.timeline} /> : <EmptyState text="No actions yet. Open a source-backed handoff to create the first honest status event." />}
      </section>
    </div>
  );
}

function HrHub({ hr, onInviteCreate, issuedInvite, busy, canIssueInvite }: { hr: HrView; onInviteCreate: () => Promise<void>; issuedInvite: InviteCreatePayload | null; busy: boolean; canIssueInvite: boolean }) {
  return (
    <div className="hub-stack">
      <div className="metric-grid" aria-label="Company move progress">
        <Metric label="Invited" value={`${hr.aggregate.invited}`} detail={`${hr.aggregate.accepted} accepted`} />
        <Metric label="Policy fit" value={`${hr.aggregate.policyFit}/${hr.aggregate.cases}`} detail="Private budgets hidden" />
        <Metric label="Blockers" value={`${hr.aggregate.blocked}`} detail={`${hr.aggregate.openedHandoffs} opened handoffs`} />
      </div>

      <section className="plain-panel">
        <SectionHead label="Employee progress visible to HR" />
        {hr.employees.length > 0 ? (
          <div className="hr-table" role="table" aria-label="HR employee progress">
            {hr.employees.map((employee) => (
              <div key={employee.personId} role="row">
                <span><strong>{employee.displayName}</strong><small>{employee.inviteAccepted ? "Invite accepted" : "Invite pending"}</small></span>
                <StatusPill status={statusFor(employee)} />
                <strong>{policyLabel(employee.housingPolicyFit)}</strong>
                <small>{employee.blockers[0] ?? employee.milestones.find((milestone) => milestone.state === "not_started")?.nextAction ?? "No shared blocker"}</small>
              </div>
            ))}
          </div>
        ) : <EmptyState text="No employee cases are attached yet. Create invites after employees are added to the program." />}
        <p className="privacy-note">HR sees aggregate move progress, shared blockers, deadlines, and housing-policy fit. Private income documents, bank results, and identity evidence remain hidden unless the employee grants recipient-specific consent.</p>
      </section>

      <section className="plain-panel">
        <SectionHead label="Invite controls" />
        <div className="invite-panel">
          <p>Create a local invite for the selected demo employee. Bankable records token creation only; it does not send email or claim employee acceptance.</p>
          <button className="primary-action" type="button" onClick={onInviteCreate} disabled={busy || !canIssueInvite}>Create local invite token</button>
          {issuedInvite ? <code>Invite ID: {issuedInvite.inviteId}<br />Token: {issuedInvite.token}</code> : null}
        </div>
      </section>

      <section className="plain-panel">
        <SectionHead label="Separate establishment routes" />
        <div className="setup-grid">
          {setupRoutes.map((route) => (
            <article key={route.id}>
              <h3>{route.title}</h3>
              <p>{route.authority}</p>
              <small>{route.nextAction}</small>
              <small>{route.source}</small>
              <a className="primary-action" href={route.actionUrl} target="_blank" rel="noreferrer">Open official service</a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgramFacts({ program }: { program: HrView["program"] }) {
  return (
    <dl className="program-facts">
      <div><dt>Entity</dt><dd>{program.hasUaeEntity ? "Already established" : `Setup via ${program.jurisdiction?.toUpperCase() ?? "route needed"}`}</dd></div>
      <div><dt>Office</dt><dd>{areaLabel(program.officeAreaId)}</dd></div>
      <div><dt>Move date</dt><dd>{formatDate(program.moveDate)}</dd></div>
      <div><dt>Allowance</dt><dd>{money.format(program.housingPolicy.annualAllowanceAed)}/year</dd></div>
    </dl>
  );
}

function HomeCard({ item, caseId, token, busy, onOpen }: { item: HomeRecommendation; caseId: string; token: string | null; busy: boolean; onOpen: (target: { caseId: string; id: string; url: string | null; token: string | null }) => Promise<void> }) {
  const source = item.sources[0];
  const home = item.home;
  return (
    <article className="home-card">
      <div className="home-topline">
        <span>{home.bedrooms === 0 ? "Studio" : `${home.bedrooms} bed`}</span>
        <span>{item.policyFit ? "Within allowance" : "Over allowance"}</span>
      </div>
      <h3>{home.title}</h3>
      <p>{home.area} · {home.availability === "illustrative" ? "Synthetic planning example" : "Availability unconfirmed"}</p>
      <strong>{money.format(home.annualRentAed)}/year</strong>
      <ul className="reason-list">{item.reasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <small>{source ? `${source.publisher}: ${source.title}; checked ${formatDateTime(source.checkedAt)}` : `${home.sourceKind}; checked ${formatDateTime(home.checkedAt)}`}</small>
      {home.synthetic ? (
        <button type="button" disabled>Synthetic planning only</button>
      ) : home.contactable && home.listingUrl ? (
        <button type="button" disabled={busy} onClick={() => onOpen({ caseId, id: item.id, url: home.listingUrl, token })}>Open listing and record opened</button>
      ) : (
        <button type="button" disabled>Market evidence only</button>
      )}
    </article>
  );
}

function ActionRow({ item, caseId, token, busy, onOpen }: { item: ActionRecommendation; caseId: string; token: string | null; busy: boolean; onOpen: (target: { caseId: string; id: string; url: string | null; token: string | null }) => Promise<void> }) {
  const source = item.sources[0];
  return (
    <div className="action-row">
      <span>
        <strong>{item.title}</strong>
        <small>{item.reasons[0] ?? "Open the provider page and record the reference."}</small>
      </span>
      <small>{source ? `${source.publisher}, checked ${formatDateTime(source.checkedAt)}` : "Source attached"}</small>
      {item.actionUrl ? <button className="primary-action" type="button" disabled={busy} onClick={() => onOpen({ caseId, id: item.id, url: item.actionUrl, token })}>{item.actionLabel ?? "Open"}</button> : <button type="button" disabled>No direct action</button>}
    </div>
  );
}

function Timeline({ events }: { events: PersonHub["timeline"] }) {
  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.id}>
          <span className="dot" aria-hidden="true" />
          <span>
            <strong>{labelState(event.state)} · {event.owner}</strong>
            <p>{event.nextAction}</p>
            <small>{event.source.label}, {formatDateTime(event.updatedAt)}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function SectionHead({ label, action }: { label: string; action?: string }) {
  return <div className="section-head"><h3>{label}</h3>{action ? <span className="count-badge">{action}</span> : null}</div>;
}

function StatePanel({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="state-panel"><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="empty-state">{text}</p>;
}

function StatusPill({ status }: { status: "On track" | "Needs action" | "Blocked" }) {
  return <span className="status-pill" data-status={status}>{status}</span>;
}

function statusFor(employee?: HrView["employees"][number]): "On track" | "Needs action" | "Blocked" {
  if (!employee) return "Needs action";
  if (employee.blockers.length > 0) return "Blocked";
  if (!employee.inviteAccepted || employee.milestones.some((milestone) => milestone.state === "not_started" && milestone.owner === "organization")) return "Needs action";
  return "On track";
}

function nextTask(tasks: PersonHub["tasks"], hrRow?: HrView["employees"][number]) {
  const blocked = hrRow?.blockers[0];
  const task = tasks.find((item) => item.state === "blocked") ?? tasks.find((item) => item.state === "not_started") ?? tasks[0];
  return {
    id: task?.id ?? "",
    title: blocked ? "Resolve shared blocker" : (task?.title ?? "Choose the next move action"),
    nextAction: blocked ?? task?.nextAction ?? "Open a source-backed recommendation.",
    actionUrl: task?.actionUrl ?? null,
  };
}

function personalValues(form: FormData): PersonalValues {
  const min = toPositiveNumber(form.get("incomeMin"), 28000);
  return {
    displayName: String(form.get("displayName") ?? ""),
    workType: String(form.get("workType") ?? "employee"),
    household: String(form.get("household") ?? "single"),
    incomeMin: min,
    incomeMax: toPositiveNumber(form.get("incomeMax"), min),
  };
}

function upsertHub(list: PersonHub[], hub: PersonHub) {
  return [hub, ...list.filter((item) => item.profile.id !== hub.profile.id)];
}

function upsertToken(list: EmployeeToken[], token: EmployeeToken) {
  return [token, ...list.filter((item) => item.personId !== token.personId)];
}

function labelState(state: string) {
  return state.replace(/_/g, " ");
}

function policyLabel(value: HrView["employees"][number]["housingPolicyFit"]) {
  if (value === "fits") return "Fits";
  if (value === "over_allowance") return "Over allowance";
  return "No shortlist";
}

function workTypeLabel(workType: string) {
  return workType.replace(/_/g, " ");
}

function householdLabel(household: { adults: number; children: number }) {
  if (household.children > 0) return `${number.format(household.adults)} adult${household.adults === 1 ? "" : "s"}, ${number.format(household.children)} child${household.children === 1 ? "" : "ren"}`;
  return household.adults === 1 ? "Single" : "Couple";
}

function areaLabel(areaId: string) {
  return areaId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function toAreaId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "al-maryah-island";
}

function toPositiveNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AE", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(value: string) {
  if (!value) return "unknown";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
