import Link from "next/link";
import { setupDirectory } from "@/components/relocation-directories";
import { HouseNav } from "@/components/house/HouseNav";

export default function SetupPage() {
  return <main className="min-h-screen"><HouseNav /><section className="landing-hero compact-info"><p className="kicker">Official setup directory</p><h1>Mainland, ADGM and KEZAD stay separate.</h1><p className="lead">Choose the legal route before opening an official handoff. Yala AD records opened links; filings and approvals belong to the provider.</p></section><section className="directory-grid">{setupDirectory.map((route) => <Link className="directory-card" href={`/setup/${route.id}`} key={route.id}><span className="section-label">{route.authority}</span><h2>{route.name}</h2><p>{route.next}</p></Link>)}</section></main>;
}
