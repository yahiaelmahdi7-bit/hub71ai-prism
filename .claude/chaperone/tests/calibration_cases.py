"""Labelled edit pairs for calibrating the chaperone grey zone.

Each case = (file, distance_lines, edit_b old, edit_b new, claim_a region text (agent A's in-flight region),
purpose of A, label). label 1 = CONFLICT (B's edit changes something A's region depends on, or would clash
textually / break A's change), 0 = COMPATIBLE (nearby or same component, but independent).
Labels are by semantic judgement of a human reading the pair, written before any Jev run.
Run: python3 calibration_cases.py  -> writes calibration_cases.jsonl
"""
import json
import os

C = []


def case(f, d, old, new, claim, purpose, label):
    C.append({"state": {"file": f, "distance_lines": d,
                        "edit_b": {"old": old, "new": new},
                        "claim_a": {"region_text": claim, "purpose": purpose}}, "label": label})


# ---------------- CONFLICT: renamed props / changed types / signatures used by A
case("app/page.tsx", 6, "function Card({ title, price }: CardProps) {", "function Card({ name, cost }: CardProps) {",
     "<Card title={p.title} price={p.price} />", "render product cards on the home page", 1)
case("lib/types.ts", 4, "export type Loan = { id: string; amount: number; apr: number };",
     "export type Loan = { id: string; principal: number; apr: number };",
     "const total = loans.reduce((s, l) => s + l.amount, 0);", "compute total of all loans", 1)
case("components/Hero.tsx", 3, "interface HeroProps { heading: string; cta: string }",
     "interface HeroProps { heading: string; cta: string; onCta: () => void }",
     "export default function Page() {\n  return <Hero heading=\"Bankable\" cta=\"Start\" />;\n}", "build landing page", 1)
case("lib/api.ts", 8, "export async function getUser(id: string): Promise<User> {",
     "export async function getUser(id: string, token: string): Promise<User> {",
     "const u = await getUser(session.userId);", "load the current user in the dashboard", 1)
case("app/globals.css", 5, "--color-primary: #0a7;", "--brand: #0a7;",
     ".btn { background: var(--color-primary); color: white; }", "style the primary button", 1)
case("lib/format.ts", 2, "export function formatMoney(n: number): string {", "export function money(n: number): string {",
     "const label = formatMoney(loan.amount);", "show loan amount label", 1)
case("components/Table.tsx", 7, "type Row = { id: string; name: string };", "type Row = { id: number; name: string };",
     "const byId = new Map<string, Row>(rows.map(r => [r.id, r]));", "index rows by id", 1)
case("app/page.tsx", 10, "const [loans, setLoans] = useState<Loan[]>([]);", "const [items, setItems] = useState<Loan[]>([]);",
     "useEffect(() => { fetchLoans().then(setLoans); }, []);", "fetch loans on mount", 1)
case("lib/hooks.ts", 3, "export function useLoans(userId: string) {", "export function useLoans(opts: { userId: string }) {",
     "const { data } = useLoans(user.id);", "list user loans", 1)
case("components/Nav.tsx", 4, "export const links = [{ href: '/', label: 'Home' }];",
     "export const navItems = [{ href: '/', label: 'Home' }];",
     "{links.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}", "render nav links", 1)
case("app/api/score/route.ts", 5, "return NextResponse.json({ score });", "return NextResponse.json({ result: { score } });",
     "const { score } = await res.json();", "client reads score from api", 1)
case("lib/types.ts", 2, "export interface Account { iban: string; owner: string }",
     "export interface Account { iban: string; owner: { name: string } }",
     "<p>{account.owner.toUpperCase()}</p>", "render account owner", 1)
case("components/Form.tsx", 6, "const schema = z.object({ email: z.string(), amount: z.number() });",
     "const schema = z.object({ email: z.string(), amount: z.string() });",
     "const parsed = schema.parse(data); total += parsed.amount * 2;", "sum submitted amounts", 1)
case("app/page.tsx", 9, "export default function Page() {", "export default async function Page() {",
     "const router = useRouter();\n  const go = () => router.push('/apply');", "add client-side navigation hook in Page", 1)
case("tailwind.config.ts", 3, "colors: { brand: '#0a7' },", "colors: { primary: '#0a7' },",
     "<div className=\"bg-brand text-white\">", "use brand colour on banner", 1)
