import Link from "next/link";
import styles from "./landing.module.css";

const providers = [
  { name: "Property Finder", mark: "PF", kind: "Homes", href: "/homes", className: styles.providerProperty },
  { name: "TAMM", mark: "T", kind: "Mainland services", href: "/setup/mainland", className: styles.providerTamm },
  { name: "ADGM", mark: "ADGM", kind: "Business setup", href: "/setup/adgm", className: styles.providerAdgm },
  { name: "CBUAE", mark: "CBUAE", kind: "Finance factors", href: "/move/finance", className: styles.providerAdib },
  { name: "KEZAD", mark: "KEZAD", kind: "Free zone setup", href: "/setup/kezad", className: styles.providerKezad },
] as const;

export function ProviderShowcase() {
  return (
    <section className={styles.providerSection} id="providers" aria-labelledby="providers-title">
      <div className={styles.providerPanel}>
        <div className={styles.providerCopy}>
          <p className={styles.eyebrow}>Find the right door</p>
          <h2 id="providers-title">Your move meets the services that matter.</h2>
          <p>Explore housing sources, official setup routes, and finance-readiness factors from one clear starting point.</p>
          <Link className={styles.providerCta} href="/start">Explore the routes <span aria-hidden="true">↗</span></Link>
          <small>Bankable links to sources and services. Provider actions stay with each provider.</small>
        </div>
        <div className={styles.providerArt} aria-label="Explore providers and services">
          {providers.map((provider) => (
            <Link className={`${styles.providerTile} ${provider.className}`} href={provider.href} key={provider.name} aria-label={`Explore ${provider.name}: ${provider.kind}`}>
              <span className={styles.providerMark} aria-hidden="true">{provider.mark}</span>
              {provider.mark === provider.name ? null : <span className={styles.providerName}>{provider.name}</span>}
              <span className={styles.providerKind}>{provider.kind} <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
