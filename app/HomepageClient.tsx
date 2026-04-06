"use client";

import React, { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type ProjectStat = { label: string; value: string };

export interface HomepageProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  liveUrl?: string | null;
  stats?: ProjectStat[] | null;
  featured: boolean;
  displayOrder: number;
}

export interface HomepageTestimonial {
  id: string;
  clientName: string;
  quote: string;
  projectName?: string | null;
  rating: number;
  displayOrder: number;
}

export interface HomepageFaq {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
}

export interface HomepageStats {
  stat_stores: string;
  stat_delivery: string;
  stat_countries: string;
  stat_pagespeed: string;
  whatsapp_number: string;
  contact_email: string;
  availability_status: string;
  hero_typewriter?: string;
}

export interface HomepageService {
  iconKey: string;
  title: string;
  description: string;
  tags: string[];
  featured?: boolean;
}

export interface HomepageProcessStep {
  num: string;
  day: string;
  title: string;
  desc: string;
}

export interface HomepagePricingTier {
  tier: string;
  amount: string;
  description: string;
  features: string[];
  featured?: boolean;
  popular?: string;
  ctaText?: string;
}

export interface HomepageBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string[];
  publishedAt: Date | null;
}

interface Props {
  projects: HomepageProject[];
  testimonials: HomepageTestimonial[];
  faqs: HomepageFaq[];
  stats: HomepageStats;
  services: HomepageService[];
  processSteps: HomepageProcessStep[];
  marqueeTags: string[];
  pricingTiers: HomepagePricingTier[];
  blogPosts: HomepageBlogPost[];
}

// Map displayOrder index to bento layout classes (matches original hardcoded layout)
const PROJECT_CLASSES = [
  "wide rv rv-d1",
  "rv rv-d2",
  "rv rv-d3",
  "rv rv-d1",
  "wide rv rv-d2",
  "rv rv-d3",
];

// Map displayOrder index to the original image filenames and alt text
const PROJECT_IMAGES: Record<number, { img: string; alt: string; url: string; num: string }> = {
  0: { img: "welevate.jpg", alt: "Welevate Club website", url: "https://welevateclub.com", num: "01" },
  1: { img: "ohlittlewren.jpg", alt: "Oh Little Wren website", url: "https://ohlittlewren.com", num: "02" },
  2: { img: "galatea.jpg", alt: "Galatea website", url: "https://shop.galatea.com", num: "03" },
  3: { img: "revoo.jpg", alt: "Revoo Concept website", url: "https://revooconcept.com", num: "04" },
  4: { img: "mywavex.jpg", alt: "MyWaveX website", url: "https://us.mywavex.com", num: "05" },
  5: { img: "halo.jpg", alt: "Halo Coffee website", url: "https://halo.coffee", num: "06" },
};

// Map displayOrder index to testimonial animation delay classes
const TESTIMONIAL_DELAYS = ["rv-d1", "rv-d2", "rv-d3", "rv-d1", "rv-d2", "rv-d3"];

// Derive tag color classes based on tag content (mirrors original logic)
function tagColor(tag: string): string {
  const lower = tag.toLowerCase();
  if (
    lower.includes("custom") ||
    lower.includes("coral") ||
    lower.includes("speed") ||
    lower.includes("migration") ||
    lower.includes("redesign") ||
    lower.includes("theme dev") ||
    lower.includes("f&b") ||
    lower.includes("e-commerce") ||
    lower.includes("d2c") ||
    lower.includes("subscriptions") ||
    lower.includes("recharge")
  ) {
    return "coral";
  }
  if (
    lower.includes("plus") ||
    lower.includes("multi") ||
    lower.includes("luxury") ||
    lower.includes("ux")
  ) {
    return "purple";
  }
  return "";
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  shopify: (
    <svg width="24" height="24" viewBox="0 0 109.5 124.5" fill="currentColor">
      <path d="M95.865 23.766c-.09-.678-.678-1.017-1.13-1.074-.451-.057-9.6-.171-9.6-.171s-7.635-7.407-8.37-8.143c-.735-.735-2.148-.509-2.712-.339-.056 0-1.469.452-3.899 1.187-.453-1.412-1.245-3.051-2.148-4.689C65.37 5.381 61.47 2.945 56.88 2.888h-.283c-1.3-1.525-2.882-2.205-4.236-2.318-9.996-.452-17.685 7.464-19.834 18.36-5.602 1.73-9.544 2.938-10.053 3.108-3.051.96-3.165 1.074-3.562 3.959-.339 2.148-8.313 64.082-8.313 64.082L71.49 101.1l25.488-5.489s-1.017-71.064-1.113-71.845z" />
    </svg>
  ),
  wordpress: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
  ),
  webflow: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5C6.201 1.5 1.5 6.201 1.5 12S6.201 22.5 12 22.5c1.623 0 2.862-1.312 2.862-2.914 0-.776-.291-1.48-.776-2.012a.94.94 0 0 1-.228-.628c0-.528.432-.96.96-.96h2.133c3.36 0 6.049-2.689 6.049-6.049C23 6.201 18.047 1.5 12 1.5zM5.977 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" /></svg>
  ),
  speed: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
  ),
  email: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" /></svg>
  ),
  ai: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a4 4 0 0 0-4 4c0 2.5 1.5 4 4 6 2.5-2 4-3.5 4-6a4 4 0 0 0-4-4z" />
      <path d="M12 12c-3 2-6 4-6 7 0 2 2 3 6 3s6-1 6-3c0-3-3-5-6-7z" />
    </svg>
  ),
};

