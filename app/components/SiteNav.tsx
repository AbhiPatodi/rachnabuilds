"use client";

import { useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ThemeToggle } from "./ThemeToggle";

export default function SiteNav({ whatsappNumber = "919404643510" }: { whatsappNumber?: string }) {
  useEffect(() => {
    // Nav scroll
    gsap.registerPlugin(ScrollTrigger);
    const nav = document.getElementById("siteNav");
    if (nav) {
      ScrollTrigger.create({
        trigger: "body",
        start: "50px top",
        onEnter: () => nav.classList.add("scrolled"),
        onLeaveBack: () => nav.classList.remove("scrolled"),
      });
    }

    // Mobile menu
    const burger = document.getElementById("siteBurger") as HTMLButtonElement;
    const mob = document.getElementById("siteMobMenu");
    let isOpen = false;
    if (burger && mob) {
      burger.addEventListener("click", () => {
        isOpen = !isOpen;
        mob.classList.toggle("open", isOpen);
        document.body.style.overflow = isOpen ? "hidden" : "";
        burger.innerHTML = isOpen
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
      });
      mob.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          isOpen = false;
          mob.classList.remove("open");
          document.body.style.overflow = "";
          burger.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
        });
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <>
      <nav id="siteNav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            <img className="logo-img logo-on-dark" src="/branding/rachna-builds-wordmark-on-dark.svg" alt="Rachna Builds" />
            <img className="logo-img logo-on-light" src="/branding/rachna-builds-wordmark.svg" alt="Rachna Builds" />
          </Link>
          <div className="nav-mid">
            <Link href="/#work">Work</Link>
            <Link href="/#services">Services</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/tools">Free Tools</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/free-audit">Free Audit</Link>
          </div>
          <div className="nav-actions">
            <ThemeToggle className="theme-toggle" />
            <Link href="/start" className="nav-cta">
              Start a Project
            </Link>
          </div>
          <button className="burger" id="siteBurger" aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="mob-menu" id="siteMobMenu">
        <Link href="/#work" className="ml">Work</Link>
        <Link href="/#services" className="ml">Services</Link>
        <Link href="/#pricing" className="ml">Pricing</Link>
        <Link href="/tools" className="ml">Free Tools</Link>
        <Link href="/blog" className="ml">Blog</Link>
        <Link href="/free-audit" className="ml">Free Audit</Link>
        <Link href="/start" className="ml" style={{ color: 'var(--accent)', fontWeight: 600 }}>Start a Project</Link>
      </div>
    </>
  );
}
