import Image from "next/image";

// Yala AD ribbon mark (public/brand/yala-ad-mark.png, 631x675). Decorative: the "Yala AD" text beside it carries the name.
export function BrandMark({ className }: { className?: string }) {
  return <Image className={className} src="/brand/yala-ad-mark.png" alt="" aria-hidden="true" width={28} height={30} />;
}