case("lib/db.ts", 5, "export const TABLE = 'loans';", "export const TABLE = 'credit_lines';",
     "const rows = await sql`select * from loans where id = ${id}`;", "query loan by id", 1)
case("components/Modal.tsx", 4, "export function Modal({ open, onClose }: Props) {", "export function Modal({ isOpen, onClose }: Props) {",
     "<Modal open={show} onClose={() => setShow(false)}>", "wire modal to state", 1)
case("lib/utils.ts", 12, "export const MAX_LOAN = 5000;", "export const MAX_LOAN = 500;",
     "if (amount > MAX_LOAN) return { error: 'too large' };\n// tests assert 4999 is accepted", "validate loan amount", 1)
case("components/Chart.tsx", 3, "const data = points.map(p => ({ x: p.t, y: p.v }));",
     "const data = points.map(p => ({ t: p.t, v: p.v }));",
     "<Line dataKey=\"y\" xKey=\"x\" data={data} />", "configure the line chart", 1)
case("app/layout.tsx", 5, "<body className={inter.className}>{children}</body>", "<body className={inter.className}><Providers>{children}</Providers></body>",
     "<body className={inter.className}>{children}<Toaster /></body>", "add toast container to layout", 1)
case("app/page.tsx", 2, "<h1 className=\"text-4xl\">Bankable</h1>", "<h1 className=\"text-5xl font-bold\">Bankable</h1>",
     "<h1 className=\"text-4xl tracking-tight\">Bankable</h1>", "tighten the hero heading", 1)
case("package.json", 1, "\"next\": \"15.0.0\",", "\"next\": \"15.1.0\",", "\"next\": \"15.0.3\",", "patch next version", 1)
case("lib/store.ts", 3, "export const useStore = create<State>((set) => ({ count: 0 }));",
     "export const useStore = create<State>((set) => ({ count: 0, loans: [] }));",
     "export const useStore = create<State>((set) => ({ count: 0, user: null }));", "add user to the store", 1)
case("components/Card.tsx", 8, "export default function Card({ children }: { children: React.ReactNode }) {",
     "export default function Card({ children, tone }: { children: React.ReactNode; tone: 'a' | 'b' }) {",
     "<Card><Stat label=\"APR\" value={apr} /></Card>", "use Card in the stats row", 1)
case("lib/types.ts", 5, "export type Status = 'open' | 'closed';", "export type Status = 'draft' | 'open' | 'closed';",
     "const label: Record<Status, string> = { open: 'Open', closed: 'Closed' };", "label map for statuses", 1)
case("app/globals.css", 1, ".card { padding: 1rem; }", ".card { padding: 2rem; border: 1px solid var(--line); }",
     ".card { padding: 1.5rem; border-radius: 12px; }", "round the card corners", 1)
case("app/dashboard/page.tsx", 4, "const rate = loan.apr / 100;", "const rate = loan.apr;",
     "const interest = principal * (loan.apr / 100) * years;", "interest calculation", 1)
case("components/Button.tsx", 6, "variant?: 'solid' | 'ghost';", "variant: 'solid' | 'ghost' | 'danger';",
     "<Button>Apply</Button>", "add apply button", 1)
case("lib/openai.ts", 3, "export async function score(text: string): Promise<number> {",
     "export async function score(text: string): Promise<{ value: number }> {",
     "const s: number = await score(note);\nif (s > 0.7) flag();", "flag risky notes", 1)
case("lib/types.ts", 2, "export type User = { id: string; email: string };", "export type User = { id: string; contact: { email: string } };",
     "sendMail(user.email, subject);", "send welcome mail", 1)

# ---------------- COMPATIBLE: near / same component but independent
case("app/page.tsx", 10, "<footer className=\"py-8\">© Bankable</footer>", "<footer className=\"py-8 text-sm\">© Bankable 2026</footer>",
     "<section className=\"hero\"><h1>Bankable</h1><p>Credit for everyone</p></section>", "write hero copy", 0)
case("app/page.tsx", 12, "function formatDate(d: Date) { return d.toISOString().slice(0, 10); }",
     "function formatDate(d: Date) { return d.toLocaleDateString('en-GB'); }",
     "function sumLoans(loans: Loan[]) { return loans.reduce((s, l) => s + l.amount, 0); }", "total loans helper", 0)
case("components/Hero.tsx", 5, "{isMobile ? <MobileCta /> : null}", "{isMobile ? <MobileCta compact /> : null}",
     "{!isMobile && <DesktopCta href=\"/apply\" />}", "desktop cta branch", 0)
