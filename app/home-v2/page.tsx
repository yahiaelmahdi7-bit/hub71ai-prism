import Link from "next/link";
import { HouseNav } from "@/components/house/HouseNav";
import { areaDirectory, setupDirectory } from "@/components/relocation-directories";
import { DoorHero } from "./DoorHero";
import styles from "./home.module.css";

const paths = [
  { href: "/move", title: "I’m moving", detail: "Find a home, a work base, and the right setup path for your life here.", action: "Plan my move" },
  { href: "/join", title: "I’m joining a team", detail: "Join your company’s move while your personal details stay yours.", action: "Join a move" },
  { href: "/company", title: "I’m moving my team", detail: "Give every person a private plan and see the progress your team can share.", action: "Plan for my team" },
];

const sources = [
  { name: "Property Finder", kind: "Homes", href: "/homes" },
  { name: "TAMM", kind: "Mainland services", href: "/setup/mainland" },
  { name: "ADGM", kind: "Business setup", href: "/setup/adgm" },
  { name: "KEZAD", kind: "Free zone setup", href: "/setup/kezad" },
];

const steps = ["Link opened", "Update reported", "Next action"];

export const metadata = { title: "Bankable | Arrive in Abu Dhabi knowing what comes next" };

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
              <div className={`${styles.specimen} ${styles.chips}`} aria-hidden="true">
                {areas.map((area, index) => (
                  <span key={area.id} className={styles.chip} style={{ "--i": index } as React.CSSProperties}>
                    <b />{area.name}
                  </span>
                ))}
              </div>
              <div className={styles.copy}>
                <h3>Find your place</h3>
                <p>Compare areas by what daily life looks like.</p>
              </div>
            </Link>
            <Link className={`house-tile ${styles.bentoTile} ${styles.narrow}`} href="/setup">
              <div className={styles.specimen} aria-hidden="true">
                <div className={styles.segmented}>
                  {setups.map((setup, index) => (
                    <span key={setup.id} data-on={index === 0}>{setup.name}</span>
                  ))}
                </div>
              </div>
              <div className={styles.copy}>
                <h3>Set up your life</h3>
                <p>See the setup route that fits your situation.</p>
              </div>
            </Link>
            <Link className={`house-tile ${styles.bentoTile} ${styles.narrow}`} href="/homes">
              <div className={styles.specimen} aria-hidden="true">
                <div className={styles.budget}>
                  <div className={styles.track2}><span /></div>
                  <div className={styles.labels}><span>Fits your budget</span><span>Allowance cap</span></div>
                </div>
              </div>
              <div className={styles.copy}>
                <h3>Know your numbers</h3>
                <p>Homes sorted by what fits inside your budget.</p>
              </div>
            </Link>
            <Link className={`house-tile ${styles.bentoTile} ${styles.wide}`} href="/move">
              <div className={styles.specimen} aria-hidden="true">
                <ol className={styles.timeline}>
                  {steps.map((step, index) => (
                    <li key={step} data-hollow={index === steps.length - 1}><i />{step}</li>
                  ))}
                </ol>
              </div>
              <div className={styles.copy}>
                <h3>Follow every step</h3>
                <p>Each step of the move stays in one plan.</p>
              </div>
            </Link>
          </div>
        </section>

        <section className={`house-container ${styles.section}`} aria-labelledby="sources-title">
          <header className={styles.head}>
            <h2 id="sources-title">Where each step leads</h2>
            <p>Bankable links you to these sources. Each provider handles its own steps; none of them is a partner.</p>
          </header>
          <ul className={styles.sources}>
            {sources.map((source) => (
              <li key={source.name}>
                <Link href={source.href}>
                  <strong>{source.name}</strong>
                  <span className="house-meta">{source.kind}</span>
                </Link>
              </li>
            ))}
          </ul>
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
          <strong>Bankable · Abu Dhabi</strong>
          <span className="house-meta">Sources sit beside the facts. Demo data is labeled fictional.</span>
          <Link href="/start">Get started</Link>
        </div>
      </footer>
    </>
  );
}
