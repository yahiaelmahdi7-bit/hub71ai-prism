/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { areaDirectory } from "@/components/relocation-directories";
import { HouseNav } from "@/components/house/HouseNav";

export default function AreasPage() {
  return <main className="min-h-screen"><HouseNav /><section className="landing-hero compact-info area-hero"><p className="kicker">Areas directory</p><h1>Choose an Abu Dhabi base with the facts beside it.</h1><p className="lead">Area guides are practical starting points. Yala AD still filters homes by affordability and company allowance before ranking anything for a private move.</p></section><section className="area-card-grid">{areaDirectory.map((area) => <Link className="area-card" href={`/areas/${area.id}`} key={area.id}><figure><img src={area.image.src} alt={area.image.alt} /><figcaption title={area.image.credit}>{cardCredit(area.image.credit)}</figcaption></figure><div><span className="section-label">{area.bestFor[0]}</span><h2>{area.name}</h2><p>{area.summary}</p><ul>{area.highlights.slice(0, 2).map((highlight) => <li key={highlight}>{highlight}</li>)}</ul></div></Link>)}</section></main>;
}

// Card chip: "Photo: <name> · <licence>"; stand-in photos say so. Full caption stays in the title and on the area page.
function cardCredit(credit: string) {
  const short = credit.split(" · ").filter((part) => part.startsWith("Photo:") || part.startsWith("CC ")).join(" · ") || credit;
  return /not claimed/i.test(credit) ? `Context photo · ${short}` : short;
}
