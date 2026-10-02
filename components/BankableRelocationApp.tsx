/* eslint-disable @next/next/no-img-element */
"use client";

import areaGuidesJson from "@/data/abu-dhabi/area-guides.json";
import catalog from "@/data/abu-dhabi/catalog.json";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { sortByProximity } from "@/lib/relocation/proximity";
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
  type StatusEvent,
} from "./relocation-api";

type HomeRecommendation = Extract<Recommendation, { type: "home" }>;
type ActionRecommendation = Exclude<Recommendation, { type: "home" }>;
type EmployeeToken = DemoCapabilities["employees"][number];
type Notice = { tone: "neutral" | "success" | "error"; text: string } | null;
type SavedSession = { hrToken: string | null; programId: string | null; employeeTokens: EmployeeToken[]; selectedId: string };
type PlanningContext = { nationality: string; purposeOfMove: string; employmentStatus: string; sponsor: string; alreadyInUae: string; documentsAvailable: string[]; completedSteps: string[] };
type PersonalValues = { displayName: string; workType: string; household: string; incomeMin: number; incomeMax: number | null; preferredAreaIds: string[]; planningContext: PlanningContext };
type ProgramValues = { organizationName: string; hasUaeEntity: boolean; jurisdiction: string; officeAreaId: string; teamSize: number; moveDate: string; annualAllowanceAed: number };
type WorkspaceSection = "overview" | "areas" | "homes" | "workspaces" | "setup" | "finance" | "timeline";
type WorkspaceArea = { id: string; name: string; summary: string; offers: string[]; image?: { src: string; alt: string; credit: string } };
type AreaGuide = { areaId?: string; id?: string; shortBlurb?: string; factualHighlights?: { text: string }[]; practicalTips?: { text: string }[]; image?: { localPath: string; caption: string; photographer?: string; license?: string } };
type RoadmapMilestone = { key: string; category: string; label: string; href: string; taskId: string; state: string; status: "blocked" | "active" | "reported" | "next"; latest?: StatusEvent; history: StatusEvent[] };

