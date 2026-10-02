"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  type DemoCapabilities,
  type HrView,
  type HrViewPayload,
  type InviteCreatePayload,
  type ManualStatusPayload,
  type OpenedActionPayload,
  type PersonHub,
  type PersonHubPayload,
  type ProfileCreatePayload,
  type ProgramCreatePayload,
  type Recommendation,
  type RelocationScreen,
} from "./relocation-api";

type HomeRecommendation = Extract<Recommendation, { type: "home" }>;
type ActionRecommendation = Exclude<Recommendation, { type: "home" }>;
type EmployeeToken = DemoCapabilities["employees"][number];
type Notice = { tone: "neutral" | "success" | "error"; text: string } | null;
type SavedSession = { hrToken: string | null; programId: string | null; employeeTokens: EmployeeToken[]; selectedId: string };
type PersonalValues = { displayName: string; workType: string; household: string; incomeMin: number; incomeMax: number | null; preferredAreaIds: string[] };
type ProgramValues = { organizationName: string; hasUaeEntity: boolean; jurisdiction: string; officeAreaId: string; teamSize: number; moveDate: string; annualAllowanceAed: number };

const SESSION_KEY = "bankable-relocation-session-v2";
const money = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 });

export function BankableRelocationApp({ screen }: { screen: RelocationScreen }) {
  const router = useRouter();
  const [preferredArea] = useState(() => initialAreaParam());
  const [hrView, setHrView] = useState<HrView | null>(null);
  const [people, setPeople] = useState<PersonHub[]>([]);
  const [hrToken, setHrToken] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [employeeTokens, setEmployeeTokens] = useState<EmployeeToken[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<InviteCreatePayload | null>(null);
  const [inviteLabel, setInviteLabel] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Notice>(null);

  const selected = people.find((person) => person.profile.id === selectedId) ?? people[0] ?? null;
  const selectedToken = employeeTokens.find((employee) => employee.personId === selected?.profile.id)?.sessionToken ?? null;
  const homes = useMemo(() => selected?.recommendations.filter((item): item is HomeRecommendation => item.type === "home" && item.affordable && item.policyFit) ?? [], [selected]);
  const services = useMemo(() => selected?.recommendations.filter((item): item is ActionRecommendation => item.type === "official_service") ?? [], [selected]);
  const workspaces = useMemo(() => selected?.recommendations.filter((item): item is ActionRecommendation => item.type === "workspace") ?? [], [selected]);
  const finance = useMemo(() => selected?.recommendations.filter((item): item is ActionRecommendation => item.type === "finance_readiness") ?? [], [selected]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await Promise.resolve();
      const saved = readSavedSession();
      if (!mounted) return;
      if (!saved) {
        setLoading(false);
        return;
      }
      setHrToken(saved.hrToken);
      setProgramId(saved.programId);
      setEmployeeTokens(saved.employeeTokens);
      setSelectedId(saved.selectedId);
      try {
        await refreshFromTokens(saved.programId, saved.hrToken, saved.employeeTokens, saved.selectedId);
      } catch (error) {
        clearSavedSession();
        if (mounted) setNotice({ tone: "error", text: `${error instanceof Error ? error.message : "Could not restore session."} Create or join again to continue.` });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // Run once to restore browser session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshFromTokens(nextProgramId = programId, nextHrToken = hrToken, nextEmployeeTokens = employeeTokens, keepSelected = selectedId) {
    const reads: Promise<void>[] = [];
    if (nextProgramId && nextHrToken) {
      reads.push(apiGet<HrViewPayload>(`/api/relocation/programs/${nextProgramId}/hr`, nextHrToken).then((payload) => setHrView(payload.view)));
    }
    if (nextEmployeeTokens.length > 0) {
      reads.push(Promise.all(nextEmployeeTokens.map((employee) => apiGet<PersonHubPayload>("/api/relocation/profiles/me", employee.sessionToken))).then((payloads) => {
        const hubs = payloads.map((payload) => payload.view);
        setPeople(hubs);
        setSelectedId(keepSelected || hubs[0]?.profile.id || "");
      }));
    }
    await Promise.all(reads);
  }

  function saveSession(next: Partial<SavedSession>) {
    const current = readSavedSession() ?? { hrToken: null, programId: null, employeeTokens: [], selectedId: "" };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...next }));
  }

  function resetSession() {
    clearSavedSession();
    setHrToken(null);
    setProgramId(null);
    setEmployeeTokens([]);
    setPeople([]);
    setHrView(null);
    setSelectedId("");
    setInvite(null);
    setDemoMode(false);
    setNotice({ tone: "neutral", text: "Browser session cleared. No external service was changed." });
  }

  async function seedDemo() {
    setBusy(true);
    setNotice(null);
    try {
      const seeded = await apiPost<DemoCapabilities>("/api/relocation/bootstrap");
      setDemoMode(true);
      setHrToken(seeded.hrSessionToken);
      setProgramId(seeded.programId);
      setEmployeeTokens(seeded.employees);
      setSelectedId(seeded.employees[0]?.personId ?? "");
      saveSession({ hrToken: seeded.hrSessionToken, programId: seeded.programId, employeeTokens: seeded.employees, selectedId: seeded.employees[0]?.personId ?? "" });
      await refreshFromTokens(seeded.programId, seeded.hrSessionToken, seeded.employees, seeded.employees[0]?.personId ?? "");
      setNotice({ tone: "success", text: "Fictional five-person demo loaded. It sends nothing externally." });
      router.push("/company/dashboard");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not load the fictional demo." });
    } finally {
      setBusy(false);
    }
  }

  async function createProfile(values: PersonalValues) {
    setBusy(true);
    setNotice(null);
    try {
      const created = await apiPost<ProfileCreatePayload>("/api/relocation/profiles", profileBody(values));
      const hub = await apiGet<PersonHubPayload>("/api/relocation/profiles/me", created.sessionToken);
      const token = { personId: hub.view.profile.id, displayName: hub.view.profile.displayName, sessionToken: created.sessionToken };
      setPeople([hub.view]);
      setEmployeeTokens([token]);
      setSelectedId(hub.view.profile.id);
      saveSession({ employeeTokens: [token], selectedId: hub.view.profile.id });
      setNotice({ tone: "success", text: "Private move hub created." });
      router.push("/move");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not create private profile." });
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(values: PersonalValues) {
    if (!selectedToken) {
      setNotice({ tone: "error", text: "Create or restore a private move before editing your plan." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const updated = await apiPatch<PersonHubPayload>("/api/relocation/profiles/me", profileBody(values), selectedToken);
      setPeople((current) => upsertHub(current, updated.view));
      setSelectedId(updated.view.profile.id);
      setNotice({ tone: "success", text: "Plan inputs updated. Your timeline and company allowance were preserved." });
      router.push("/move");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not update plan inputs." });
    } finally {
      setBusy(false);
    }
  }

  async function createProgram(values: ProgramValues) {
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
      setProgramId(created.program.id);
      saveSession({ hrToken: created.hrSessionToken, programId: created.program.id });
      const fresh = await apiGet<HrViewPayload>(`/api/relocation/programs/${created.program.id}/hr`, created.hrSessionToken);
      setHrView(fresh.view);
      setNotice({ tone: "success", text: "Company move program created. Create an invite link from the dashboard." });
      router.push("/company/dashboard");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not create company program." });
    } finally {
      setBusy(false);
    }
  }

  async function createInvite() {
    if (!hrToken) {
      setNotice({ tone: "error", text: "Create a company program first to enable invite links." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const issued = await apiPost<InviteCreatePayload>("/api/relocation/invites", { employeeLabel: inviteLabel.trim() || undefined }, hrToken);
      setInvite(issued);
      await refreshFromTokens();
      setNotice({ tone: "success", text: "Invite link created. Bankable has not sent any message." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not create invite link." });
    } finally {
      setBusy(false);
    }
  }

  async function acceptInvite(inviteId: string, token: string, values: PersonalValues) {
    setBusy(true);
    setNotice(null);
    try {
      const accepted = await apiPost<ProfileCreatePayload>(`/api/relocation/invites/${inviteId}/accept`, { token, profile: profileBody(values) });
      const hub = await apiGet<PersonHubPayload>("/api/relocation/profiles/me", accepted.sessionToken);
      const nextToken = { personId: hub.view.profile.id, displayName: hub.view.profile.displayName, sessionToken: accepted.sessionToken };
      const nextTokens = upsertToken(employeeTokens, nextToken);
      setPeople((current) => upsertHub(current, hub.view));
      setEmployeeTokens(nextTokens);
      setSelectedId(hub.view.profile.id);
      saveSession({ employeeTokens: nextTokens, selectedId: hub.view.profile.id });
      setNotice({ tone: "success", text: "Invite accepted. Your private move hub is ready." });
      router.push("/move");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not accept invite." });
    } finally {
      setBusy(false);
    }
  }

  async function acceptExistingInvite(inviteId: string, token: string) {
    const existingSessionToken = employeeTokens[0]?.sessionToken;
    if (!existingSessionToken) {
      setNotice({ tone: "error", text: "Create or restore a private move before using an existing profile." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const accepted = await apiPost<ProfileCreatePayload>(`/api/relocation/invites/${inviteId}/accept`, { token, existingSessionToken });
      const hub = await apiGet<PersonHubPayload>("/api/relocation/profiles/me", accepted.sessionToken);
      setPeople((current) => upsertHub(current, hub.view));
      setSelectedId(hub.view.profile.id);
      saveSession({ selectedId: hub.view.profile.id });
      setNotice({ tone: "success", text: "Invite connected to your existing private profile." });
      router.push("/move");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not connect invite." });
    } finally {
      setBusy(false);
    }
  }

  async function openTarget(target: { id: string; url: string | null }) {
    if (!selected || !target.url) return;
    if (!selectedToken) {
      setNotice({ tone: "error", text: "Create or restore a private move before recording opened links." });
      return;
    }
    const openedWindow = window.open("about:blank", "_blank");
    if (openedWindow) openedWindow.opener = null;
    setBusy(true);
    setNotice(null);
    try {
      await apiPost<OpenedActionPayload>("/api/relocation/actions/opened", { caseId: selected.case.id, targetId: target.id }, selectedToken);
      if (openedWindow) openedWindow.location.href = target.url;
      else setNotice({ tone: "error", text: "Your browser blocked the new tab. The link was recorded as opened only; try the provider button again to open it." });
      await refreshFromTokens();
      if (openedWindow) setNotice({ tone: "success", text: "Link recorded as opened only. Provider outcomes remain outside Bankable." });
    } catch (error) {
      if (openedWindow) openedWindow.close();
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not record opened link." });
    } finally {
      setBusy(false);
    }
  }

  async function reportManualStatus(taskId: string, state: string, nextAction: string, reference: string, blocker: string) {
    if (!selected || !selectedToken) {
      setNotice({ tone: "error", text: "Create or restore a private move before reporting status." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await apiPost<ManualStatusPayload>("/api/relocation/actions/status", { caseId: selected.case.id, taskId, state, nextAction, reference, blocker }, selectedToken);
      await refreshFromTokens();
      setNotice({ tone: "success", text: "Status saved as your report. It is not a provider confirmation." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save status." });
    } finally {
      setBusy(false);
    }
  }

  const shell = (children: ReactNode) => (
    <main className="min-h-screen app-shell">
      <Header demoMode={demoMode} onDemo={seedDemo} busy={busy} />
      {notice ? <section className={`notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</section> : null}
      {copyStatus ? <section className={`notice ${copyStatus.tone}`} role={copyStatus.tone === "error" ? "alert" : "status"}>{copyStatus.text}</section> : null}
      {isSyntheticContext(selected, hrView, demoMode) ? <SyntheticBanner /> : null}
      {children}
    </main>
  );

  if (screen === "start") return shell(<StartScreen busy={busy} onDemo={seedDemo} />);
  if (screen === "company") return shell(<CompanyIntake busy={busy} onCreate={createProgram} />);
  if (screen === "join") return shell(<JoinScreen busy={busy} issuedInvite={invite} preferredArea={preferredArea} hasExistingProfile={employeeTokens.length > 0} onAccept={acceptInvite} onAcceptExisting={acceptExistingInvite} />);
  if (screen === "company-dashboard") return shell(<CompanyDashboard hr={hrView} loading={loading} busy={busy} invite={invite} inviteLabel={inviteLabel} canInvite={Boolean(hrToken)} setInviteLabel={setInviteLabel} onInvite={createInvite} onReset={resetSession} onCopyResult={setCopyStatus} />);

  if (screen === "move" && !selected) return shell(<MoveOnboarding busy={busy} preferredArea={preferredArea} onCreate={createProfile} />);
  if (!selected) return shell(<NoPrivateMove preferredArea={preferredArea} />);

  return shell(
    <MoveShell hub={selected} selectedId={selectedId} people={people} setSelectedId={setSelectedId}>
      {screen === "move" ? <MoveOverview hub={selected} homes={homes} services={services} workspaces={workspaces} /> : null}
      {screen === "move-timeline" ? <TimelineScreen hub={selected} busy={busy} onReport={reportManualStatus} /> : null}
      {screen === "move-homes" ? <HomesScreen hub={selected} homes={homes} busy={busy} onOpen={openTarget} /> : null}
      {screen === "move-setup" ? <ActionsScreen title="Official setup" items={services} busy={busy} onOpen={openTarget} /> : null}
      {screen === "move-workspaces" ? <ActionsScreen title="Workspaces" items={workspaces} busy={busy} onOpen={openTarget} /> : null}
      {screen === "move-finance" ? <FinanceScreen hub={selected} finance={finance} /> : null}
      {screen === "move-profile" ? <ProfileScreen hub={selected} busy={busy} onUpdate={updateProfile} /> : null}
    </MoveShell>,
  );
}

function Header({ demoMode, onDemo, busy }: { demoMode: boolean; onDemo: () => void; busy: boolean }) {
  return <header className="topbar" aria-label="Bankable header"><Link href="/" className="brand"><span className="brand-mark">B</span><span>Bankable</span></Link><nav aria-label="Primary"><Link href="/start">Start</Link><Link href="/move">My move</Link><Link href="/company/dashboard">Company</Link><Link href="/areas">Areas</Link></nav><button className="text-action" type="button" onClick={onDemo} disabled={busy}>{demoMode ? "Fictional demo loaded" : "Explore fictional demo"}</button></header>;
}

function StartScreen({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  return <section className="screen-card"><p className="kicker">Choose journey</p><h1>Start with the move you are making.</h1><div className="directory-grid inline-grid"><Link className="directory-card" href="/move"><span className="section-label">Private</span><h2>My move</h2><p>Work type, household and income range create your private hub.</p></Link><Link className="directory-card" href="/join"><span className="section-label">Employee</span><h2>Join my company’s move</h2><p>Use an invite link, then continue with your own private plan.</p></Link><Link className="directory-card" href="/company"><span className="section-label">HR</span><h2>Move my team</h2><p>Create a program, invite employees and track permitted progress.</p></Link></div><button className="secondary-action" type="button" onClick={onDemo} disabled={busy}>Explore fictional five-person demo</button></section>;
}

function MoveOnboarding({ busy, preferredArea, onCreate }: { busy: boolean; preferredArea: string; onCreate: (values: PersonalValues) => Promise<void> }) {
  return <section className="screen-card"><p className="kicker">My move</p><h1>Create your private Abu Dhabi move hub.</h1><PersonalForm busy={busy} preferredArea={preferredArea} submitLabel="Create private hub" onSubmit={onCreate} /><p className="form-note">Planning assumptions can be adjusted later. Blank income cannot be filtered; zero is accepted when intentional and will produce an honest no-match plan.</p></section>;
}

function JoinScreen({ busy, issuedInvite, preferredArea, hasExistingProfile, onAccept, onAcceptExisting }: { busy: boolean; issuedInvite: InviteCreatePayload | null; preferredArea: string; hasExistingProfile: boolean; onAccept: (inviteId: string, token: string, values: PersonalValues) => Promise<void>; onAcceptExisting: (inviteId: string, token: string) => Promise<void> }) {
  const initial = initialInviteParams();
  const [inviteId, setInviteId] = useState(initial.inviteId);
  const [token, setToken] = useState(initial.token);
  async function submit(values: PersonalValues) { await onAccept(inviteId.trim() || issuedInvite?.inviteId || "", token.trim() || issuedInvite?.token || "", values); }
  return <section className="screen-card"><p className="kicker">Join company move</p><h1>Accept invite and keep your journey private.</h1><div className="intake-form"><label>Invite ID<input value={inviteId} onChange={(event) => setInviteId(event.target.value)} placeholder="invite-…" /></label><label>Invite access code<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste access code" /></label>{hasExistingProfile ? <button className="secondary-action" type="button" disabled={busy || !inviteId || !token} onClick={() => { void onAcceptExisting(inviteId.trim(), token.trim()); }}>Use my existing profile</button> : null}</div><PersonalForm busy={busy} preferredArea={preferredArea} submitLabel="Accept invite with new private profile" onSubmit={submit} /></section>;
}

function CompanyIntake({ busy, onCreate }: { busy: boolean; onCreate: (values: ProgramValues) => Promise<void> }) {
  const [entityStatus, setEntityStatus] = useState("ready");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseProgram(form, entityStatus === "ready");
    if (typeof parsed === "string") { setError(parsed); return; }
    setError("");
    await onCreate(parsed);
  }
  return <section className="screen-card"><p className="kicker">Move my team</p><h1>Create the company move program.</h1><form className="intake-form" onSubmit={submit}>{error ? <p className="error-note" role="alert">{error}</p> : null}<label>Company name <span>(optional)</span><input name="organizationName" placeholder="Company move" /></label><label>UAE entity status<select value={entityStatus} onChange={(event) => setEntityStatus(event.target.value)}><option value="ready">Already established</option><option value="new">Need setup route</option></select></label>{entityStatus === "new" ? <label>Setup jurisdiction<select name="jurisdiction" defaultValue="adgm"><option value="mainland">Mainland through ADDED</option><option value="adgm">ADGM</option><option value="kezad">KEZAD</option></select></label> : null}<label>Office area<input name="officeArea" defaultValue="Al Maryah Island" /></label><label>Team size<input name="teamSize" type="number" min={1} placeholder="5" /></label><label>Move date<input name="moveDate" type="date" /></label><label>Annual housing allowance<input name="annualAllowanceAed" inputMode="numeric" placeholder="105000" /></label><button className="primary-action" disabled={busy}>{busy ? "Creating…" : "Create company dashboard"}</button></form></section>;
}

function CompanyDashboard({ hr, loading, busy, invite, inviteLabel, canInvite, setInviteLabel, onInvite, onReset, onCopyResult }: { hr: HrView | null; loading: boolean; busy: boolean; invite: InviteCreatePayload | null; inviteLabel: string; canInvite: boolean; setInviteLabel: (value: string) => void; onInvite: () => void; onReset: () => void; onCopyResult: (notice: Notice) => void }) {
  if (loading) return <section className="screen-card"><StatePanel title="Restoring company dashboard" text="Checking this browser for a saved company session." /></section>;
  if (!hr) return <section className="screen-card"><p className="kicker">Company dashboard</p><h1>No company program yet.</h1><p className="lead">Create a program before issuing invite links or viewing aggregate progress.</p><Link className="primary-action" href="/company">Create company program</Link></section>;
  const inviteLink = invite ? `/join?inviteId=${encodeURIComponent(invite.inviteId)}&token=${encodeURIComponent(invite.token)}` : "";
  return <section className="screen-card wide"><div className="screen-head"><div><p className="kicker">Company dashboard</p><h1>{hr.organization.name}</h1></div><button className="text-action" type="button" onClick={onReset}>Clear browser session</button></div><div className="metric-grid"><Metric label="Invite links created" value={`${hr.aggregate.invited}`} detail={`${hr.aggregate.accepted} accepted`} /><Metric label="Policy fit" value={`${hr.aggregate.policyFit}/${hr.aggregate.cases}`} detail="Private budgets hidden" /><Metric label="Links opened" value={`${hr.aggregate.openedHandoffs}`} detail="Opened only, never confirmation" /></div><section className="plain-panel"><SectionHead label="Create invite" /><div className="invite-panel"><label>Employee label <span>(optional)</span><input value={inviteLabel} onChange={(event) => setInviteLabel(event.target.value)} placeholder="e.g. Finance manager" /></label>{canInvite ? null : <p className="form-note">Create a company program first to enable invite links.</p>}<button className="primary-action" type="button" onClick={onInvite} disabled={busy || !canInvite}>{busy ? "Creating…" : "Create invite link"}</button>{invite ? <><code>{inviteLink}</code><button className="secondary-action" type="button" onClick={() => { void copyInviteLink(inviteLink, onCopyResult); }}>Copy invite link</button><p className="form-note">Share this through your own channel. Bankable does not send or confirm delivery.{invite.expiresAt ? ` Expires ${formatDateTime(invite.expiresAt)}.` : ""}</p></> : null}</div></section><section className="plain-panel"><SectionHead label="Employee progress visible to HR" />{hr.employees.length > 0 ? <div className="hr-table">{hr.employees.map((employee) => <div key={employee.personId}><span><strong>{employee.displayName}</strong><small>{employee.inviteAccepted ? "Invite accepted" : "Invite pending"}</small></span><StatusPill status={statusFor(employee)} /><strong>{policyLabel(employee.housingPolicyFit)}</strong><small>{employee.blockers[0] ?? employee.milestones.find((milestone) => milestone.state === "not_started")?.nextAction ?? "No shared blocker"}</small></div>)}</div> : <StatePanel title="No employees yet" text="Create an invite link. HR will see permitted progress after an employee accepts." />}</section><p className="privacy-note">HR sees aggregate move progress, shared blockers, deadlines and housing-policy fit. Private income documents, bank results and identity evidence stay hidden unless the employee grants recipient-specific consent.</p></section>;
}

function NoPrivateMove({ preferredArea }: { preferredArea: string }) {
  return <section className="screen-card"><p className="kicker">Private move</p><h1>Create your move hub first.</h1><p className="lead">This focused page needs your private profile before it can show homes, timeline or setup actions.</p><Link className="primary-action" href={preferredArea ? `/move?area=${encodeURIComponent(preferredArea)}` : "/move"}>Create private hub</Link></section>;
}

function MoveShell({ hub, people, selectedId, setSelectedId, children }: { hub: PersonHub; people: PersonHub[]; selectedId: string; setSelectedId: (id: string) => void; children: ReactNode }) {
  return <section className="screen-card wide"><div className="screen-head"><div><p className="kicker">Private move</p><h1>{hub.profile.displayName}</h1></div>{people.length > 1 ? <select aria-label="Choose private profile" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{people.map((person) => <option key={person.profile.id} value={person.profile.id}>{person.profile.displayName}</option>)}</select> : null}</div><nav className="subnav" aria-label="Move sections"><Link href="/move">Overview</Link><Link href="/move/homes">Homes</Link><Link href="/move/setup">Setup</Link><Link href="/move/workspaces">Workspaces</Link><Link href="/move/finance">Finance</Link><Link href="/move/timeline">Timeline</Link><Link href="/move/profile">Edit my plan</Link></nav>{children}</section>;
}

function MoveOverview({ hub, homes, services, workspaces }: { hub: PersonHub; homes: HomeRecommendation[]; services: ActionRecommendation[]; workspaces: ActionRecommendation[] }) {
  return <div className="hub-stack"><div className="metric-grid"><Metric label="Income" value={`${money.format(hub.budget.minMonthlyIncomeAed)}/mo`} detail="Private to you" /><Metric label="Rent budget" value={`${money.format(hub.budget.annualBudgetAed)}/yr`} detail={allowanceDetail(hub)} /><Metric label="Initial cash" value="Unknown" detail="Payment terms not verified" /></div><div className="directory-grid inline-grid"><Link className="directory-card" href="/move/homes"><span className="section-label">Housing</span><h2>{homes.length} homes fit</h2><p>After affordability and allowance filters.</p></Link><Link className="directory-card" href="/move/setup"><span className="section-label">Setup</span><h2>{services.length} official actions</h2><p>Opened links are not submissions.</p></Link><Link className="directory-card" href="/move/workspaces"><span className="section-label">Work</span><h2>{workspaces.length} providers</h2><p>Provider owns booking status.</p></Link></div></div>;
}

function HomesScreen({ hub, homes, busy, onOpen }: { hub: PersonHub; homes: HomeRecommendation[]; busy: boolean; onOpen: (target: { id: string; url: string | null }) => void }) {
  return <section><SectionHead label="Homes after affordability and allowance filters" action={`${homes.length} shown`} />{homes.length > 0 ? <div className="home-grid">{homes.map((item) => <HomeCard key={item.id} item={item} busy={busy} onOpen={onOpen} />)}</div> : <HousingEmpty hub={hub} />}</section>;
}

function ActionsScreen({ title, items, busy, onOpen }: { title: string; items: ActionRecommendation[]; busy: boolean; onOpen: (target: { id: string; url: string | null }) => void }) {
  return <section className="plain-panel"><SectionHead label={title} />{items.length > 0 ? items.map((item) => <ActionRow key={item.id} item={item} busy={busy} onOpen={onOpen} />) : <EmptyState text="No source-backed actions are available for this profile yet." />}</section>;
}

function FinanceScreen({ hub, finance }: { hub: PersonHub; finance: ActionRecommendation[] }) {
  return <div className="two-column"><section className="plain-panel"><SectionHead label="Financial-readiness factors" /><ul className="check-list">{hub.financeReadiness.factors.map((factor) => <li key={factor}>{factor}</li>)}<li>No approval probability. Lender and bank decisions remain provider-owned.</li></ul>{finance.map((item) => <SourceLinks sources={item.sources} key={item.id} />)}</section><section className="plain-panel"><SectionHead label="Evidence and consent" /><EmptyState text="No evidence is required to start. Income documents, bank results and identity evidence remain private unless you grant recipient-specific consent." /></section></div>;
}

function TimelineScreen({ hub, busy, onReport }: { hub: PersonHub; busy: boolean; onReport: (taskId: string, state: string, nextAction: string, reference: string, blocker: string) => Promise<void> }) {
  const [taskId, setTaskId] = useState(hub.tasks[0]?.id ?? "");
  const [state, setState] = useState("saved");
  const [nextAction, setNextAction] = useState("");
  const [reference, setReference] = useState("");
  const [blocker, setBlocker] = useState("");
  return <div className="two-column"><section className="plain-panel"><SectionHead label="Timeline" />{hub.timeline.length > 0 ? <Timeline events={hub.timeline} /> : <StatePanel title="No events yet" text="Open a source-backed link or report a blocker to create the first timeline event." />}</section><section className="plain-panel"><SectionHead label="Report progress" /><form className="intake-form" onSubmit={(event) => { event.preventDefault(); void onReport(taskId, state, nextAction, reference, blocker); }}><label>Task<select value={taskId} onChange={(event) => setTaskId(event.target.value)}>{hub.tasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label><label>Status<select value={state} onChange={(event) => setState(event.target.value)}><option value="saved">Saved</option><option value="reported_submitted">Reported submitted</option><option value="reported_booked">Reported booked</option><option value="blocked">Blocked</option></select></label><label>Next action<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="What should happen next?" /></label><label>Reference <span>(optional)</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Provider reference if you have one" /></label>{state === "blocked" ? <label>Blocker<input value={blocker} onChange={(event) => setBlocker(event.target.value)} placeholder="What is blocking this?" /></label> : null}<button className="primary-action" disabled={busy || !taskId}>{busy ? "Saving…" : "Save user-reported status"}</button><p className="form-note">This is labeled as your report. It is not provider confirmation.</p></form></section></div>;
}

function ProfileScreen({ hub, busy, onUpdate }: { hub: PersonHub; busy: boolean; onUpdate: (values: PersonalValues) => Promise<void> }) {
  const household = hub.profile.household.children > 0 ? "family" : hub.profile.household.adults > 1 ? "couple" : "single";
  return <section className="plain-panel"><SectionHead label="Edit my plan" /><p className="form-note">Updates reuse this private profile. They do not create a duplicate move, erase timeline history, or change a company allowance.</p><PersonalForm busy={busy} preferredArea={hub.profile.preferredAreaIds[0] ?? ""} submitLabel="Save plan inputs" onSubmit={onUpdate} initial={{ displayName: hub.profile.displayName, workType: hub.profile.workType, household, incomeMin: hub.profile.income.minMonthlyAed, incomeMax: hub.profile.income.maxMonthlyAed === hub.profile.income.minMonthlyAed ? null : hub.profile.income.maxMonthlyAed }} /></section>;
}

function PersonalForm({ busy, preferredArea, submitLabel, onSubmit, initial }: { busy: boolean; preferredArea: string; submitLabel: string; onSubmit: (values: PersonalValues) => Promise<void>; initial?: Partial<PersonalValues> }) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parsePersonal(new FormData(event.currentTarget), preferredArea);
    if (typeof parsed === "string") { setError(parsed); return; }
    setError("");
    await onSubmit(parsed);
  }
  return <form className="intake-form" onSubmit={submit}>{error ? <p className="error-note" role="alert">{error}</p> : null}<label>Name <span>(optional)</span><input name="displayName" placeholder="Private mover" defaultValue={initial?.displayName ?? ""} /></label><label>Work type<select name="workType" defaultValue={initial?.workType ?? "employee"}><option value="employee">Employee</option><option value="freelancer">Freelancer</option><option value="self_employed">Self-employed</option></select></label><label>Household<select name="household" defaultValue={initial?.household ?? "single"}><option value="single">Single</option><option value="couple">Couple</option><option value="family">Family with children</option></select></label><label>Monthly income (AED)<input name="incomeMin" inputMode="numeric" placeholder="8000" defaultValue={initial?.incomeMin ?? ""} /></label><label>Monthly income upper range <span>(optional)</span><input name="incomeMax" inputMode="numeric" placeholder="Optional upper range" defaultValue={initial?.incomeMax ?? ""} /></label>{preferredArea ? <p className="form-note">Area preference added from directory: {areaLabel(preferredArea)}.</p> : null}<button className="primary-action" disabled={busy}>{busy ? "Working…" : submitLabel}</button></form>;
}

function HomeCard({ item, busy, onOpen }: { item: HomeRecommendation; busy: boolean; onOpen: (target: { id: string; url: string | null }) => void }) {
  const source = item.sources[0];
  const home = item.home;
  const imageUrl = (home as { imageUrl?: string | null }).imageUrl ?? null;
  return <article className="home-card photo-home"><figure className="home-photo">{imageUrl ? <img src={imageUrl} alt={`Listing photo for ${home.title}`} /> : <div className="photo-empty" role="img" aria-label="No listing photo available"><span>No listing photo available</span></div>}</figure><div className="home-topline"><span>{home.bedrooms === 0 ? "Studio" : `${home.bedrooms} bed`}</span><span>{item.policyFit ? "Within allowance" : "Over allowance"}</span></div><h3>{home.title}</h3><p>{home.area} · {home.availability === "illustrative" ? "Synthetic planning example" : "Availability unconfirmed"}</p><strong>{money.format(home.annualRentAed)}/year</strong><ul className="reason-list">{item.reasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}</ul>{source ? <SourceLinks sources={item.sources} /> : <small>Checked {formatDateTime(home.checkedAt)}</small>}{home.synthetic ? <button type="button" disabled>Synthetic planning only</button> : home.contactable && home.listingUrl ? <button type="button" disabled={busy} onClick={() => onOpen({ id: item.id, url: home.listingUrl })}>Open listing and record opened</button> : <button type="button" disabled>Market evidence only</button>}</article>;
}

function ActionRow({ item, busy, onOpen }: { item: ActionRecommendation; busy: boolean; onOpen: (target: { id: string; url: string | null }) => void }) {
  const greenVisa = item.sources.some((source) => source.id === "adro-freelancer-green-visa");
  return <div className="action-row"><span><strong>{item.title}</strong><small>{greenVisa ? "Eligibility check: ADRO lists criteria, and its page says this nomination route is currently unavailable through ADRO." : item.reasons[0] ?? "Open the provider page and record the reference."}</small>{greenVisa ? <small className="eligibility-note">Use this as an eligibility note, not an application status.</small> : null}</span><SourceLinks sources={item.sources} />{item.actionUrl ? <button className="primary-action" type="button" disabled={busy} onClick={() => onOpen({ id: item.id, url: item.actionUrl })}>{greenVisa ? "Open eligibility page" : item.actionLabel ?? "Open"}</button> : <button type="button" disabled>No direct action</button>}</div>;
}

function HousingEmpty({ hub }: { hub: PersonHub }) { return <div className="state-panel"><h3>No affordable source-linked homes yet</h3><p>Nothing passed both the affordability and allowance filters. Edit your income range or preferred areas, or browse the original source catalog. Bankable will not invent individual listings.</p><p className="form-note">Planning budget: {money.format(hub.housingSearch.annualBudgetAed)}/year. {hub.housingSearch.assumptions.join(" ")}</p><Link className="primary-action" href="/move/profile">Edit my plan</Link><Link className="secondary-action" href="/homes">Review housing sources</Link></div>; }
function SyntheticBanner() { return <section className="fictional-banner" role="status"><strong>Fictional demo data</strong><span>This route is showing a synthetic program or profile for product testing. It is not a real company move, provider filing or government status.</span></section>; }
function isSyntheticContext(person: PersonHub | null, hr: HrView | null, demoMode: boolean) { return demoMode || Boolean(person?.profile.synthetic) || Boolean(hr?.program.synthetic) || Boolean(hr?.organization.synthetic); }
async function copyInviteLink(inviteLink: string, onCopyResult: (notice: Notice) => void) {
  try {
    await navigator.clipboard.writeText(new URL(inviteLink, window.location.origin).toString());
    onCopyResult({ tone: "success", text: "Invite link copied. Share it through your own channel; Bankable has not sent it." });
  } catch {
    onCopyResult({ tone: "error", text: "Could not copy automatically. Select and copy the invite link shown on the dashboard." });
  }
}
function sourceLabel(source: { id: string; kind?: string; verification?: string }) {
  if (source.verification === "search_only") return "search result only";
  if (source.verification === "access_blocked") return "source unavailable";
  if (source.id.includes("calibration")) return "internal planning calibration";
  if (source.id === "adrec-rental-index") return "rental-index benchmark";
  if (source.kind === "government" || source.kind === "regulator") return "official source";
  if (source.kind === "property_portal") return "property source";
  return "provider source";
}

function SourceLinks({ sources }: { sources: { id: string; publisher: string; title: string; url: string; checkedAt: string; kind?: string; verification?: string }[] }) { return <small className="source-links">{sources.slice(0, 2).map((source, index) => <span key={source.id}>{index > 0 ? " · " : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.publisher}</a> <em>{sourceLabel(source)}</em>, checked {formatDateTime(source.checkedAt)}</span>)}</small>; }
function Timeline({ events }: { events: PersonHub["timeline"] }) { return <ol className="timeline">{events.map((event) => <li key={event.id}><span className="dot" aria-hidden="true" /><span><strong>{labelState(event.state)} · {event.owner}</strong><p>{event.nextAction}</p><small>{event.source.label}, {formatDateTime(event.updatedAt)}</small></span></li>)}</ol>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function SectionHead({ label, action }: { label: string; action?: string }) { return <div className="section-head"><h3>{label}</h3>{action ? <span className="count-badge">{action}</span> : null}</div>; }
function StatePanel({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="state-panel"><h3>{title}</h3><p>{text}</p>{action}</div>; }
function EmptyState({ text }: { text: string }) { return <p className="empty-state">{text}</p>; }
function StatusPill({ status }: { status: "On track" | "Needs action" | "Blocked" }) { return <span className="status-pill" data-status={status}>{status}</span>; }
function statusFor(employee?: HrView["employees"][number]): "On track" | "Needs action" | "Blocked" { if (!employee) return "Needs action"; if (employee.blockers.length > 0) return "Blocked"; if (!employee.inviteAccepted || employee.milestones.some((milestone) => milestone.state === "not_started" && milestone.owner === "organization")) return "Needs action"; return "On track"; }
function policyLabel(value: HrView["employees"][number]["housingPolicyFit"]) { if (value === "fits") return "Fits"; if (value === "over_allowance") return "Over allowance"; return "No shortlist"; }
function parsePersonal(form: FormData, preferredArea: string): PersonalValues | string { const incomeMin = parseRequiredMoney(form.get("incomeMin"), "Monthly income (AED)"); if (typeof incomeMin === "string") return incomeMin; const incomeMax = parseOptionalMoney(form.get("incomeMax"), incomeMin); if (typeof incomeMax === "string") return incomeMax; if (incomeMax !== null && incomeMax < incomeMin) return "Upper income range must be greater than or equal to the minimum."; return { displayName: String(form.get("displayName") ?? ""), workType: String(form.get("workType") ?? "employee"), household: String(form.get("household") ?? "single"), incomeMin, incomeMax, preferredAreaIds: preferredArea ? [preferredArea] : [] }; }
function parseProgram(form: FormData, hasUaeEntity: boolean): ProgramValues | string { const teamSize = parseRequiredWholeNumber(form.get("teamSize"), "Team size"); if (typeof teamSize === "string") return teamSize; const annualAllowanceAed = parseRequiredMoney(form.get("annualAllowanceAed"), "Annual housing allowance"); if (typeof annualAllowanceAed === "string") return annualAllowanceAed; const moveDate = String(form.get("moveDate") ?? ""); if (!moveDate) return "Move date is required."; return { organizationName: String(form.get("organizationName") ?? ""), hasUaeEntity, jurisdiction: String(form.get("jurisdiction") ?? "adgm"), officeAreaId: toAreaId(String(form.get("officeArea") || "Al Maryah Island")), teamSize, moveDate, annualAllowanceAed }; }
function profileBody(values: PersonalValues) { return { displayName: values.displayName.trim() || "Private mover", workType: values.workType, adults: values.household === "single" ? 1 : 2, children: values.household === "family" ? 1 : 0, minMonthlyAed: values.incomeMin, maxMonthlyAed: values.incomeMax ?? values.incomeMin, preferredAreaIds: values.preferredAreaIds }; }
function parseRequiredMoney(value: FormDataEntryValue | null, label: string) { const text = String(value ?? "").replace(/,/g, "").trim(); const parsed = Number(text); if (!text || !Number.isFinite(parsed) || parsed < 0) return `${label} must be a finite number. Zero is allowed when it is intentional.`; return parsed; }
function parseOptionalMoney(value: FormDataEntryValue | null, fallback: number) { const text = String(value ?? "").replace(/,/g, "").trim(); if (!text) return null; const parsed = Number(text); if (!Number.isFinite(parsed) || parsed < 0) return "Upper income range must be a finite number when provided."; return parsed; }
function parseRequiredWholeNumber(value: FormDataEntryValue | null, label: string) { const parsed = Number(String(value ?? "").trim()); if (!Number.isInteger(parsed) || parsed <= 0) return `${label} must be a whole number greater than zero.`; return parsed; }
function initialInviteParams() { if (typeof window === "undefined") return { inviteId: "", token: "" }; const params = new URLSearchParams(window.location.search); return { inviteId: params.get("inviteId") ?? "", token: params.get("token") ?? "" }; }
function initialAreaParam() { if (typeof window === "undefined") return ""; return new URLSearchParams(window.location.search).get("area") ?? ""; }
function readSavedSession(): SavedSession | null { if (typeof window === "undefined") return null; try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as SavedSession : null; } catch { return null; } }
function clearSavedSession() { if (typeof window !== "undefined") sessionStorage.removeItem(SESSION_KEY); }
function upsertHub(list: PersonHub[], hub: PersonHub) { return [hub, ...list.filter((item) => item.profile.id !== hub.profile.id)]; }
function upsertToken(list: EmployeeToken[], token: EmployeeToken) { return [token, ...list.filter((item) => item.personId !== token.personId)]; }
function labelState(state: string) { return state.replace(/_/g, " "); }
function allowanceDetail(hub: PersonHub) { return hub.case.programId ? `Allowance cap ${money.format(hub.budget.policyAllowanceAnnualAed)}` : "Private planning cap from income share"; }
function areaLabel(areaId: string) { return areaId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function toAreaId(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "al-maryah-island"; }
function formatDateTime(value: string) { if (!value) return "unknown"; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat("en-AE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); }
