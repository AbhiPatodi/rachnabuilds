"use client";

import { useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SiteNav({ whatsappNumber = "919404643510" }: { whatsappNumber?: string }) {
  useEffect(() => {
    // Theme toggle
    const html = document.documentElement;
    const toggle = document.getElementById("siteThemeToggle") as HTMLButtonElement;
    const saved = localStorage.getItem("theme");
    if (saved) html.setAttribute("data-theme", saved);
    if (toggle) {
      const updateIcon = (theme: string) => {
        toggle.innerHTML =
          theme === "light"
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
      };
      const currentTheme = html.getAttribute("data-theme") || "dark";
      updateIcon(currentTheme);
      toggle.addEventListener("click", () => {
        const current = html.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", next);
        localStorage.setItem("theme", next);
        updateIcon(next);
      });
    }

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
            <span className="logo-mark">
              <svg viewBox="0 0 64 72" fill="none">
                <rect width="11" height="72" fill="currentColor" />
                <rect width="42" height="11" fill="currentColor" />
                <path d="M42 0Q64 0 64 16Q64 32 42 32" stroke="currentColor" strokeWidth="11" fill="none" />
                <rect y="27" width="38" height="11" fill="currentColor" />
                <path d="M36 38L64 72" stroke="currentColor" strokeWidth="11" strokeLinecap="square" />
                <path className="la" d="M36 38L64 72" strokeWidth="4" strokeLinecap="square" />
                <rect className="la" x="30" y="32" width="14" height="14" transform="rotate(-45 37 39)" />
              </svg>
            </span>
            <span className="logo-text">
              <span className="ln">Rachna</span>
              <span className="lb">Builds</span>
            </span>
          </Link>
          <div className="nav-mid">
            <Link href="/#work">Work</Link>
            <Link href="/#services">Services</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/#contact">Contact</Link>
          </div>
          <div className="nav-actions">
            <button className="theme-toggle" id="siteThemeToggle" aria-label="Toggle theme">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener" className="nav-cta">
              Let&apos;s Talk
            </a>
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
        <Link href="/blog" className="ml">Blog</Link>
        <Link href="/#contact" className="ml">Contact</Link>
        <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener" className="ml">Let&apos;s Talk</a>
      </div>
    </>
  );
}
