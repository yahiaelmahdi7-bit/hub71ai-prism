"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/start", label: "Start" },
  { href: "/areas", label: "Areas" },
  { href: "/homes", label: "Homes" },
  { href: "/setup", label: "Setup" },
  { href: "/company", label: "For teams" },
];

export function HouseNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);

  return (
    <header className="house-nav" data-scrolled={scrolled ? "true" : "false"}>
      <Link className="house-nav__brand house-bubble" href="/">
        <BrandMark className="house-nav__mark" />
        <span>Yala AD</span>
      </Link>
      <nav className="house-nav__links house-bubble" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={current(link.href)}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="house-nav__end">
        <Link className="house-pill" href="/move" aria-current={current("/move")}>My move</Link>
        <Link className="house-pill house-pill--accent" href="/start">Get started</Link>
        <button
          className="house-nav__menu house-pill"
          type="button"
          aria-expanded={open}
          aria-controls="house-nav-sheet"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
      </div>
      <div className="house-nav__sheet" id="house-nav-sheet" data-open={open ? "true" : "false"} onClick={() => setOpen(false)}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={current(link.href)}>
            {link.label}
          </Link>
        ))}
        <Link href="/move" aria-current={current("/move")}>My move</Link>
      </div>
    </header>
  );
}