const SVC_DELAY_CLASSES = ["rv-d1", "rv-d2", "rv-d3", "rv-d1", "rv-d2", "rv-d3"];

export default function HomepageClient({ projects, testimonials, faqs, stats, services, processSteps, marqueeTags, pricingTiers, blogPosts }: Props) {
  useEffect(() => {
    // ── Theme toggle ──
    const html = document.documentElement;
    const toggle = document.getElementById("themeToggle") as HTMLButtonElement;
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

    // ── GSAP ──
    gsap.registerPlugin(ScrollTrigger);

    // Scroll progress bar
    gsap.to("#scrollProg", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });

    // Scroll reveal via IntersectionObserver
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );
    document
      .querySelectorAll(
        ".work-card,.svc-card,.test-card,.proc-step,.stats-item,.sec-title,.sec-label,.sec-desc,.about-img,.cta-band h2,.ci-item,.about-body p,.faq-item,.rv"
      )
      .forEach((el) => {
        if (!el.closest(".hero")) revealObserver.observe(el);
      });

    // Typewriter
    const typeEl = document.getElementById("heroTypewriter");
    if (typeEl) {
      const text =
        stats.hero_typewriter ?? "Shopify, WooCommerce & Webflow — 4+ years, global clients, zero excuses. I build stores that convert, on time, every time.";
      const cursor = document.createElement("span");
      cursor.className = "typewriter-cursor";
      typeEl.appendChild(cursor);
      let i = 0;
      const type = () => {
        if (i < text.length) {
          typeEl.insertBefore(document.createTextNode(text.charAt(i)), cursor);
          i++;
          const delay =
            text.charAt(i - 1) === "." || text.charAt(i - 1) === ","
              ? 80
              : text.charAt(i - 1) === " "
              ? 30
              : 25;
          setTimeout(type, delay);
        } else {
          setTimeout(() => {
            cursor.style.animation = "none";
            cursor.style.opacity = "0";
            cursor.style.transition = "opacity .5s";
          }, 2500);
        }
      };
      setTimeout(type, 1200);
    }

    // Parallax on hero orbs
    gsap.to(".hero-orb-1", {
      y: -100,
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
    });
    gsap.to(".hero-orb-2", {
      y: -60,
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
    });
    gsap.to(".hero-orb-3", {
      y: -80,
      x: 40,
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
    });
    gsap.to(".hero-grid", {
      y: 80,
      opacity: 0,
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
    });

    // Nav scroll
    const nav = document.getElementById("nav");
    if (nav) {
      ScrollTrigger.create({
        trigger: "body",
        start: "50px top",
        onEnter: () => nav.classList.add("scrolled"),
        onLeaveBack: () => nav.classList.remove("scrolled"),
      });
    }

    // Back to top
    const btt = document.getElementById("btt");
    if (btt) {
      ScrollTrigger.create({
        trigger: "body",
        start: "600px top",
        onEnter: () => btt.classList.add("show"),
        onLeaveBack: () => btt.classList.remove("show"),
      });
    }

    // Mobile menu
    const burger = document.getElementById("burger") as HTMLButtonElement;
    const mob = document.getElementById("mobMenu");
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
      document.querySelectorAll(".ml").forEach((a) => {
        a.addEventListener("click", () => {
          isOpen = false;
          mob.classList.remove("open");
          document.body.style.overflow = "";
          burger.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
        });
      });
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = (a as HTMLAnchorElement).getAttribute("href");
        const target = href ? document.querySelector(href) : null;
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // Count up
    const animateCounters = (container: Element) => {
      container.querySelectorAll("[data-count]").forEach((el) => {
        const elem = el as HTMLElement;
        if (elem.dataset.animated) return;
        elem.dataset.animated = "1";
        const target = parseInt(elem.getAttribute("data-count") || "0");
        const dur = 1200;
        let st: number | null = null;
        const step = (ts: number) => {
          if (!st) st = ts;
          const p = Math.min((ts - st) / dur, 1);
          elem.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };
    const cObs = new IntersectionObserver(
      (e) => e.forEach((en) => { if (en.isIntersecting) animateCounters(en.target); }),
      { threshold: 0.5 }
    );
    document.querySelectorAll(".hero-stats,.stats-row").forEach((el) => cObs.observe(el));

    // Cursor glow (desktop only)
    if (window.matchMedia("(pointer:fine)").matches) {
      const glow = document.createElement("div");
      glow.style.cssText =
        "position:fixed;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(14,138,110,.07),rgba(124,90,230,.03) 40%,transparent 70%);pointer-events:none;z-index:0;will-change:transform;top:0;left:0";
      document.body.appendChild(glow);
      let glowX = 0, glowY = 0, curX = 0, curY = 0;
      document.addEventListener("mousemove", (e) => { curX = e.clientX - 250; curY = e.clientY - 250; }, { passive: true });
      const glowLoop = () => {
        glowX += (curX - glowX) * 0.08;
        glowY += (curY - glowY) * 0.08;
        glow.style.transform = `translate(${glowX}px,${glowY}px)`;
        requestAnimationFrame(glowLoop);
      };
      glowLoop();

      // 3D tilt on cards
      document.querySelectorAll(".work-card,.svc-card,.test-card,.proc-step").forEach((card) => {
        const el = card as HTMLElement;
        el.addEventListener("mousemove", (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          el.style.transform = `perspective(600px) rotateX(${(y - 0.5) * -12}deg) rotateY(${(x - 0.5) * 12}deg) translateY(-4px) scale(1.02)`;
          el.style.setProperty("--mouse-x", x * 100 + "%");
          el.style.setProperty("--mouse-y", y * 100 + "%");
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "";
          el.style.removeProperty("--mouse-x");
          el.style.removeProperty("--mouse-y");
        });
      });

      // Magnetic buttons
      document.querySelectorAll(".btn-primary,.nav-cta,.wa-btn,.submit").forEach((btn) => {
        const el = btn as HTMLElement;
        el.addEventListener("mousemove", (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          gsap.to(el, {
            x: (e.clientX - r.left - r.width / 2) * 0.2,
            y: (e.clientY - r.top - r.height / 2) * 0.2,
            duration: 0.3,
            ease: "power2.out",
          });
        });
        el.addEventListener("mouseleave", () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,.4)" });
        });
      });
    }

    // Form validation
    const cForm = document.getElementById("cForm") as HTMLFormElement;
    if (cForm) {
      cForm.addEventListener("submit", (e) => {
        let v = true;
        cForm.querySelectorAll("[required]").forEach((i) => {
          const input = i as HTMLInputElement | HTMLSelectElement;
          if (!input.value.trim()) {
            v = false;
            (input as HTMLElement).style.borderColor = "var(--coral)";
          } else {
            (input as HTMLElement).style.borderColor = "";
          }
        });
        const em = cForm.querySelector("[name=email]") as HTMLInputElement;
        if (em && em.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)) {
          v = false;
          em.style.borderColor = "var(--coral)";
        }
        if (!v) e.preventDefault();
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const toggleFaq = (e: React.MouseEvent<HTMLDivElement>) => {
    (e.currentTarget.parentElement as HTMLElement).classList.toggle("active");
  };

  const waNumber = stats.whatsapp_number || "919404643510";
  const email = stats.contact_email || "rachnajain2103@gmail.com";
  const statStores = stats.stat_stores || "50";
  const statDelivery = stats.stat_delivery || "7";
  const statCountries = stats.stat_countries || "12";
  const statPagespeed = stats.stat_pagespeed || "90";

  return (
    <>
      <div className="scroll-progress" id="scrollProg"></div>

      {/* NAV */}
      <nav id="nav">
        <div className="nav-inner">
          <a href="#" className="logo">
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
          </a>
          <div className="nav-mid">
            <a href="#work">Work</a>
            <a href="#services">Services</a>
            <a href="#pricing">Pricing</a>
            <a href="/tools">Free Tools</a>
            <a href="/blog">Blog</a>
            <a href="/free-audit">Free Audit</a>
          </div>
          <div className="nav-actions">
            <button className="theme-toggle" id="themeToggle" aria-label="Toggle theme">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
            <a href="/start" className="nav-cta">
              Start a Project
            </a>
          </div>
          <button className="burger" id="burger" aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="mob-menu" id="mobMenu">
        <a href="#work" className="ml">Work</a>
        <a href="#services" className="ml">Services</a>
        <a href="#pricing" className="ml">Pricing</a>
        <a href="/tools" className="ml">Free Tools</a>
        <a href="/blog" className="ml">Blog</a>
        <a href="/free-audit" className="ml">Free Audit</a>
        <a href="/start" className="ml" style={{ color: 'var(--accent)', fontWeight: 600 }}>Start a Project</a>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
          <div className="hero-grid"></div>
        </div>
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span> Available for new projects
          </div>
          <h1>
            <span className="line"><span className="word">I build stores</span></span>
            <span className="line"><span className="word word-d2">that <span className="highlight">actually sell.</span></span></span>
          </h1>
          <p className="hero-sub" id="heroTypewriter"></p>
          <div className="hero-logos" id="heroLogos">
            <span className="hero-logo-item" data-name="Shopify">
              <svg viewBox="0 0 448 512" height="32">
                <path fill="#95BF47" d="M388.32 104.1a4.66 4.66 0 0 0-4.16-4c-2 0-37.23-2.7-37.23-2.7s-24.78-24.53-27.52-27.27a5 5 0 0 0-3.51-1.58l-16.61 357.71 124.42-29.49S389.62 107.19 388.32 104.1zM275.63 72.39l-11.41 34.44a105 105 0 0 0-22.08-10.66V87c0-12.33-1.72-22.3-4.64-29.78 11.45 1.57 20 13.15 38.13 15.17zM248.24 50.47c3.08 8.06 4.93 18.85 4.93 34.18v4.52a135.31 135.31 0 0 0-32.41-12.8c6.3-20.76 16.85-30.79 27.48-25.9zM219.94 37c3.54 0 7.18 1.19 10.85 3.59-15.84 7.45-32.82 26.28-39.92 63.88a248.11 248.11 0 0 0-26.68-7.92C175.17 59.64 195.64 37 219.94 37z" />
                <path fill="#5E8E3E" d="M388.32 104.1a4.66 4.66 0 0 0-4.16-4c-2 0-37.23-2.7-37.23-2.7s-24.78-24.53-27.52-27.27c-1-.94-2.22-1.42-3.51-1.58l-21.85 4.76 4.45 350.89 124.42-29.49S389.62 107.19 388.32 104.1z" />
                <path fill="#FFF" d="M268.84 156.56l-12.24 45.81s-13.52-7.21-30-7.21c-24.22 0-25.42 15.19-25.42 19 0 20.85 54.36 28.83 54.36 77.68 0 38.42-24.36 63.15-57.2 63.15-39.42 0-59.55-24.54-59.55-24.54l10.56-34.84s20.71 17.79 38.18 17.79a15.55 15.55 0 0 0 16.19-15.62c0-27.25-44.6-28.47-44.6-73.1 0-37.59 27-74 81.5-74a60.94 60.94 0 0 1 28.22 6.88z" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="WordPress">
              <svg viewBox="0 0 512 512" height="32">
                <path fill="#21759B" d="M256 8C119.3 8 8 119.2 8 256c0 136.7 111.3 248 248 248s248-111.3 248-248C504 119.2 392.7 8 256 8zM33 256c0-32.3 6.9-63 19.3-90.7l106.4 291.4C84.3 420.5 33 344.2 33 256zm223 223c-21.9 0-43-3.2-63-9.1l66.9-194.4 68.5 187.8c.5 1.1 1 2.1 1.6 3.1-23.1 8.1-48 12.6-74 12.6zm30.7-327.5c13.4-.7 25.5-2.1 25.5-2.1 12-1.4 10.6-19.1-1.4-18.4 0 0-36.1 2.8-59.4 2.8-21.9 0-58.7-2.8-58.7-2.8-12-.7-13.4 17.7-1.4 18.4 0 0 11.4 1.4 23.4 2.1l34.8 95.3-48.9 146.7-81.4-242c13.4-.7 25.5-2.1 25.5-2.1 12-1.4 10.6-19.1-1.4-18.4 0 0-36.1 2.8-59.4 2.8-4.2 0-9.1-.1-14.4-.3C109.6 73 178.1 33 256 33c58 0 110.9 22.2 150.6 58.5-1-.1-1.9-.2-2.9-.2-21.9 0-37.4 19.1-37.4 39.6 0 18.4 10.6 33.9 21.9 52.3 8.5 14.8 18.4 33.8 18.4 61.2 0 19-7.3 41.1-16.9 71.9l-22.2 74zm34.3 256.2l67.5-195.2c12.6-31.5 16.8-56.7 16.8-79.1 0-8.1-.5-15.6-1.5-22.7 17.6 32.2 27.7 69.2 27.7 108.3 0 83.3-45.1 155.9-112.5 195z" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="WooCommerce">
              <svg viewBox="0 0 512 231" height="28">
                <path fill="#96588A" d="M45.3 0h375c25 0 45.3 20.2 45.3 45.3v102.7c0 25-20.2 45.3-45.3 45.3H236.1L278 231l-84-37.7H45.3C20.3 193.3 0 173 0 148V45.3C0 20.2 20.2 0 45.3 0z" />
                <path fill="#FFF" d="M44.5 22.5c-4.8 0-8.9 2.1-12.3 6.2-3.3 4.1-5.3 9.8-6 16.9-.1 1.3-.2 2.6-.2 3.8 0 5.6 1 10.3 3 13.9 2.5 4.6 6.1 6.9 10.8 6.9 4.8 0 8.9-2.1 12.3-6.2 3.3-4.1 5.3-9.8 6-16.9.1-1.3.2-2.6.2-3.8 0-5.6-1-10.3-3-13.9-2.5-4.6-6.1-6.9-10.8-6.9zm377.7 1.3c-2.7-1.1-5.4-.8-8 .8-2.6 1.7-4.7 4.5-6.2 8.5L388 84.7l-10.7-43.1c-1.4-5.5-4.5-9-9.4-10.4-3.2-.9-6.1-.4-8.8 1.5-2.7 1.8-4.4 4.6-5.1 8.3L343.4 88l-17.2-50.8c-1.8-5.2-5-8.3-9.8-9.3-3.1-.7-6 0-8.6 2s-4 4.7-4 8c0 1 .2 2 .5 3L326 108c1.6 5.3 4.7 8.5 9.2 9.6 5 1.2 9.5-.7 13.3-5.8l14.6-27.5 8.4 26.4c1.8 5.6 5.2 8.9 10 9.7 4.8.7 9-1.5 12.4-6.6L427 40c.6-1 .9-2.1.9-3.3 0-5.8-1.9-10.1-5.7-12.9zM136.8 22.5c-4.8 0-8.9 2.1-12.3 6.2-3.3 4.1-5.3 9.8-6 16.9-.1 1.3-.2 2.6-.2 3.8 0 5.6 1 10.3 3 13.9 2.5 4.6 6.1 6.9 10.8 6.9 4.8 0 8.9-2.1 12.3-6.2 3.3-4.1 5.3-9.8 6-16.9.1-1.3.2-2.6.2-3.8 0-5.6-1-10.3-3-13.9-2.5-4.6-6.1-6.9-10.8-6.9z" transform="translate(23 46) scale(1.05)" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="Webflow">
              <svg viewBox="0 0 24 24" height="32">
                <path fill="#4353FF" d="M24 4.515v14.97c0 .887-.718 1.605-1.605 1.605H1.605A1.605 1.605 0 010 19.485V4.515C0 3.628.718 2.91 1.605 2.91h20.79C23.282 2.91 24 3.628 24 4.515zm-7.809 4.14c0 0-1.62 5.028-1.8 5.604-.042-.684-.72-5.604-.72-5.604-1.572 0-2.4.972-2.844 1.944 0 0-1.464 3.024-1.632 3.372-.012-.42-.192-3.36-.192-3.36-.12-1.2-1.332-1.956-2.34-1.956l.96 7.488c1.656 0 2.544-1.008 3-1.98 0 0 1.248-2.568 1.296-2.664.024.264.696 4.644.696 4.644 1.668 0 2.556-.924 3.012-1.896l3.12-7.596c-1.716 0-2.556 1.008-2.556 2.004z" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="Klaviyo">
              <svg viewBox="0 0 256 256" height="28">
                <path fill="#249711" d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm53.5 179.8l-25.8-39.5L128 179.8l-27.7-39.5-25.8 39.5-22-14.3L93.8 103l34.2 48.8L162.2 103l41.3 62.5-22 14.3z" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="Stripe">
              <svg viewBox="0 0 24 24" height="32">
                <path fill="#635BFF" d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19L3.36 21.8C5.727 23.207 8.756 24 12.165 24c2.625 0 4.747-.624 6.283-1.895 1.632-1.345 2.457-3.306 2.457-5.701 0-4.155-2.558-5.858-6.929-7.254z" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="Razorpay">
              <svg viewBox="0 0 24 24" height="28">
                <path fill="#0C2451" d="M7.378.001l-5.332 16.96 4.238-.074L9.322 7.67l5.456-.07-2.39 8.676 4.386-.064L22.622.001H7.378zM3.27 19.295L1.378 24h5.68l1.896-4.705H3.27z" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="Figma">
              <svg viewBox="0 0 24 24" height="32">
                <path fill="#F24E1E" d="M8 24c2.2 0 4-1.8 4-4v-4H8c-2.2 0-4 1.8-4 4s1.8 4 4 4z" />
                <path fill="#A259FF" d="M4 12c0-2.2 1.8-4 4-4h4v8H8c-2.2 0-4-1.8-4-4z" />
                <path fill="#F24E1E" d="M4 4c0-2.2 1.8-4 4-4h4v8H8C5.8 8 4 6.2 4 4z" />
                <path fill="#FF7262" d="M12 0h4c2.2 0 4 1.8 4 4s-1.8 4-4 4h-4V0z" />
                <path fill="#1ABCFE" d="M20 12c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="Shopify Liquid">
              <svg viewBox="0 0 24 24" height="28">
                <path fill="#95BF47" d="M12 2l-2 6h4l-2 6h4L10 22l2-6H8l2-6H6l6-8z" />
              </svg>
            </span>
            <span className="hero-logo-item" data-name="Analytics">
              <svg viewBox="0 0 24 24" height="30">
                <path fill="#E37400" d="M22.84 2.998v17.958a2.997 2.997 0 01-2.998 2.997c-1.655 0-2.997-1.342-2.997-2.997V2.998A2.997 2.997 0 0119.842 0c1.656 0 2.998 1.342 2.998 2.998zM14.963 9.09v11.866a2.997 2.997 0 01-2.998 2.997c-1.655 0-2.997-1.342-2.997-2.997V9.09a2.997 2.997 0 012.997-2.997c1.656 0 2.998 1.342 2.998 2.997zM7.121 18.96a2.998 2.998 0 11-5.995 0 2.998 2.998 0 015.995 0z" />
              </svg>
            </span>
          </div>
          <div className="hero-bottom">
            <div className="hero-left-col">
              <div className="hero-ctas">
                <a href="#work" className="btn-primary">See my work <span className="btn-arrow">→</span></a>
                <a href="/start" className="btn-ghost">Start a project</a>
              </div>
              <div className="upwork-badge">
                <svg viewBox="0 0 24 24" fill="#6CB438">
                  <path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06a2.123 2.123 0 0 1 2.123 2.123c0 1.175-.956 2.282-2.124 2.282zM18.561 5.1c-2.625 0-4.469 1.681-5.261 3.907-.764-1.158-1.34-2.556-1.674-3.754h-3.4v6.526c0 1.12-.906 2.022-2.022 2.022s-2.027-.902-2.027-2.022V5.253H.773v6.526c0 2.92 2.378 5.3 5.3 5.3s5.3-2.378 5.3-5.3V9.95c.34.704.78 1.418 1.32 2.074l-1.124 5.273h3.47l.808-3.809c1.025.71 2.2 1.163 3.516 1.163C21.868 14.65 24 12.389 24 9.74 24 7.198 21.695 5.1 18.561 5.1z" />
                </svg>
                Top Rated · 100% Job Success
              </div>
            </div>
            <div className="hero-right-col">
              <div className="hero-stats">
                <div className="hero-stat"><div className="num" data-count="4">0</div><div className="label">Years+</div></div>
                <div className="hero-stat"><div className="num">100%</div><div className="label">Job Success</div></div>
                <div className="hero-stat"><div className="num">5.0</div><div className="label">Upwork</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="marquee-sec">
        <div className="marquee-track">
          {(Array.isArray(marqueeTags) ? [...marqueeTags, ...marqueeTags] : []).map((item, i) => (
            <span key={i} className="marquee-item">{item}<span className="mq-dot"></span></span>
          ))}
        </div>
      </section>

      {/* WORK */}
      <section className="sec" id="work">
        <div className="sec-inner">
          <div className="sec-head">
            <div className="sec-label rv">Selected Work</div>
            <h2 className="sec-title rv">Stores I&apos;ve built<br />for real brands.</h2>
          </div>
          <div className="work-bento">
            {(Array.isArray(projects) ? projects : []).map((project, idx) => {
              const meta = PROJECT_IMAGES[project.displayOrder] ?? PROJECT_IMAGES[idx] ?? {
                img: "placeholder.jpg",
                alt: project.title,
                url: project.liveUrl || "#",
                num: String(idx + 1).padStart(2, "0"),
              };
              const cls = PROJECT_CLASSES[idx % PROJECT_CLASSES.length] ?? "rv";
              const visitUrl = project.liveUrl || meta.url;
              return (
                <div key={project.id} className={`work-card ${cls}`}>
                  <div className="work-thumb">
                    <img src={`/images/${meta.img}`} loading="lazy" alt={meta.alt} />
                    <div className="work-thumb-overlay">
                      <a href={visitUrl} target="_blank" rel="noopener" className="work-visit">Visit site →</a>
                    </div>
                  </div>
                  <div className="work-body">
                    <div className="work-num">{meta.num}</div>
                    <h3 className="work-name">{project.title}</h3>
                    <p className="work-desc">{project.description}</p>
                    <div className="work-tags">
                      {project.tags.map((tag, ti) => (
                        <span key={ti} className={`work-tag${tagColor(tag) ? " " + tagColor(tag) : ""}`}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-strip">
        <div className="sec-inner">
          <div className="stats-row rv">
            <div className="stats-item"><div className="s-num" data-count={statStores}>0</div><div className="s-label">Stores Launched</div></div>
            <div className="stats-item"><div className="s-num">{statDelivery}</div><div className="s-label">Day Avg. Delivery</div></div>
            <div className="stats-item"><div className="s-num">{statCountries}+</div><div className="s-label">Countries Served</div></div>
            <div className="stats-item"><div className="s-num">{statPagespeed}+</div><div className="s-label">Avg. PageSpeed</div></div>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="results-sec">
        <div className="sec-inner">
          <div className="results-grid">
            <div className="result-item rv rv-d1">
              <div className="result-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <div className="result-num">40%</div>
              <div className="result-label">Avg. add-to-cart lift after store rebuild</div>
            </div>
            <div className="result-item rv rv-d2">
              <div className="result-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="result-num">7 Days</div>
              <div className="result-label">Average delivery from kickoff to launch</div>
            </div>
            <div className="result-item rv rv-d3">
              <div className="result-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div className="result-num">45 → 94</div>
              <div className="result-label">Typical PageSpeed improvement after optimisation</div>
            </div>
            <div className="result-item rv rv-d1">
              <div className="result-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="result-num">50+</div>
              <div className="result-label">Stores launched across 12 countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="sec" id="services">
        <div className="sec-inner">
          <div className="sec-head">
            <div className="sec-label rv">What I Do</div>
            <h2 className="sec-title rv">End-to-end e-commerce,<br />built right.</h2>
          </div>
          <div className="svc-bento">
            {(Array.isArray(services) ? services : []).map((svc, i) => (
              <div key={i} className={`svc-card${svc.featured ? " featured" : ""} rv ${SVC_DELAY_CLASSES[i % SVC_DELAY_CLASSES.length]}`}>
                <div>
                  <div className={`svc-icon svc-icon-${i + 1}`}>
                    {SERVICE_ICONS[svc.iconKey] ?? null}
                  </div>
                  <h3>{svc.title}</h3>
                  <p>{svc.description}</p>
                  <div className="svc-tags">
                    {svc.tags.map((tag, ti) => <span key={ti} className="svc-tag">{tag}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="sec" id="pricing">
        <div className="sec-inner">
          <div className="sec-head">
            <div className="sec-label rv">Investment</div>
            <h2 className="sec-title rv">Clear pricing.<br />No surprises.</h2>
            <p className="sec-desc rv">Fixed-price projects only. You know the cost before work begins.</p>
          </div>
          <div className="pricing-grid">
            {(Array.isArray(pricingTiers) ? pricingTiers : []).map((p, i) => {
              const delay = `rv-d${(i % 3) + 1}`;
              return (
                <div key={i} className={`price-card${p.featured ? ' featured' : ''} rv ${delay}`}>
                  {p.popular && <div className="price-popular">{p.popular}</div>}
                  <div className="price-tier">{p.tier}</div>
                  <div className="price-from">From</div>
                  <div className="price-amount">{p.amount}</div>
                  <div className="price-desc">{p.description}</div>
                  <ul className="price-list">
                    {(Array.isArray(p.features) ? p.features : []).map((f, fi) => (
                      <li key={fi}>{f}</li>
                    ))}
                  </ul>
                  <a href="/start" className="price-cta">{p.ctaText ?? 'Get started →'}</a>
                </div>
              );
            })}
          </div>
          <p className="pricing-note rv">Not sure which fits your project? <a href="/start">Tell me about it</a> — I&apos;ll recommend the right scope.</p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="sec" id="testimonials">
        <div className="sec-inner">
          <div className="sec-head">
            <div className="sec-label rv">Client Words</div>
            <h2 className="sec-title rv">Don&apos;t take my word for it.</h2>
          </div>
          <div className="test-grid">
            {(Array.isArray(testimonials) ? testimonials : []).map((t, i) => (
              <div key={t.id} className={`test-card rv ${TESTIMONIAL_DELAYS[i % TESTIMONIAL_DELAYS.length]}`}>
                <div className="test-top">
                  <div className="test-stars">
                    {Array.from({ length: t.rating }).map((_, s) => (
                      <svg key={s} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    ))}
                  </div>
                  <span className="test-badge">Verified</span>
                </div>
                <div className="test-project">{t.projectName}</div>
                <p className="test-text">{t.quote}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "32px" }} className="rv">
            <a href="https://www.upwork.com/freelancers/~01806f752cdfa1ed0e" target="_blank" rel="noopener" className="btn-ghost" style={{ fontSize: "13px" }}>
              See all reviews on Upwork →
            </a>
          </div>
        </div>
      </section>

      {/* FREE AUDIT CTA */}
      <section className="audit-band rv">
        <div className="sec-inner">
          <div className="audit-inner">
            <div className="audit-left">
              <div className="audit-label">Free Offer</div>
              <h3 className="audit-title">Get a free store audit.</h3>
              <p className="audit-desc">I&apos;ll review your Shopify store and send you a personalised report covering speed, UX, mobile experience, and conversion rate — completely free, no strings attached.</p>
              <div className="audit-points">
                <span>PageSpeed analysis</span>
                <span>UX &amp; mobile review</span>
                <span>Conversion opportunities</span>
                <span>Delivered in 48hrs</span>
              </div>
            </div>
            <div className="audit-right">
              <a href="/start" className="btn-primary" style={{ fontSize: '16px', padding: '18px 36px' }}>Start Your Project →</a>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>No obligation · Response within 24hrs</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="sec" id="process">
        <div className="sec-inner">
          <div className="sec-head">
            <div className="sec-label rv">How It Works</div>
            <h2 className="sec-title rv">From first call to launch<br />in <span className="highlight" style={{ color: "var(--accent)" }}>seven days.</span></h2>
          </div>
          <div className="proc-grid rv">
            {(Array.isArray(processSteps) ? processSteps : []).map((s) => (
              <div key={s.num} className="proc-step">
                <div className="proc-num">{s.num}</div>
                <div className="proc-day">{s.day}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="sec" id="faq">
        <div className="sec-inner">
          <div className="sec-head">
            <div className="sec-label rv">FAQ</div>
            <h2 className="sec-title rv">Questions I get<br /><span className="highlight" style={{ color: "var(--accent)" }}>all the time.</span></h2>
          </div>
          <div className="faq-grid rv">
            {(Array.isArray(faqs) ? faqs : []).map((f) => (
              <div key={f.id} className="faq-item">
                <div className="faq-q" onClick={toggleFaq}>
                  {f.question}
                  <span className="faq-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </div>
                <div className="faq-a"><div className="faq-a-inner">{f.answer}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="sec" id="about">
        <div className="sec-inner">
          <div className="about-grid">
            <div className="about-photo rv">
              <div className="about-img"><span className="about-initials">RJ</span></div>
              <div className="about-float about-float-1">4+ Years Experience</div>
              <div className="about-float about-float-2">✦ Available Now</div>
            </div>
            <div>
              <div className="sec-label rv">About</div>
              <h2 className="sec-title rv">Hi, I&apos;m Rachna.</h2>
              <div className="about-body rv">
                <p>I&apos;m a Shopify and e-commerce developer with 4+ years of experience helping D2C brands, product businesses, and startups launch and grow their online stores.</p>
                <p>I work with clients across India, the US, UK, Australia, and Canada — delivering clean, fast, conversion-focused builds using AI-enhanced workflows that get you to market faster without cutting corners.</p>
                <p>For me, great e-commerce isn&apos;t just clean code. It&apos;s understanding what your customers need and building experiences that earn their trust from the first click.</p>
                <p>When I&apos;m not building stores, I&apos;m exploring new tools and workflows to deliver even better results — faster.</p>
              </div>
              <div className="about-links rv">
                <a href="https://linkedin.com/in/rachna-jain-a2150110b" target="_blank" rel="noopener" className="btn-ghost">LinkedIn</a>
                <a href="https://upwork.com/fl/~01806f752cdfa1ed0e" target="_blank" rel="noopener" className="btn-ghost">Upwork</a>
                <a href="https://instagram.com/rachnabuilds" target="_blank" rel="noopener" className="btn-ghost">Instagram</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOG PREVIEW */}
      {Array.isArray(blogPosts) && blogPosts.length > 0 && (
        <section className="sec" id="blog">
          <div className="sec-inner">
            <div className="sec-head">
              <div className="sec-label rv">From the Blog</div>
              <h2 className="sec-title rv">Shopify insights &amp;<br />e-commerce strategy.</h2>
              <p className="sec-desc rv">Practical guides from 4+ years of building stores.</p>
            </div>
            <div className="blog-preview-grid">
              {blogPosts.map((post, i) => {
                const BLOG_GRADIENTS = [
                  "linear-gradient(135deg,rgba(6,214,160,.12) 0%,rgba(167,139,250,.08) 100%)",
                  "linear-gradient(135deg,rgba(255,107,107,.1) 0%,rgba(251,191,36,.07) 100%)",
                  "linear-gradient(135deg,rgba(167,139,250,.12) 0%,rgba(6,214,160,.07) 100%)",
                ];
                return (
                  <a key={post.id} href={`/blog/${post.slug}`} className={`blog-prev-card rv rv-d${(i % 3) + 1}`} style={{ background: BLOG_GRADIENTS[i % 3] }}>
                    <div className="blog-prev-tags">
                      {post.tags.slice(0, 2).map((t) => (
                        <span key={t} className="blog-prev-tag">{t}</span>
                      ))}
                    </div>
                    <h3 className="blog-prev-title">{post.title}</h3>
                    {post.excerpt && <p className="blog-prev-excerpt">{post.excerpt}</p>}
                    <span className="blog-prev-read">Read article →</span>
                  </a>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <a href="/blog" className="btn-ghost rv">View all articles →</a>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="cta-band">
        <div className="sec-inner">
          <h2 className="rv">Have a project?<br /><span className="highlight">Let&apos;s talk about it.</span></h2>
          <p className="cta-band-sub rv">I respond within 24 hours. No contracts, no pressure — just a conversation.</p>
          <div className="cta-btns rv rv-d1">
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener" className="wa-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Chat on WhatsApp
            </a>
            <a href="/start" className="btn-primary">Send a brief <span className="btn-arrow">→</span></a>
          </div>
          <a href={`mailto:${email}`} className="cta-email rv rv-d2">{email}</a>
        </div>
      </section>

      {/* CONTACT */}
      <section className="sec contact-sec" id="contact">
        <div className="sec-inner">
          <div className="sec-head">
            <div className="sec-label rv">Get in Touch</div>
            <h2 className="sec-title rv">Start a project.</h2>
            <p className="sec-desc rv">Tell me about your store. I&apos;ll respond within 24 hours with a clear plan and honest timeline.</p>
          </div>
          <div className="contact-grid">
            <div className="contact-left rv">
              <div className="ci-item">
                <span className="ci-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" /><path d="m22 6-10 7L2 6" /></svg></span>
                <a href={`mailto:${email}`}>{email}</a>
              </div>
              <div className="ci-item">
                <span className="ci-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></span>
                <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener">WhatsApp: +91 94046 43510</a>
              </div>
              <div className="ci-item">
                <span className="ci-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg></span>
                <a href="https://upwork.com/fl/~01806f752cdfa1ed0e" target="_blank" rel="noopener">Upwork Profile</a>
              </div>
              <div className="ci-item">
                <span className="ci-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg></span>
                <a href="https://linkedin.com/in/rachna-jain-a2150110b" target="_blank" rel="noopener">LinkedIn</a>
              </div>
              <div className="ci-item">
                <span className="ci-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z" /><circle cx="12" cy="10" r="3" /></svg></span>
                <span>India · Available Globally</span>
              </div>
              <div className="ci-avail">
                <h4><span className="dot"></span> Currently Available</h4>
                <p>Accepting new projects · Response within 24 hours</p>
              </div>
            </div>
            <div className="rv rv-d2">
              <div className="contact-form-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '48px 36px', textAlign: 'center' }}>
                <div style={{ fontSize: 48 }}>✦</div>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>Ready to build something great?</h3>
                <p style={{ margin: 0, fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7 }}>Fill in a quick brief — tell me about your project, timeline, and goals. I&apos;ll review it personally and get back within 24 hours.</p>
                <a href="/start" className="btn-primary" style={{ fontSize: 16, padding: '16px 36px', width: '100%', textAlign: 'center', display: 'block' }}>
                  Start Your Project →
                </a>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>Takes 2 minutes · No obligation · Response in 24hrs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="sec-inner">
          <div className="foot-top">
            <div className="foot-brand">
              <span className="logo">
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
                <span className="logo-text"><span className="ln">Rachna</span><span className="lb">Builds</span></span>
              </span>
              <p>Building stores that sell.</p>
            </div>
            <div className="foot-links">
              <a href="#work">Work</a><a href="#services">Services</a><a href="#process">Process</a><a href="#about">About</a><a href="/start">Start a Project</a>
            </div>
            <div className="foot-socials">
              <a href="https://linkedin.com/in/rachna-jain-a2150110b" target="_blank" rel="noopener" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://upwork.com/fl/~01806f752cdfa1ed0e" target="_blank" rel="noopener" aria-label="Upwork">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06a2.123 2.123 0 0 1 2.123 2.123c0 1.175-.956 2.282-2.124 2.282zM18.561 5.1c-2.625 0-4.469 1.681-5.261 3.907-.764-1.158-1.34-2.556-1.674-3.754h-3.4v6.526c0 1.12-.906 2.022-2.022 2.022s-2.027-.902-2.027-2.022V5.253H.773v6.526c0 2.92 2.378 5.3 5.3 5.3s5.3-2.378 5.3-5.3V9.95c.34.704.78 1.418 1.32 2.074l-1.124 5.273h3.47l.808-3.809c1.025.71 2.2 1.163 3.516 1.163C21.868 14.65 24 12.389 24 9.74 24 7.198 21.695 5.1 18.561 5.1z" /></svg>
              </a>
              <a href="https://instagram.com/rachnabuilds" target="_blank" rel="noopener" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
              </a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Rachna Jain · rachnabuilds.com</span>
            <span>Made with care &amp; intention</span>
          </div>
        </div>
      </footer>

      {/* FLOATING WA */}
      <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener" className="wa-float" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
        <span className="wa-tip">Chat with Rachna</span>
      </a>

      {/* BACK TO TOP */}
      <button className="btt" id="btt" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </>
  );
}
