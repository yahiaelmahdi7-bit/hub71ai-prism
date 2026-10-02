import Link from "next/link";
import { ParallaxHero } from "./ParallaxHero";
import { AmbientVideo } from "./AmbientVideo";
import { ProviderShowcase } from "./ProviderShowcase";
import styles from "./landing.module.css";

const paths = [
  { href: "/move", number: "01", title: "I’m moving", detail: "Find a home, a work base, and the right setup path for your life here.", action: "Plan my move" },
  { href: "/join", number: "02", title: "I’m joining a team", detail: "Join your company’s move while your personal details stay yours.", action: "Join a move" },
  { href: "/company", number: "03", title: "I’m moving my team", detail: "Give every person a private plan and see the progress your team can share.", action: "Plan for my team" },
] as const;

const pillars = [
  { number: "01", title: "Find your place", detail: "Explore areas and homes, then create a shortlist that fits your budget.", href: "/areas" },
  { number: "02", title: "Set up your life", detail: "See the official mainland, ADGM, and KEZAD setup routes.", href: "/setup" },
  { number: "03", title: "Know your numbers", detail: "Understand housing rules before you choose a property.", href: "/homes" },
  { number: "04", title: "Follow every step", detail: "Keep opened links, reported updates, blockers, and next actions together.", href: "/move" },
] as const;

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Bankable home"><span className={styles.brandMark}>B</span>Bankable</Link>
        <nav className={styles.nav} aria-label="Primary navigation"><a href="#paths">Start</a><a href="#providers">Providers</a><a href="#explore">Explore</a><a href="#teams">For teams</a></nav>
        <Link className={styles.headerCta} href="/start">Get started <span aria-hidden="true">↗</span></Link>
      </header>

      <ParallaxHero>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Bankable / Abu Dhabi</p>
          <h1 id="hero-title">Your move to Abu Dhabi, <em>made clear.</em></h1>
          <p className={styles.intro}>Find a home. Understand the costs. Follow the setup. Keep every next step in view.</p>
          <div className={styles.heroActions}><a className={styles.primary} href="#paths">Choose your path <span aria-hidden="true">→</span></a><Link className={styles.secondary} href="/company/dashboard">See the team view <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className={styles.heroRoutes} aria-label="Choose a route">
          <span>Begin with</span>
          {paths.map((path) => <Link href={path.href} key={path.href}>{path.title} <span aria-hidden="true">↗</span></Link>)}
        </div>
      </ParallaxHero>

      <section className={styles.paths} id="paths" aria-labelledby="paths-title">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Start here</p><h2 id="paths-title">Which move is yours?</h2></div><p>Choose one path. Your plan can grow as you learn more.</p></div>
        <div className={styles.pathGrid}>{paths.map((path) => <Link className={styles.pathCard} href={path.href} key={path.href}><span className={styles.number}>{path.number} / 03</span><h3>{path.title}</h3><p>{path.detail}</p><span className={styles.pathAction}>{path.action} <span aria-hidden="true">↗</span></span></Link>)}</div>
      </section>

      <ProviderShowcase />

      <section className={styles.explore} id="explore" aria-labelledby="explore-title">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>One connected plan</p><h2 id="explore-title">The pieces, in one place.</h2></div><Link className={styles.secondary} href="/move">Explore the move hub <span aria-hidden="true">↗</span></Link></div>
        <div className={styles.pillarGrid}>{pillars.map((pillar) => <Link className={styles.pillar} href={pillar.href} key={pillar.number}><span className={styles.number}>{pillar.number} <span aria-hidden="true">↗</span></span><h3>{pillar.title}</h3><p>{pillar.detail}</p></Link>)}</div>
        <AmbientVideo />
      </section>

      <section className={styles.teams} id="teams" aria-labelledby="teams-title"><div><p className={styles.eyebrow}>For employers</p><h2 id="teams-title">A team move should still feel personal.</h2></div><div><p>Set the policy once, invite your people, and see permitted progress without opening their private finances or identity evidence.</p><Link href="/company">Start a team move <span aria-hidden="true">↗</span></Link></div></section>
      <footer className={styles.footer}><span>Bankable · Abu Dhabi</span><span>Real actions, clear status, sources beside the facts.</span><Link href="/start">Get started ↑</Link></footer>
    </main>
  );
}