case("components/Hero.tsx", 3, "{error && <p className=\"text-red-600\">{error}</p>}", "{error && <p role=\"alert\" className=\"text-red-600\">{error}</p>}",
     "{loading && <Spinner size=\"lg\" />}", "add loading spinner branch", 0)
case("app/globals.css", 9, ":root { --space-2: 0.5rem; }", ":root { --space-2: 0.5rem; --space-3: 0.75rem; }",
     ":root { --color-bg: #fafafa; --color-fg: #111; }", "colour tokens", 0)
case("app/globals.css", 14, ".btn-ghost { background: transparent; }", ".btn-ghost { background: transparent; border: 1px solid currentColor; }",
     ".btn { background: var(--color-primary); color: white; }", "style primary button", 0)
case("app/globals.css", 4, "body { font-family: var(--font-sans); }", "body { font-family: var(--font-sans); line-height: 1.5; }",
     ".card { padding: 1rem; border-radius: 8px; }", "card styling", 0)
case("app/page.tsx", 2, "import { useState } from 'react';", "import { useState, useMemo } from 'react';",
     "import Link from 'next/link';", "add a link import", 0)
case("app/page.tsx", 3, "import { formatMoney } from '@/lib/format';", "import { formatMoney, formatPct } from '@/lib/format';",
     "import { Card } from '@/components/Card';", "import card component", 0)
case("components/Table.tsx", 11, "<th className=\"text-left\">Name</th>", "<th className=\"text-left\">Borrower</th>",
     "<td className=\"font-mono\">{formatMoney(r.amount)}</td>", "monospace amounts", 0)
case("lib/api.ts", 14, "export async function listLoans(): Promise<Loan[]> { return get('/loans'); }",
     "export async function listLoans(): Promise<Loan[]> { return get('/loans?limit=50'); }",
     "export async function getUser(id: string): Promise<User> { return get(`/users/${id}`); }", "user fetcher", 0)
case("lib/api.ts", 9, "const BASE = process.env.API_URL ?? 'http://localhost:3000';", "const BASE = process.env.API_URL ?? 'http://localhost:4000';",
     "export async function createLoan(b: NewLoan) { return post('/loans', b); }", "create loan call", 0)
case("components/Form.tsx", 8, "<label htmlFor=\"email\">Email</label>", "<label htmlFor=\"email\">Work email</label>",
     "<input id=\"amount\" type=\"number\" min={100} max={5000} />", "amount input limits", 0)
case("components/Form.tsx", 4, "const [email, setEmail] = useState('');", "const [email, setEmail] = useState(user?.email ?? '');",
     "const [amount, setAmount] = useState(500);", "default amount", 0)
case("app/dashboard/page.tsx", 13, "<h2 className=\"text-xl\">Overview</h2>", "<h2 className=\"text-2xl\">Overview</h2>",
     "<TransactionList items={txs} limit={10} />", "limit transactions", 0)
case("app/dashboard/page.tsx", 8, "const title = 'Dashboard';", "const title = 'Your dashboard';",
     "const rate = loan.apr / 100;", "rate helper", 0)
case("components/Nav.tsx", 6, "<a href=\"/help\">Help</a>", "<a href=\"/support\">Support</a>",
     "<a href=\"/apply\" className=\"btn\">Apply</a>", "apply link", 0)
case("components/Card.tsx", 10, "<p className=\"muted\">{subtitle}</p>", "<p className=\"muted text-sm\">{subtitle}</p>",
     "<h3 className=\"font-semibold\">{title}</h3>", "bold card title", 0)
case("lib/utils.ts", 15, "export const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);",
     "export const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);",
     "export const slug = (s: string) => s.toLowerCase().replace(/\\s+/g, '-');", "slug helper", 0)
case("lib/utils.ts", 12, "export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));",
     "export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));",
     "export const isEmail = (s: string) => /^[^@]+@[^@]+$/.test(s);", "email validator", 0)
case("lib/types.ts", 12, "export type Currency = 'USD' | 'EUR';", "export type Currency = 'USD' | 'EUR' | 'GBP';",
     "export interface Merchant { id: string; name: string }", "add merchant type", 0)
case("lib/types.ts", 7, "export type Loan = { id: string; amount: number };", "export type Loan = { id: string; amount: number; apr: number };",
     "export type Offer = { id: string; term: number };", "offer type", 0)
