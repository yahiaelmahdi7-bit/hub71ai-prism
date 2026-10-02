import Link from "next/link";
import { areaDirectory } from "@/components/relocation-directories";

export default function AreasPage() {
  return <main className="min-h-screen"><Header /><section className="landing-hero compact-info area-hero"><p className="kicker">Areas directory</p><h1>Choose an Abu Dhabi base with the facts beside it.</h1><p className="lead">Area guides are practical starting points. Bankable still filters homes by affordability and company allowance before ranking anything for a private move.</p></section><section className="area-card-grid">{areaDirectory.map((area) => <Link className="area-card" href={`/areas/${area.id}`} key={area.id}><figure><img src={area.image.src} alt={area.image.alt} /><figcaption>{area.image.credit}</figcaption></figure><div><span className="section-label">{area.bestFor[0]}</span><h2>{area.name}</h2><p>{area.summary}</p><ul>{area.highlights.slice(0, 2).map((highlight) => <li key={highlight}>{highlight}</li>)}</ul></div></Link>)}</section></main>;
}
function Header() { return <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">B</span><span>Bankable</span></Link><nav><Link href="/start">Start</Link><Link href="/homes">Homes</Link><Link href="/setup">Setup</Link></nav></header>; }
