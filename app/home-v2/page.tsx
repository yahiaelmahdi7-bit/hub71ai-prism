import Link from "next/link";
import { HouseNav } from "@/components/house/HouseNav";
import { ProviderLogo } from "@/components/ProviderLogo";
import { areaDirectory, setupDirectory } from "@/components/relocation-directories";
import { AreasLive, BudgetLive, SetupLive, StepsLive } from "@/components/LivePieces";
import { DoorHero } from "./DoorHero";
import styles from "./home.module.css";

const paths = [
  { href: "/move", title: "I’m moving", detail: "Find a home, a work base, and the right setup path for your life here.", action: "Plan my move" },
  { href: "/join", title: "I’m joining a team", detail: "Join your company’s move while your personal details stay yours.", action: "Join a move" },
  { href: "/company", title: "I’m moving my team", detail: "Give every person a private plan and see the progress your team can share.", action: "Plan for my team" },
];

const sources = [
  { name: "Property Finder", kind: "Homes", href: "/homes", x: "2%", y: "34%", tilt: "-10deg" },
  { name: "TAMM", kind: "Mainland services", href: "/setup/mainland", x: "34%", y: "8%", tilt: "7deg" },
  { name: "ADGM", kind: "Business setup", href: "/setup/adgm", x: "64%", y: "26%", tilt: "11deg" },
  { name: "KEZAD", kind: "Free zone setup", href: "/setup/kezad", x: "22%", y: "66%", tilt: "-8deg" },
  { name: "ADIB", kind: "Banking", href: "/move/finance", x: "60%", y: "62%", tilt: "6deg" },
];

const steps = ["Link opened", "Update reported", "Next action"];

export const metadata = { title: "Yala AD | Arrive in Abu Dhabi knowing what comes next" };

export default function HomeV2() {
  const areas = areaDirectory.slice(0, 3);
  const setups = setupDirectory.slice(0, 3);

  return (
    <>
      <HouseNav />
      <main className={styles.page}>
        <DoorHero />

        <section className={`house-container ${styles.section}`} aria-labelledby="paths-title">
          <header className={styles.head}>
            <h2 id="paths-title">Which move is yours?</h2>
            <p>Pick one. Your plan grows as you learn more.</p>
          </header>
          <div className={styles.paths}>
            {paths.map((path, index) => (
              <Link key={path.href} className={`house-tile ${styles.path}`} href={path.href}>
                <span className="house-meta">{String(index + 1).padStart(2, "0")}</span>
                <h3>{path.title}</h3>
                <p>{path.detail}</p>
                <span className={styles.action}>{path.action} <i aria-hidden="true">→</i></span>
              </Link>
            ))}
          </div>
        </section>

        <section className={`house-container ${styles.section}`} aria-labelledby="pieces-title">
          <header className={styles.head}>
            <h2 id="pieces-title">The pieces, in one place.</h2>
            <p>Each part links to its source, so you can check it yourself.</p>
          </header>
          <div className={styles.bento}>
            <Link className={`house-tile ${styles.bentoTile} ${styles.wide}`} href="/areas">
              <div className={styles.specimen} aria-hidden="true">
                <AreasLive areas={areas.map((area) => ({ id: area.id, name: area.name, note: area.mood ?? area.bestFor[0] ?? "" }))} />
              </div>
              <div className={styles.copy}>
                <h3>Find your place</h3>
                <p>Compare areas by what daily life looks like.</p>
              </div>
            </Link>
            <Link className={`house-tile ${styles.bentoTile} ${styles.narrow}`} href="/setup">
              <div className={styles.specimen} aria-hidden="true">
                <SetupLive setups={setups.map((setup) => ({ id: setup.id, label: setup.name.split(" ")[0], authority: setup.authority }))} />
              </div>
              <div className={styles.copy}>
                <h3>Set up your life</h3>
                <p>See the setup route that fits your situation.</p>
              </div>
            </Link>
            <Link className={`house-tile ${styles.bentoTile} ${styles.narrow}`} href="/homes">
              <div className={styles.specimen} aria-hidden="true">
                <BudgetLive />
              </div>
              <div className={styles.copy}>
                <h3>Know your numbers</h3>
                <p>Homes sorted by what fits inside your budget.</p>
              </div>
            </Link>
            <Link className={`house-tile ${styles.bentoTile} ${styles.wide}`} href="/move">
              <div className={styles.specimen} aria-hidden="true">
                <StepsLive steps={steps} />
              </div>
              <div className={styles.copy}>
                <h3>Follow every step</h3>
                <p>Each step of the move stays in one plan.</p>
              </div>
            </Link>
          </div>
        </section>

        <section className={`house-container ${styles.section}`} aria-labelledby="sources-title">
          <div className={styles.doors}>
            <div className={styles.doorsCopy}>
              <p className="house-eyebrow">Find the right door</p>
              <h2 id="sources-title">Your move meets the services that matter.</h2>
              <p>Housing sources and official setup routes, from one clear starting point.</p>
              <Link className="house-pill house-pill--accent" href="/start">Explore the routes <span aria-hidden="true">↗</span></Link>
              <small className="house-meta">Yala AD links you to these sources. Each provider handles its own steps; none of them is a partner.</small>
            </div>
            <ul className={styles.doorsArt}>
              {sources.map((source) => (
                <li key={source.name} style={{ "--x": source.x, "--y": source.y, "--tilt": source.tilt } as React.CSSProperties}>
                  <Link href={source.href} aria-label={`${source.name}: ${source.kind}`}>
                    <ProviderLogo name={source.name} className={styles.sourceLogo} />
                    {source.name === "TAMM" ? <strong className={styles.sourceName}>TAMM</strong> : null}
                    <span>{source.kind} <span aria-hidden="true">↗</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={`house-container ${styles.section}`} aria-labelledby="teams-title">
          <div className={`house-tile ${styles.teams}`}>
            <h2 id="teams-title">A team move should still feel personal.</h2>
            <div>
              <p>Set the policy once, invite your people, and see the progress they choose to share, without opening their private finances or identity documents.</p>
              <Link className="house-pill house-pill--accent" href="/company">Start a team move</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`house-container ${styles.footerRow}`}>
          <strong>Yala AD · Abu Dhabi</strong>
          <span className="house-meta">Sources sit beside the facts. Demo data is labeled fictional.</span>
          <Link href="/start">Get started</Link>
        </div>
      </footer>
    </>
  );
}
