import Image from "next/image";

const logos = {
  "Property Finder": { src: "/provider-logos/property-finder.svg", width: 96, height: 42 },
  TAMM: { src: "/provider-logos/tamm.jpg", width: 512, height: 512 },
  ADGM: { src: "/provider-logos/adgm-dark.svg", width: 220, height: 53 },
  KEZAD: { src: "/provider-logos/kezad.png", width: 254, height: 59 },
  ADIB: { src: "/provider-logos/adib.svg", width: 154, height: 31 },
} as const;

export function ProviderLogo({ name, className }: { name: string; className?: string }) {
  const logo = logos[name as keyof typeof logos];
  if (!logo) return <strong className={className}>{name}</strong>;

  return (
    <Image
      alt={`${name} logo`}
      className={className}
      src={logo.src}
      width={logo.width}
      height={logo.height}
      unoptimized
    />
  );
}