const SESSION_KEY = "bankable-relocation-session-v2";
const LEGACY_SESSION_KEY = "bankable-relocation-session-v1";
const money = new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 });
const workspaceAreas = buildWorkspaceAreas();
const documentOptions = [
  { value: "passport", label: "Passport" },
  { value: "offer", label: "Offer / employment contract" },
  { value: "education", label: "Education or professional certificates" },
  { value: "income", label: "Income evidence" },
  { value: "uae-id", label: "UAE ID or residence evidence" },
];
const completedOptions = [
  { value: "job", label: "Found a job or confirmed work" },
  { value: "company", label: "Started company setup" },
  { value: "residence", label: "Started residence / visa steps" },
  { value: "housing", label: "Shortlisted or secured housing" },
];

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
      setNotice({ tone: "success", text: "Invite link created. Yala AD has not sent any message." });
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
    if (!openedWindow) {
      setNotice({ tone: "error", text: "Your browser blocked the new tab. Allow popups for Yala AD, then try again. Nothing was recorded as opened." });
      return;
    }
    openedWindow.opener = null;
    setBusy(true);
    setNotice(null);
    try {
      await apiPost<OpenedActionPayload>("/api/relocation/actions/opened", { caseId: selected.case.id, targetId: target.id }, selectedToken);
      openedWindow.location.href = target.url;
      await refreshFromTokens();
      setNotice({ tone: "success", text: "Link recorded as opened only. Provider outcomes remain outside Yala AD." });
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

  async function selectProperty(listingId: string | null) {
    if (!selected || !selectedToken) {
      setNotice({ tone: "error", text: "Create or restore a private move before selecting a home." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await apiPost<PersonHubPayload>("/api/relocation/properties/selection", {
        caseId: selected.case.id,
        listingId,
      }, selectedToken);
      setPeople((current) => upsertHub(current, result.view));
      setNotice({ tone: "success", text: listingId ? "Home selected. Your rent and finance view now reflects this property." : "Selected home cleared." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not select this home." });
    } finally {
      setBusy(false);
    }
  }

  const shell = (children: ReactNode) => (
    <main className="min-h-screen app-shell">
      <Header demoMode={isSyntheticContext(selected, hrView, demoMode)} onDemo={seedDemo} busy={busy} />
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

  if (screen === "move" && loading) return shell(<section className="screen-card"><StatePanel title="Restoring your Yala AD workspace" text="Checking this browser for your saved private move before showing any intake screen." /></section>);
  if (screen === "move" && !selected) return shell(<MoveOnboarding busy={busy} preferredArea={preferredArea} onCreate={createProfile} />);
  if (!selected) return shell(<NoPrivateMove preferredArea={preferredArea} />);

  if (screen === "move-profile") {
    return shell(
      <MoveShell hub={selected} selectedId={selectedId} people={people} setSelectedId={setSelectedId}>
        <ProfileScreen hub={selected} busy={busy} onUpdate={updateProfile} />
      </MoveShell>,
    );
  }

  return shell(
    <MoveShell hub={selected} selectedId={selectedId} people={people} setSelectedId={setSelectedId}>
      <MoveWorkspace hub={selected} homes={homes} services={services} workspaces={workspaces} finance={finance} busy={busy} initialSection={sectionForScreen(screen)} onOpen={openTarget} onSelectProperty={selectProperty} onReport={reportManualStatus} />
    </MoveShell>,
  );
}

function Header({ demoMode, onDemo, busy }: { demoMode: boolean; onDemo: () => void; busy: boolean }) {
  return <header className="topbar" aria-label="Yala AD header"><Link href="/" className="brand"><BrandMark className="brand-mark" /><span>Yala AD</span></Link><nav aria-label="Primary"><Link href="/start">Start</Link><Link href="/move">My move</Link><Link href="/company/dashboard">Company</Link><Link href="/areas">Areas</Link></nav><button className="text-action" type="button" onClick={onDemo} disabled={busy}>{demoMode ? "Fictional demo loaded" : "Explore fictional demo"}</button></header>;
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
  return <section className="screen-card"><p className="kicker">Move my team</p><h1>Create the company move program.</h1><form className="intake-form" method="post" onSubmit={submit}>{error ? <p className="error-note" role="alert">{error}</p> : null}<label>Company name <span>(optional)</span><input name="organizationName" placeholder="Company move" /></label><label>UAE entity status<select value={entityStatus} onChange={(event) => setEntityStatus(event.target.value)}><option value="ready">Already established</option><option value="new">Need setup route</option></select></label>{entityStatus === "new" ? <label>Setup jurisdiction<select name="jurisdiction" defaultValue="adgm"><option value="mainland">Mainland through ADDED</option><option value="adgm">ADGM</option><option value="kezad">KEZAD</option></select></label> : null}<label>Office area<input name="officeArea" defaultValue="Al Maryah Island" /></label><label>Team size<input name="teamSize" type="number" min={1} placeholder="5" /></label><label>Move date<input name="moveDate" type="date" /></label><label>Annual housing allowance<input name="annualAllowanceAed" inputMode="numeric" placeholder="105000" /></label><button className="primary-action" disabled={busy}>{busy ? "Creating…" : "Create company dashboard"}</button></form></section>;
}

function CompanyDashboard({ hr, loading, busy, invite, inviteLabel, canInvite, setInviteLabel, onInvite, onReset, onCopyResult }: { hr: HrView | null; loading: boolean; busy: boolean; invite: InviteCreatePayload | null; inviteLabel: string; canInvite: boolean; setInviteLabel: (value: string) => void; onInvite: () => void; onReset: () => void; onCopyResult: (notice: Notice) => void }) {
  if (loading) return <section className="screen-card"><StatePanel title="Restoring company dashboard" text="Checking this browser for a saved company session." /></section>;
  if (!hr) return <section className="screen-card"><p className="kicker">Company dashboard</p><h1>No company program yet.</h1><p className="lead">Create a program before issuing invite links or viewing aggregate progress.</p><Link className="primary-action" href="/company">Create company program</Link></section>;
  const inviteLink = invite ? `/join?inviteId=${encodeURIComponent(invite.inviteId)}&token=${encodeURIComponent(invite.token)}` : "";
  return <section className="screen-card wide"><div className="screen-head"><div><p className="kicker">Company dashboard</p><h1>{hr.organization.name}</h1></div><button className="text-action" type="button" onClick={onReset}>Clear browser session</button></div><div className="metric-grid"><Metric label="Invite links created" value={`${hr.aggregate.invited}`} detail={`${hr.aggregate.accepted} accepted`} /><Metric label="Policy fit" value={`${hr.aggregate.policyFit}/${hr.aggregate.cases}`} detail="Private budgets hidden" /><Metric label="Links opened" value={`${hr.aggregate.openedHandoffs}`} detail="Opened only, never confirmation" /></div><section className="plain-panel"><SectionHead label="Create invite" /><div className="invite-panel"><label>Employee label <span>(optional)</span><input value={inviteLabel} onChange={(event) => setInviteLabel(event.target.value)} placeholder="e.g. Finance manager" /></label>{canInvite ? null : <p className="form-note">Create a company program first to enable invite links.</p>}<button className="primary-action" type="button" onClick={onInvite} disabled={busy || !canInvite}>{busy ? "Creating…" : "Create invite link"}</button>{invite ? <><code>{inviteLink}</code><button className="secondary-action" type="button" onClick={() => { void copyInviteLink(inviteLink, onCopyResult); }}>Copy invite link</button><p className="form-note">Share this through your own channel. Yala AD does not send or confirm delivery.{invite.expiresAt ? ` Expires ${formatDateTime(invite.expiresAt)}.` : ""}</p></> : null}</div></section><section className="plain-panel"><SectionHead label="Employee progress visible to HR" />{hr.employees.length > 0 ? <div className="hr-table">{hr.employees.map((employee) => <div key={employee.personId}><span><strong>{employee.displayName}</strong><small>{employee.inviteAccepted ? "Invite accepted" : "Invite pending"}</small></span><StatusPill status={statusFor(employee)} /><strong>{policyLabel(employee.housingPolicyFit)}</strong><small>{employee.blockers[0] ?? employee.milestones.find((milestone) => milestone.state === "not_started")?.nextAction ?? "No shared blocker"}</small></div>)}</div> : <StatePanel title="No employees yet" text="Create an invite link. HR will see permitted progress after an employee accepts." />}</section><p className="privacy-note">HR sees aggregate move progress, shared blockers, deadlines and housing-policy fit. Private income documents, bank results and identity evidence stay hidden unless the employee grants recipient-specific consent.</p></section>;
}

function NoPrivateMove({ preferredArea }: { preferredArea: string }) {
  return <section className="screen-card"><p className="kicker">Private move</p><h1>Create your move hub first.</h1><p className="lead">This focused page needs your private profile before it can show homes, timeline or setup actions.</p><Link className="primary-action" href={preferredArea ? `/move?area=${encodeURIComponent(preferredArea)}` : "/move"}>Create private hub</Link></section>;
}

function MoveShell({ hub, people, selectedId, setSelectedId, children }: { hub: PersonHub; people: PersonHub[]; selectedId: string; setSelectedId: (id: string) => void; children: ReactNode }) {
  function chooseProfile(id: string) {
    setSelectedId(id);
    const saved = readSavedSession();
    if (saved) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...saved, selectedId: id }));
  }
  return <section className="screen-card wide relocation-workspace-shell"><div className="screen-head"><div><p className="kicker">Private workspace</p><h1>{hub.profile.displayName}</h1></div>{people.length > 1 ? <select aria-label="Choose private profile" value={selectedId} onChange={(event) => chooseProfile(event.target.value)}>{people.map((person) => <option key={person.profile.id} value={person.profile.id}>{person.profile.displayName}</option>)}</select> : null}</div>{children}</section>;
}

function MoveWorkspace({ hub, homes, services, workspaces, finance, busy, initialSection, onOpen, onSelectProperty, onReport }: { hub: PersonHub; homes: HomeRecommendation[]; services: ActionRecommendation[]; workspaces: ActionRecommendation[]; finance: ActionRecommendation[]; busy: boolean; initialSection: WorkspaceSection; onOpen: (target: { id: string; url: string | null }) => void; onSelectProperty: (listingId: string | null) => Promise<void>; onReport: (taskId: string, state: string, nextAction: string, reference: string, blocker: string) => Promise<void> }) {
  const [areaId, setAreaId] = useState(hub.profile.preferredAreaIds[0] ?? "all");
  // The area choice ranks nearest-first; it never hides options, so no section is left empty.
  const focusAreaId = areaId === "all" ? null : areaId;
  const rankedHomes = sortByProximity(homes, focusAreaId, (item) => item.home.areaId);
  const rankedWorkspaces = sortByProximity(workspaces, focusAreaId, (item) => item.areaId);
  const selectedArea = areaId === "all" ? null : workspaceAreas.find((area) => area.id === areaId) ?? null;
  const inAreaHomes = rankedHomes.filter((entry) => entry.km === 0).length;
  const inAreaWorkspaces = rankedWorkspaces.filter((entry) => entry.km === 0).length;
  const areasToShow = areaId === "all" ? workspaceAreas : workspaceAreas.filter((area) => area.id === areaId);
  useEffect(() => {
    const targetId = window.location.hash.slice(1) || (initialSection === "overview" ? "" : initialSection);
    if (!targetId) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [hub.profile.id, initialSection]);
  return (
    <div className="move-workspace" id={initialSection}>
      <nav className="workspace-jump" aria-label="Workspace sections">
        <a href="#areas">Areas</a><a href="#homes">Homes</a><a href="#workspaces">Workspaces</a>
        <a href="#budget">Budget</a><a href="#setup">Setup</a><a href="#timeline">Roadmap</a>
        <Link href="/move/profile">Edit inputs</Link>
      </nav>
      <section className="workspace-hero-card">
        <div>
          <p className="kicker">Filtered workspace</p><h2>Your Abu Dhabi move in one view.</h2>
          <p>Choose an area once, then see what it offers, homes that pass budget checks, nearby workspace options, setup actions, finance factors and the next milestone.</p>
          <div className="workspace-quick-stats">
            <Metric label="Rent budget" value={`${money.format(hub.budget.annualBudgetAed)}/yr`} detail={allowanceDetail(hub)} />
            <Metric label="Next action" value={nextTaskLabel(hub)} detail={nextTaskDetail(hub)} />
          </div>
        </div>
        <label>Area filter<select value={areaId} onChange={(event) => setAreaId(event.target.value)}>
          <option value="all">All source-backed areas</option>
          {workspaceAreas.map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
        </select></label>
      </section>
      <section className="workspace-section" id="areas">
        <SectionHead label="Areas and what they offer" action={selectedArea ? selectedArea.name : `${workspaceAreas.length} areas`} />
        <div className={areasToShow.length === 1 ? "area-mini-grid is-single" : "area-rail"}>
          {areasToShow.map((area) => <article key={area.id} className="area-mini-card">
            {area.image ? <figure><img src={area.image.src} alt={area.image.alt} /><figcaption>{area.image.credit}</figcaption></figure> : null}
            <span>{area.name}</span><p>{area.summary}</p>
            {areasToShow.length === 1 ? <ul>{area.offers.map((offer) => <li key={offer}>{offer}</li>)}</ul> : <details className="area-info"><summary>What it offers</summary><ul>{area.offers.map((offer) => <li key={offer}>{offer}</li>)}</ul></details>}
            <Link href={`/areas/${area.id}`}>Open area guide</Link>
          </article>)}
        </div>
      </section>
      <section className="workspace-section" id="homes">
        <SectionHead label="Homes after affordability and policy filters" action={`${rankedHomes.length} shown`} />
        {selectedArea ? <RankNote areaName={selectedArea.name} inArea={inAreaHomes} total={rankedHomes.length} /> : null}
        {rankedHomes.length > 0 ? <div className="home-grid">{rankedHomes.map(({ item, km }) => <HomeCard
          key={item.id}
          item={item}
          busy={busy}
          selected={hub.case.selectedListingId === item.home.id}
          onOpen={onOpen}
          onSelect={() => void onSelectProperty(hub.case.selectedListingId === item.home.id ? null : item.home.id)}
          distanceKm={km}
        />)}</div> : <HousingEmpty hub={hub} baselineCount={homes.length} areaName={null} onClearArea={() => setAreaId("all")} />}
      </section>
      <section className="workspace-section split" id="workspaces">
        <div className="plain-panel">
          <SectionHead label="Nearby workspaces" action={`${rankedWorkspaces.length} shown`} />
          {selectedArea ? <RankNote areaName={selectedArea.name} inArea={inAreaWorkspaces} total={rankedWorkspaces.length} /> : null}
          {rankedWorkspaces.length > 0 ? rankedWorkspaces.map(({ item, km }) => <ActionRow key={item.id} item={item} busy={busy} onOpen={onOpen} distanceKm={km} />) : <EmptyState text="No source-backed workspace is in the catalog yet. Open the public area guide for local options." />}
        </div>
        <BudgetPanel hub={hub} busy={busy} onSelectProperty={onSelectProperty} />
      </section>
      <section className="workspace-section split" id="setup">
        <div className="plain-panel">
          <SectionHead label="Setup actions" action={`${services.length} actions`} />
          {services.length > 0 ? services.map((item) => <ActionRow key={item.id} item={item} busy={busy} onOpen={onOpen} />) : <EmptyState text="No source-backed setup actions are available for this profile yet." />}
        </div>
        <FinancePanel hub={hub} finance={finance} />
      </section>
      <section className="workspace-section" id="timeline"><RoadmapTimeline hub={hub} busy={busy} onReport={onReport} /></section>
    </div>
  );
}

function BudgetPanel({ hub, busy, onSelectProperty }: { hub: PersonHub; busy: boolean; onSelectProperty: (listingId: string | null) => Promise<void> }) {
  const selectedProperty = hub.selectedProperty;
  return <section className="plain-panel" id="budget">
    <SectionHead label="Budget" />
    <div className="metric-grid compact stat-list">
      <Metric label="Income" value={`${money.format(hub.budget.minMonthlyIncomeAed)}/mo`} detail="Private to you" />
      <Metric label="Rent budget" value={`${money.format(hub.budget.annualBudgetAed)}/yr`} detail={allowanceDetail(hub)} />
      <Metric label="Initial cash" value="Unknown" detail="Payment terms not verified" />
    </div>
    {selectedProperty ? <div className="selected-property-summary" role="status">
      <strong>Selected: {selectedProperty.title}</strong>
      <span>{money.format(selectedProperty.annualRentAed)}/year · {selectedProperty.withinBudget ? "within your current rent budget" : "above your current rent budget"}</span>
      <span>{selectedProperty.rentShareOfIncomePercent === null ? "Rent-to-income share unavailable at zero stated income." : `${selectedProperty.rentShareOfIncomePercent}% of stated minimum income.`}</span>
      {!selectedProperty.withinPolicyAllowance ? <span>Above the company housing allowance.</span> : null}
      <span>Initial cash remains unknown until the listing or provider confirms payment terms.</span>
      <button className="text-action" type="button" disabled={busy} onClick={() => void onSelectProperty(null)}>Clear selected home</button>
    </div> : <p className="form-note">Select a home to see how its rent compares with your current plan.</p>}
    <details className="row-info"><summary>How this budget is worked out</summary><p className="form-note">{hub.housingSearch.assumptions.join(" ")}</p></details>
  </section>;
}

function FinancePanel({ hub, finance }: { hub: PersonHub; finance: ActionRecommendation[] }) {
  return <section className="plain-panel">
    <SectionHead label="Finance readiness" />
    <p className="panel-lead">Readiness factors only. No approval probability: lender and bank decisions remain provider-owned.</p>
    {hub.selectedProperty ? <p className="form-note">Selected rental: {hub.selectedProperty.withinBudget && hub.selectedProperty.withinPolicyAllowance ? "passes the current rent and allowance filters" : "does not pass the current rent or allowance filters"}. This is a rental budget check, not a mortgage or move-in cash approval.</p> : null}
    <details className="row-info"><summary>What lenders look at ({hub.financeReadiness.factors.length})</summary><ul className="check-list">{hub.financeReadiness.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul>{finance.map((item) => <SourceLinks sources={item.sources} key={item.id} />)}</details>
    <p className="form-note">Evidence is optional. Income documents, bank results and identity evidence stay private unless you grant recipient-specific consent.</p>
  </section>;
}

function RoadmapTimeline({ hub, busy, onReport }: { hub: PersonHub; busy: boolean; onReport: (taskId: string, state: string, nextAction: string, reference: string, blocker: string) => Promise<void> }) {
  const milestones = roadmapMilestones(hub);
  const firstTaskId = milestones.find((milestone) => milestone.taskId)?.taskId ?? "";
  const [selectedKey, setSelectedKey] = useState(milestones[0]?.key ?? "housing");
  const selectedMilestone = milestones.find((milestone) => milestone.key === selectedKey) ?? milestones[0];
  const [taskId, setTaskId] = useState(firstTaskId);
  const [state, setState] = useState("saved");
  const [nextAction, setNextAction] = useState("");
  const [reference, setReference] = useState("");
  const [blocker, setBlocker] = useState("");

  const taskOptions = hub.tasks.filter((task) => task.category === selectedMilestone?.category);
  const selectedTask = taskOptions.find((task) => task.id === taskId) ?? taskOptions[0] ?? null;
  const latest = selectedMilestone?.latest;
  const history = selectedMilestone?.history ?? [];
  const canReport = Boolean(selectedTask?.id);
  return <div className="roadmap-layout"><section className="roadmap-card"><div className="section-head"><h3>Move roadmap</h3><span className="count-badge">{milestones.length} milestones</span></div><p className="form-note">A broad winding road for the move. Select a numbered stop to see the task, source, time, owner and the next action.</p><div className="roadmap-canvas" aria-label="Numbered move milestones"><svg viewBox="0 0 1180 390" role="img" aria-hidden="true"><path className="road-asphalt" d="M55 286 C190 110 310 118 420 220 C535 328 678 324 780 195 C875 75 1005 82 1124 154"/><path className="road-dash" d="M55 286 C190 110 310 118 420 220 C535 328 678 324 780 195 C875 75 1005 82 1124 154"/></svg>{milestones.map((milestone, index) => <button className="road-stop" data-step={index + 1} data-state={milestone.status} data-selected={milestone.key === selectedMilestone?.key ? "true" : "false"} type="button" onClick={() => { setSelectedKey(milestone.key); setTaskId(milestone.taskId); }} key={milestone.key}><strong>{index + 1}</strong><span>{milestone.label}</span><small>{milestone.latest ? `${labelState(milestone.latest.state)} · ${formatDateTime(milestone.latest.updatedAt)}` : labelState(milestone.state)}</small></button>)}</div><div className="roadmap-selected-panel"><div><p className="kicker">Selected step</p><h4>{selectedMilestone?.label ?? "Move step"}</h4><p>{latest?.nextAction ?? selectedTask?.nextAction ?? milestoneFallbackText(selectedMilestone?.category ?? "")}</p></div><a className="secondary-action" href={selectedMilestone?.href ?? "#areas"}>Continue to action</a></div></section><section className="roadmap-detail-grid"><article className="plain-panel"><SectionHead label="Evidence details" />{latest ? <div className="evidence-panel"><p><strong>Latest:</strong> {labelState(latest.state)}</p><dl><div><dt>Source</dt><dd>{displaySourceName(latest.source.label)}</dd></div><div><dt>Time</dt><dd>{formatDateTime(latest.updatedAt)}</dd></div><div><dt>Owner</dt><dd>{latest.owner}</dd></div><div><dt>Next action</dt><dd>{latest.nextAction}</dd></div>{latest.blocker ? <div><dt>Blocker</dt><dd>{latest.blocker}</dd></div> : null}</dl></div> : <StatePanel title="No event for this step yet" text={selectedTask?.nextAction ?? milestoneFallbackText(selectedMilestone?.category ?? "")} />}{history.length > 1 ? <details className="history-panel"><summary>Resolved and earlier history</summary><ul>{history.slice(1).map((event) => <li key={event.id}><strong>{labelState(event.state)}</strong> · {displaySourceName(event.source.label)} · {formatDateTime(event.updatedAt)}<br />{event.nextAction}</li>)}</ul></details> : null}</article><article className="plain-panel"><SectionHead label="Report progress" />{canReport ? <form className="intake-form roadmap-form" method="post" onSubmit={(event) => { event.preventDefault(); void onReport(selectedTask.id, state, nextAction, reference, blocker); }}><label>Task<select value={selectedTask.id} onChange={(event) => { const nextTaskId = event.target.value; setTaskId(nextTaskId); const task = hub.tasks.find((item) => item.id === nextTaskId); const relatedMilestone = milestones.find((milestone) => milestone.taskId === nextTaskId || milestone.category === task?.category); if (relatedMilestone) setSelectedKey(relatedMilestone.key); }}>{taskOptions.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label><label>Status<select value={state} onChange={(event) => setState(event.target.value)}><option value="saved">Saved</option><option value="reported_submitted">Reported submitted</option><option value="reported_booked">Reported booked</option><option value="blocked">Blocked</option></select></label><label>Next action<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="What should happen next?" /></label><label>Reference <span>(optional)</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Provider reference if you have one" /></label>{state === "blocked" ? <label>Blocker<input value={blocker} onChange={(event) => setBlocker(event.target.value)} placeholder="What is blocking this?" /></label> : null}<button className="primary-action" disabled={busy}>{busy ? "Saving…" : "Save user-reported status"}</button><p className="form-note">This is labeled as your report. It is not provider confirmation.</p></form> : <StatePanel title="No matching task yet" text="This milestone is shown so the move plan is complete, but Yala AD does not have a source-backed task for it yet. Use the related section link instead of filing a report under another category." />}</article></section></div>;
}

function ProfileScreen({ hub, busy, onUpdate }: { hub: PersonHub; busy: boolean; onUpdate: (values: PersonalValues) => Promise<void> }) {
  const household = hub.profile.household.children > 0 ? "family" : hub.profile.household.adults > 1 ? "couple" : "single";
  return <section className="plain-panel"><SectionHead label="Edit my plan" /><p className="form-note">Updates reuse this private profile. They do not create a duplicate move, erase timeline history, or change a company allowance.</p><PersonalForm busy={busy} preferredArea={hub.profile.preferredAreaIds[0] ?? ""} submitLabel="Save plan inputs" onSubmit={onUpdate} initial={{ displayName: hub.profile.displayName, workType: hub.profile.workType, household, incomeMin: hub.profile.income.minMonthlyAed, incomeMax: hub.profile.income.maxMonthlyAed === hub.profile.income.minMonthlyAed ? null : hub.profile.income.maxMonthlyAed, planningContext: hub.profile.planningContext }} /></section>;
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
  const context = initial?.planningContext;
  return <form className="intake-form" method="post" onSubmit={submit}>{error ? <p className="error-note" role="alert">{error}</p> : null}<label>Name <span>(optional)</span><input name="displayName" placeholder="Private mover" defaultValue={initial?.displayName ?? ""} /></label><label>Work type<select name="workType" defaultValue={initial?.workType ?? "employee"}><option value="employee">Employee</option><option value="freelancer">Freelancer</option><option value="self_employed">Self-employed</option></select></label><label>Household<select name="household" defaultValue={initial?.household ?? "single"}><option value="single">Single</option><option value="couple">Couple</option><option value="family">Family with children</option></select></label><label>Monthly income (AED)<input name="incomeMin" inputMode="numeric" placeholder="8000" defaultValue={initial?.incomeMin ?? ""} /></label><label>Monthly income upper range <span>(optional)</span><input name="incomeMax" inputMode="numeric" placeholder="Optional upper range" defaultValue={initial?.incomeMax ?? ""} /></label><details className="intake-context"><summary>Improve my setup route <span>(optional · can add later)</span></summary><p className="form-note">These answers help shape your next steps. Skip anything you don’t know; no document upload is needed here.</p><label>Nationality / passport country <span>(optional)</span><input name="nationality" autoComplete="country-name" placeholder="Country" defaultValue={context?.nationality ?? ""} /></label><label>Purpose of move<select name="purposeOfMove" defaultValue={context?.purposeOfMove ?? ""}><option value="">Not sure yet</option><option value="work">Work / employment</option><option value="business">Start or run a business</option><option value="family">Join family</option><option value="study">Study</option><option value="other">Other</option></select></label><label>Employment status<select name="employmentStatus" defaultValue={context?.employmentStatus ?? ""}><option value="">Not sure / prefer not to say</option><option value="offer">Have a job offer</option><option value="employed">Already employed</option><option value="seeking">Looking for work</option><option value="freelance">Freelance / self-employed</option><option value="not-working">Not currently working</option></select></label><label>Who will sponsor your residence? <span>(if known)</span><select name="sponsor" defaultValue={context?.sponsor ?? ""}><option value="">Not sure yet</option><option value="employer">Employer</option><option value="self">Myself / my business</option><option value="family">Family member</option><option value="other">Another sponsor</option></select></label><label>Where are you now?<select name="alreadyInUae" defaultValue={context?.alreadyInUae ?? ""}><option value="">Not answered</option><option value="outside">Outside the UAE</option><option value="inside">Already in the UAE</option></select></label><fieldset><legend>Documents you already have <span>(optional)</span></legend>{documentOptions.map((item) => <label className="check-option" key={item.value}><input type="checkbox" name="documentsAvailable" value={item.value} defaultChecked={context?.documentsAvailable.includes(item.value)} />{item.label}</label>)}</fieldset><fieldset><legend>What have you completed? <span>(optional)</span></legend>{completedOptions.map((item) => <label className="check-option" key={item.value}><input type="checkbox" name="completedSteps" value={item.value} defaultChecked={context?.completedSteps.includes(item.value)} />{item.label}</label>)}</fieldset></details>{preferredArea ? <p className="form-note">Area preference added from directory: {areaLabel(preferredArea)}.</p> : null}<button className="primary-action" disabled={busy}>{busy ? "Working…" : submitLabel}</button></form>;
}

function HomeCard({ item, busy, selected, onOpen, onSelect, distanceKm }: { item: HomeRecommendation; busy: boolean; selected: boolean; onOpen: (target: { id: string; url: string | null }) => void; onSelect: () => void; distanceKm?: number | null }) {
  const source = item.sources[0];
  const home = item.home;
  const imageUrl = (home as { imageUrl?: string | null }).imageUrl ?? null;
  const areaPhoto = imageUrl ? null : areaPhotoFor(home.areaId);
  const openUrl = home.synthetic ? null : home.listingUrl ?? home.sourceUrl;
  const publisher = home.source === "dubizzle" ? "Dubizzle" : "Property Finder";
  const away = distanceKm ? ` · ${kmLabel(distanceKm)}` : "";
  return <article className="home-card photo-home">
    <figure className="home-photo">
      {imageUrl ? <img src={imageUrl} alt={`Listing photo for ${home.title}`} /> : areaPhoto ? <><img src={areaPhoto.src} alt={areaPhoto.alt} /><span className="photo-chip">Area photo · not this listing</span></> : <div className="photo-empty" role="img" aria-label="No listing photo available"><span>No listing photo available</span></div>}
    </figure>
    <div className="home-topline"><span>{home.bedrooms === 0 ? "Studio" : `${home.bedrooms} bed`}</span><span>{item.policyFit ? "Within allowance" : "Over allowance"}</span></div>
    <h3>{home.title}</h3>
    <p>{home.area}{away} · {home.availability === "illustrative" ? "Synthetic planning example" : "Availability unconfirmed"}</p>
    <strong>{money.format(home.annualRentAed)}/year</strong>
    <ul className="reason-list">{item.reasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}</ul>
    {source ? <SourceLinks sources={item.sources} /> : <small>Checked {formatDateTime(home.checkedAt)}</small>}
    <button className={selected ? "secondary-action" : "primary-action"} type="button" disabled={busy} aria-pressed={selected} onClick={onSelect}>
      {selected ? "Selected · clear selection" : "Select for my plan"}
    </button>
    {openUrl ? <button className="primary-action" type="button" disabled={busy} onClick={() => onOpen({ id: item.id, url: openUrl })}>{home.listingUrl ? `Open listing on ${publisher}` : `View on ${publisher}`}</button> : <button type="button" disabled>Synthetic planning only</button>}
  </article>;
}

function RankNote({ areaName, inArea, total }: { areaName: string; inArea: number; total: number }) {
  if (total === 0 || inArea === total) return null;
  return <p className="rank-note">{inArea === 0 ? `Nothing in ${areaName} yet, so the closest come first.` : `${areaName} first, then the closest other areas.`} <span title="Straight-line distance between area centres">Distances are approximate.</span></p>;
}
function kmLabel(km: number) { return `about ${Math.max(1, Math.round(km))} km away`; }
function areaPhotoFor(areaId: string) {
  const image = workspaceAreas.find((area) => area.id === areaId)?.image;
  return image ? { src: image.src, alt: image.alt } : { src: "/abu-dhabi-waterfront.jpg", alt: "Abu Dhabi waterfront, a general area image" };
}

function ActionRow({ item, busy, onOpen, distanceKm }: { item: ActionRecommendation; busy: boolean; onOpen: (target: { id: string; url: string | null }) => void; distanceKm?: number | null }) {
  const areaName = distanceKm == null ? null : workspaceAreas.find((area) => area.id === item.areaId)?.name ?? null;
  const greenVisa = item.sources.some((source) => source.id === "adro-freelancer-green-visa");
  const summary = greenVisa ? "Eligibility check: ADRO lists criteria, and its page says this nomination route is currently unavailable through ADRO." : item.reasons[0] ?? "Open the provider page and record the reference.";
  const lead = item.sources[0];
  return <div className="action-row"><span className="action-main"><strong>{item.title}</strong><small className="action-meta">{areaName ? <b className="distance-chip">{distanceKm ? `${areaName} · ${kmLabel(distanceKm)}` : `In ${areaName}`}</b> : null}{greenVisa ? <b className="eligibility-chip">Eligibility check only</b> : null}{lead ? <i>{displaySourceName(lead.publisher)} · checked {formatShortDate(lead.checkedAt)}</i> : null}</small><details className="row-info"><summary>Details and sources</summary><p>{summary}</p>{greenVisa ? <p className="eligibility-note">Use this as an eligibility note, not an application status.</p> : null}<SourceLinks sources={item.sources} /></details></span>{item.actionUrl ? <button className="primary-action" type="button" disabled={busy} onClick={() => onOpen({ id: item.id, url: item.actionUrl })}>{greenVisa ? "Open eligibility page" : item.actionLabel ?? "Open"}</button> : <button type="button" disabled>No direct action</button>}</div>;
}

function HousingEmpty({ hub, baselineCount, areaName, onClearArea }: { hub: PersonHub; baselineCount: number; areaName: string | null; onClearArea: () => void }) {
  const filterOnly = Boolean(areaName && baselineCount > 0);
  return <div className="state-panel"><h3>{filterOnly ? `No matching homes in ${areaName}` : "No affordable source-linked homes yet"}</h3><p>{filterOnly ? "Your wider shortlist has homes, but none match this area filter. Clear the filter or edit your preferred areas before browsing original sources." : "No home passed both the affordability and allowance filters. Edit your income range or preferred areas, or browse the original source catalog. Yala AD will not invent individual listings."}</p><p className="form-note">Planning budget: {money.format(hub.housingSearch.annualBudgetAed)}/year. {hub.housingSearch.assumptions.join(" ")}</p>{filterOnly ? <button className="secondary-action" type="button" onClick={onClearArea}>Clear area filter</button> : null}<Link className="primary-action" href="/move/profile">Edit my plan</Link><Link className="secondary-action" href="/homes">Review housing sources</Link></div>;
}
function SyntheticBanner() { return <section className="fictional-banner" role="status"><strong>Fictional demo data</strong><span>This route is showing a fictional program or profile for product testing. It is not a real company move, provider filing or government status.</span></section>; }
function isSyntheticContext(person: PersonHub | null, hr: HrView | null, demoMode: boolean) { return demoMode || Boolean(person?.profile.synthetic) || Boolean(hr?.program.synthetic) || Boolean(hr?.organization.synthetic); }
async function copyInviteLink(inviteLink: string, onCopyResult: (notice: Notice) => void) {
  try {
    await navigator.clipboard.writeText(new URL(inviteLink, window.location.origin).toString());
    onCopyResult({ tone: "success", text: "Invite link copied. Share it through your own channel; Yala AD has not sent it." });
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

function SourceLinks({ sources }: { sources: { id: string; publisher: string; title: string; url: string; checkedAt: string; kind?: string; verification?: string }[] }) { return <small className="source-links">{sources.slice(0, 2).map((source, index) => <span key={source.id}>{index > 0 ? " · " : ""}{isInternalSource(source) ? <span className="source-text">{displaySourceName(source.publisher)}</span> : <a href={source.url} target="_blank" rel="noreferrer">{displaySourceName(source.publisher)}</a>} <em>{sourceLabel(source)}</em>, checked {formatDateTime(source.checkedAt)}</span>)}</small>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }
function SectionHead({ label, action }: { label: string; action?: string }) { return <div className="section-head"><h3>{label}</h3>{action ? <span className="count-badge">{action}</span> : null}</div>; }
function StatePanel({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="state-panel"><h3>{title}</h3><p>{text}</p>{action}</div>; }
function EmptyState({ text }: { text: string }) { return <p className="empty-state">{text}</p>; }
function StatusPill({ status }: { status: "On track" | "Needs action" | "Blocked" }) { return <span className="status-pill" data-status={status}>{status}</span>; }
function statusFor(employee?: HrView["employees"][number]): "On track" | "Needs action" | "Blocked" { if (!employee) return "Needs action"; if (employee.blockers.length > 0) return "Blocked"; if (!employee.inviteAccepted || employee.milestones.some((milestone) => milestone.state === "not_started" && milestone.owner === "organization")) return "Needs action"; return "On track"; }
function policyLabel(value: HrView["employees"][number]["housingPolicyFit"]) { if (value === "fits") return "Fits"; if (value === "over_allowance") return "Over allowance"; return "No shortlist"; }

function sectionForScreen(screen: RelocationScreen): WorkspaceSection {
  if (screen === "move-homes") return "homes";
  if (screen === "move-setup") return "setup";
  if (screen === "move-workspaces") return "workspaces";
  if (screen === "move-finance") return "finance";
  if (screen === "move-timeline") return "timeline";
  return "overview";
}

function buildWorkspaceAreas(): WorkspaceArea[] {
  const areas = (catalog as { areas: { id: string; name: string; summary: string; sourceIds: string[] }[] }).areas;
  const guideByArea = readAreaGuideMap();
  return areas.map((area) => {
    const guide = guideByArea.get(area.id);
    const guideOffers = [
      ...(guide?.factualHighlights?.slice(0, 2).map((item) => item.text) ?? []),
      ...(guide?.practicalTips?.slice(0, 1).map((item) => item.text) ?? []),
    ].slice(0, 3);
    return {
      id: area.id,
      name: area.name,
      summary: guide?.shortBlurb ?? customerAreaSummary(area),
      offers: guideOffers.length ? guideOffers : customerAreaOffers(area.sourceIds),
      image: guide?.image ? { src: guide.image.localPath, alt: guide.image.caption, credit: imageCredit(guide.image) } : undefined,
    };
  });
}

function readAreaGuideMap() {
  const raw = areaGuidesJson as { guides?: Record<string, AreaGuide> | AreaGuide[]; areas?: AreaGuide[] } | AreaGuide[];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.areas) ? raw.areas : Array.isArray(raw.guides) ? raw.guides : raw.guides ? Object.values(raw.guides) : [];
  const entries = list
    .map((guide): [string, AreaGuide] => [guide.areaId ?? guide.id ?? "", guide])
    .filter((entry): entry is [string, AreaGuide] => Boolean(entry[0]));
  return new Map<string, AreaGuide>(entries);
}

function imageCredit(image: { photographer?: string; license?: string; caption: string }) {
  return image.photographer && image.license ? `${image.caption} Photo: ${image.photographer}, ${image.license}.` : image.caption;
}

function customerAreaSummary(area: { name: string; sourceIds: string[] }) {
  if (area.sourceIds.some((id) => id.includes("adgm") || id.includes("hub71"))) return `${area.name} works well for ADGM-linked setup and workspace planning.`;
  if (area.sourceIds.some((id) => id.includes("cloudspaces"))) return `${area.name} has a source-linked serviced workspace path to review.`;
  if (area.sourceIds.includes("masdar-city-about")) return `${area.name} is useful for innovation-district research and area preference testing.`;
  return `${area.name} is available as a housing search area before listing-level checks.`;
}

function customerAreaOffers(sourceIds: string[]) {
  const offers = [];
  if (sourceIds.includes("adrec-rental-index")) offers.push("Rental-index benchmark context");
  if (sourceIds.some((id) => id.includes("cloudspaces") || id.includes("wework"))) offers.push("Workspace provider handoff");
  if (sourceIds.some((id) => id.includes("adgm"))) offers.push("ADGM setup/work context");
  if (sourceIds.includes("masdar-city-about")) offers.push("Innovation-district context");
  return offers.length ? offers : ["Area preference for filtered housing"];
}

function roadmapMilestones(hub: PersonHub): RoadmapMilestone[] {
  const order = ["housing", "workspace", "setup", "residence", "insurance", "finance"];
  return order.map((category) => {
    const task = hub.tasks.find((item) => item.category === category);
    const history = sortedEventsForTask(hub.timeline, task?.id);
    const latest = history[0];
    const state = latest?.state ?? task?.state ?? "not_started";
    return {
      key: category,
      category,
      taskId: task?.id ?? "",
      label: category === "housing" ? "Shortlist homes" : category === "workspace" ? "Choose work base" : category === "setup" ? "Open setup route" : category === "residence" ? "Residence steps" : category === "insurance" ? "Insurance cover" : "Finance readiness",
      href: category === "housing" ? "#homes" : category === "workspace" ? "#workspaces" : category === "setup" || category === "residence" || category === "insurance" ? "#setup" : "#budget",
      state,
      status: state === "blocked" ? "blocked" : state === "not_started" ? "next" : "reported",
      latest,
      history,
    };
  });
}

function sortedEventsForTask(events: PersonHub["timeline"], taskId?: string) {
  if (!taskId) return [];
  return events.filter((event) => event.taskId === taskId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function milestoneFallbackText(category: string) {
  if (category === "insurance") return "Review medical insurance as part of the residence setup path; Yala AD will not file it under another task unless a matching provider action exists.";
  if (category === "finance") return "Review financial readiness factors. No bank approval probability is calculated.";
  return "Open a source-backed link or report a blocker when a matching task exists.";
}
function displaySourceName(label: string) { return label.replace(/Bankable/g, "Yala AD"); }
function isInternalSource(source: { id: string; url: string }) { return source.id.includes("calibration") || source.url.startsWith("/") || source.url.startsWith("#"); }
function nextTaskLabel(hub: PersonHub) { return hub.tasks.find((task) => task.state === "blocked")?.title ?? hub.tasks.find((task) => task.state === "not_started")?.title ?? "Review latest step"; }
function nextTaskDetail(hub: PersonHub) { return hub.tasks.find((task) => task.state === "blocked")?.nextAction ?? hub.tasks.find((task) => task.state === "not_started")?.nextAction ?? "Open the roadmap for source, owner and next action."; }

function parsePersonal(form: FormData, preferredArea: string): PersonalValues | string { const incomeMin = parseRequiredMoney(form.get("incomeMin"), "Monthly income (AED)"); if (typeof incomeMin === "string") return incomeMin; const incomeMax = parseOptionalMoney(form.get("incomeMax")); if (typeof incomeMax === "string") return incomeMax; if (incomeMax !== null && incomeMax < incomeMin) return "Upper income range must be greater than or equal to the minimum."; return { displayName: String(form.get("displayName") ?? ""), workType: String(form.get("workType") ?? "employee"), household: String(form.get("household") ?? "single"), incomeMin, incomeMax, preferredAreaIds: preferredArea ? [preferredArea] : [], planningContext: { nationality: String(form.get("nationality") ?? "").trim(), purposeOfMove: String(form.get("purposeOfMove") ?? ""), employmentStatus: String(form.get("employmentStatus") ?? ""), sponsor: String(form.get("sponsor") ?? ""), alreadyInUae: String(form.get("alreadyInUae") ?? ""), documentsAvailable: form.getAll("documentsAvailable").filter((item): item is string => typeof item === "string"), completedSteps: form.getAll("completedSteps").filter((item): item is string => typeof item === "string") } }; }
function parseProgram(form: FormData, hasUaeEntity: boolean): ProgramValues | string { const teamSize = parseRequiredWholeNumber(form.get("teamSize"), "Team size"); if (typeof teamSize === "string") return teamSize; const annualAllowanceAed = parseRequiredMoney(form.get("annualAllowanceAed"), "Annual housing allowance"); if (typeof annualAllowanceAed === "string") return annualAllowanceAed; const moveDate = String(form.get("moveDate") ?? ""); if (!moveDate) return "Move date is required."; return { organizationName: String(form.get("organizationName") ?? ""), hasUaeEntity, jurisdiction: String(form.get("jurisdiction") ?? "adgm"), officeAreaId: toAreaId(String(form.get("officeArea") || "Al Maryah Island")), teamSize, moveDate, annualAllowanceAed }; }
function profileBody(values: PersonalValues) { return { displayName: values.displayName.trim() || "Private mover", workType: values.workType, adults: values.household === "single" ? 1 : 2, children: values.household === "family" ? 1 : 0, minMonthlyAed: values.incomeMin, maxMonthlyAed: values.incomeMax ?? values.incomeMin, preferredAreaIds: values.preferredAreaIds, planningContext: values.planningContext }; }
function parseRequiredMoney(value: FormDataEntryValue | null, label: string) { const text = String(value ?? "").replace(/,/g, "").trim(); const parsed = Number(text); if (!text || !Number.isFinite(parsed) || parsed < 0) return `${label} must be a finite number. Zero is allowed when it is intentional.`; return parsed; }
function parseOptionalMoney(value: FormDataEntryValue | null) { const text = String(value ?? "").replace(/,/g, "").trim(); if (!text) return null; const parsed = Number(text); if (!Number.isFinite(parsed) || parsed < 0) return "Upper income range must be a finite number when provided."; return parsed; }
function parseRequiredWholeNumber(value: FormDataEntryValue | null, label: string) { const parsed = Number(String(value ?? "").trim()); if (!Number.isInteger(parsed) || parsed <= 0) return `${label} must be a whole number greater than zero.`; return parsed; }
function initialInviteParams() { if (typeof window === "undefined") return { inviteId: "", token: "" }; const params = new URLSearchParams(window.location.search); return { inviteId: params.get("inviteId") ?? "", token: params.get("token") ?? "" }; }
function initialAreaParam() { if (typeof window === "undefined") return ""; return new URLSearchParams(window.location.search).get("area") ?? ""; }
function readSavedSession(): SavedSession | null { if (typeof window === "undefined") return null; try { const raw = sessionStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(LEGACY_SESSION_KEY); if (!raw) return null; const parsed = JSON.parse(raw) as SavedSession; if (!sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed)); return parsed; } catch { return null; } }
function clearSavedSession() { if (typeof window !== "undefined") { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(LEGACY_SESSION_KEY); } }
function upsertHub(list: PersonHub[], hub: PersonHub) { return [hub, ...list.filter((item) => item.profile.id !== hub.profile.id)]; }
function upsertToken(list: EmployeeToken[], token: EmployeeToken) { return [token, ...list.filter((item) => item.personId !== token.personId)]; }
function labelState(state: string) { return state.replace(/_/g, " "); }
function allowanceDetail(hub: PersonHub) { return hub.case.programId ? `Allowance cap ${money.format(hub.budget.policyAllowanceAnnualAed)}` : "Private planning cap from income share"; }
function areaLabel(areaId: string) { return areaId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function toAreaId(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "al-maryah-island"; }
function formatShortDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AE", { day: "numeric", month: "short" }).format(date); }
function formatDateTime(value: string) { if (!value) return "unknown"; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat("en-AE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); }
