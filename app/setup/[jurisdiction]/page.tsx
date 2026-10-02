import Link from "next/link";
import { notFound } from "next/navigation";
import { setupDirectory } from "@/components/relocation-directories";

export default async function SetupDetailPage({ params }: { params: Promise<{ jurisdiction: string }> }) {
  const { jurisdiction } = await params;
  const route = setupDirectory.find((item) => item.id === jurisdiction);
  if (!route) notFound();
  return <main className="min-h-screen"><Header /><section className="landing-hero compact-info"><p className="kicker">Official setup handoff</p><h1>{route.name}</h1><p className="lead">{route.next}</p><div className="hero-actions"><Link className="primary-action" href="/move/setup">Start tracking inside my move</Link><a href={route.url} target="_blank" rel="noreferrer">Open source page</a><Link href={`/company?jurisdiction=${encodeURIComponent(route.id)}`}>Use for company move</Link></div></section><section className="plain-panel info-panel"><h2>{route.authority}</h2><p>Public setup pages explain the route only. Create or open a move hub before Bankable records an opened handoff; submissions, bookings, approvals and official status remain with the provider.</p><p className="form-note"><a href={route.url} target="_blank" rel="noreferrer">{route.source}</a></p></section></main>;
}
function Header() { return <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">B</span><span>Bankable</span></Link><nav><Link href="/setup">Setup</Link><Link href="/company/dashboard">HR dashboard</Link><Link href="/join">Join</Link></nav></header>; }
