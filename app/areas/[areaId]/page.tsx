/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { areaDirectory } from "@/components/relocation-directories";
import { HouseNav } from "@/components/house/HouseNav";
import { ReadingCarousel } from "@/components/ReadingCarousel";

export default async function AreaDetailPage({ params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = await params;
  const area = areaDirectory.find((item) => item.id === areaId);
  if (!area) notFound();
  return <main className="min-h-screen"><HouseNav /><section className="area-detail-hero"><figure><img src={area.image.src} alt={area.image.alt} /><figcaption>{area.image.credit}</figcaption></figure><div><p className="kicker">Area guide</p><h1>{area.name}</h1><p className="lead">{area.summary}</p><div className="hero-actions"><Link className="primary-action" href={`/move?area=${encodeURIComponent(area.id)}`}>Use in my move</Link><Link className="secondary-action" href="/homes">View housing approach</Link></div></div></section><ReadingCarousel label={`${area.name} area guide`} slides={[{ title: "Practical fit", body: <ul className="check-list">{area.bestFor.map((item) => <li key={item}>{item}</li>)}</ul> }, { title: "What to do next", body: <ul className="check-list">{area.practicalActions.map((item) => <li key={item}>{item}</li>)}</ul> }, { title: "Useful facts", body: <ul className="check-list">{area.highlights.map((item) => <li key={item}>{item}</li>)}</ul> }, { title: "Limits", body: <ul className="check-list">{area.caveats.map((item) => <li key={item}>{item}</li>)}</ul> }]} /><section className="plain-panel info-panel"><h2>Sources</h2><SourceList sources={area.sources} /></section></main>;
}
function SourceList({ sources }: { sources: { id: string; publisher: string; title: string; url: string; checkedAt: string; verification?: string }[] }) { return <ul className="check-list">{sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher}: {source.title}</a> · {source.verification === "search_only" ? "search result only" : source.verification === "access_blocked" ? "source unavailable" : "opened source"} · checked {source.checkedAt}</li>)}</ul>; }
