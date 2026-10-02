import Link from "next/link";
import { ProviderLogo } from "@/components/ProviderLogo";
import styles from "./landing.module.css";

const providers = [
  { name: "Property Finder", mark: "PF", kind: "Homes", href: "/homes", className: styles.providerProperty },
  { name: "TAMM", mark: "T", kind: "Mainland services", href: "/setup/mainland", className: styles.providerTamm },
  { name: "ADGM", mark: "ADGM", logos: ["ADGM", "KEZAD"], kind: "Business setup", href: "/setup", className: styles.providerAdgm },
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
          <small>Yala AD links to sources and services. Provider actions stay with each provider.</small>
        </div>
        <div className={styles.providerArt} aria-label="Explore providers and services">
          {providers.map((provider) => {
            const logos: readonly string[] = "logos" in provider ? provider.logos : [provider.name];
            return (
            <Link className={`${styles.providerTile} ${provider.className}`} href={provider.href} key={provider.name} aria-label={`Explore ${logos.join(" and ")}: ${provider.kind}`}>
              {logos.length > 1 ? (
                <span className={styles.providerLogoStack}>
                  {logos.map((logo) => <ProviderLogo name={logo} className={styles.providerLogo} key={logo} />)}
                </span>
              ) : <ProviderLogo name={provider.name} className={styles.providerLogo} />}
              {provider.name === "TAMM" ? <span className={styles.providerName}>TAMM</span> : null}
              <span className={styles.providerKind}>{provider.kind} <span aria-hidden="true">↗</span></span>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