case("app/api/score/route.ts", 14, "export const runtime = 'nodejs';", "export const runtime = 'nodejs';\nexport const maxDuration = 30;",
     "const body = await req.json();\nconst text = String(body.text ?? '');", "parse request body", 0)
case("app/api/score/route.ts", 6, "return NextResponse.json({ ok: true, score });", "return NextResponse.json({ ok: true, score, at: Date.now() });",
     "if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });", "empty-input check", 0)
case("components/Chart.tsx", 11, "<XAxis dataKey=\"x\" tick={{ fontSize: 12 }} />", "<XAxis dataKey=\"x\" tick={{ fontSize: 11 }} />",
     "<Tooltip formatter={(v) => formatMoney(Number(v))} />", "tooltip format", 0)
case("components/Modal.tsx", 9, "<button onClick={onClose} aria-label=\"Close\">×</button>", "<button onClick={onClose} aria-label=\"Close dialog\">×</button>",
     "<div className=\"modal-body\">{children}</div>", "modal body padding", 0)
case("tailwind.config.ts", 12, "fontFamily: { sans: ['Inter', 'sans-serif'] },", "fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },",
     "colors: { brand: '#0a7', accent: '#f60' },", "add accent colour", 0)
case("tailwind.config.ts", 3, "content: ['./app/**/*.{ts,tsx}'],", "content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],",
     "plugins: [require('@tailwindcss/forms')],", "forms plugin", 0)
case("package.json", 6, "\"dev\": \"next dev\",", "\"dev\": \"next dev --turbo\",", "\"lint\": \"next lint\",", "add lint script", 0)
case("package.json", 9, "\"zod\": \"^3.23.0\",", "\"zod\": \"^3.24.0\",", "\"recharts\": \"^2.12.0\",", "add recharts dependency", 0)
case("lib/store.ts", 10, "export const selectLoans = (s: State) => s.loans;", "export const selectLoans = (s: State) => s.loans.filter(l => !l.archived);",
     "export const selectUser = (s: State) => s.user;", "user selector", 0)
case("lib/hooks.ts", 14, "export function useDebounce<T>(v: T, ms = 300) {", "export function useDebounce<T>(v: T, ms = 250) {",
     "export function useMedia(q: string) { return window.matchMedia(q).matches; }", "media hook", 0)
case("app/layout.tsx", 12, "export const metadata = { title: 'Bankable' };", "export const metadata = { title: 'Bankable', description: 'Credit' };",
     "const inter = Inter({ subsets: ['latin'] });", "font setup", 0)
case("app/page.tsx", 14, "{loans.length === 0 && <EmptyState />}", "{loans.length === 0 && <EmptyState cta=\"Apply now\" />}",
     "<ul>{loans.map(l => <li key={l.id}>{l.id}</li>)}</ul>", "list loans", 0)
case("components/Table.tsx", 2, "const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));",
     "const sorted = [...rows].sort((a, b) => b.name.localeCompare(a.name));",
     "const total = rows.length;", "row count label", 0)
case("lib/db.ts", 13, "const pool = new Pool({ max: 5 });", "const pool = new Pool({ max: 10 });",
     "export async function getLoan(id: string) { return sql`select * from loans where id = ${id}`; }", "get loan query", 0)
case("components/Hero.tsx", 6, "<img src=\"/hero.png\" alt=\"\" className=\"w-full\" />", "<img src=\"/hero.webp\" alt=\"\" className=\"w-full\" />",
     "<h1 className=\"text-5xl\">Bankable</h1>", "hero heading size", 0)
case("app/dashboard/page.tsx", 15, "export const dynamic = 'force-dynamic';", "export const revalidate = 0;",
     "<StatRow items={[{ label: 'APR', value: apr }]} />", "stat row", 0)
case("components/Card.tsx", 1, "className=\"card\"", "className=\"card shadow-sm\"", "className=\"card-title\"", "title class", 0)
case("lib/format.ts", 8, "export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;", "export const pct = (n: number) => `${(n * 100).toFixed(2)}%`;",
     "export const dateFmt = (d: Date) => d.toLocaleDateString('en-GB');", "date formatter", 0)

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "calibration_cases.jsonl"), "w") as f:
        for c in C:
            f.write(json.dumps(c) + "\n")
    print(len(C), "cases;", sum(c["label"] for c in C), "conflict /", sum(1 - c["label"] for c in C), "compatible")
