'use client';

import { useEffect, useRef, useState } from 'react';
import './v2-home.css';

/* ============================================================
   DATA
   ============================================================ */
/* Pexels image/video URLs */
const PEXELS_VIDEO = 'https://videos.pexels.com/video-files/5981981/5981981-sd_640_338_25fps.mp4';

const testimonials = [
  {
    logo: 'Welevate Club',
    quote: 'Their project management was outstanding. Rachna delivered our Shopify store in under a week — pixel-perfect and blazing fast. Our conversion rate went up 30% in the first month.',
    name: 'Sarah M.',
    company: 'Welevate Club',
    photo: 'https://images.pexels.com/photos/26728098/pexels-photo-26728098.jpeg?auto=compress&cs=tinysrgb&h=630&w=1200',
    platform: 'Shopify',
  },
  {
    logo: 'MywaveX',
    quote: 'Migrated our entire WooCommerce store to Shopify without losing a single product or SEO ranking. Incredible attention to detail and constant communication throughout.',
    name: 'James K.',
    company: 'MywaveX',
    photo: 'https://images.pexels.com/photos/6077664/pexels-photo-6077664.jpeg?auto=compress&cs=tinysrgb&h=630&w=1200',
    platform: 'Upwork',
  },
  {
    logo: 'Halo Coffee',
    quote: 'Rachna optimised our PageSpeed from 42 to 96 and set up our Klaviyo flows. Revenue from email alone jumped ₹3L in 60 days. Genuinely transformative work.',
    name: 'Priya S.',
    company: 'Halo Coffee',
    photo: 'https://images.pexels.com/photos/8560313/pexels-photo-8560313.jpeg?auto=compress&cs=tinysrgb&h=630&w=1200',
    platform: 'Clutch',
  },
];

const portfolioProjects = [
  {
    num: '01',
    name: 'Welevate Club',
    url: 'welevateclub.com',
    desc: 'Custom Shopify store for a premium wellness brand. Full Liquid theme build with subscription integration.',
    tags: ['Shopify', 'Custom Liquid', 'ReCharge'],
    img: 'https://images.pexels.com/photos/5717978/pexels-photo-5717978.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
  {
    num: '02',
    name: 'Oh Little Wren',
    url: 'ohlittlewren.com',
    desc: "Boutique children's brand. Bespoke theme with gift messaging, wishlists, and Instagram feed.",
    tags: ['Shopify', 'Custom Theme', 'Klaviyo'],
    img: 'https://images.pexels.com/photos/5717973/pexels-photo-5717973.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
  {
    num: '03',
    name: 'Galatea',
    url: 'shop.galatea.com',
    desc: 'Fashion brand on Shopify Plus. Advanced filtering, lookbook pages, and multi-currency.',
    tags: ['Shopify Plus', 'Multi-Currency', 'Luxury'],
    img: 'https://images.pexels.com/photos/9218544/pexels-photo-9218544.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
  {
    num: '04',
    name: 'MyWaveX',
    url: 'us.mywavex.com',
    desc: 'WooCommerce to Shopify Plus migration with full data preservation and zero SEO loss.',
    tags: ['Migration', 'Shopify Plus', 'SEO'],
    img: 'https://images.pexels.com/photos/5625045/pexels-photo-5625045.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
  {
    num: '05',
    name: 'Halo Coffee',
    url: 'halo.coffee',
    desc: 'Speed optimisation from 42→94 PageSpeed + full Klaviyo email flows setup.',
    tags: ['Speed Optimisation', 'Klaviyo', 'CRO'],
    img: 'https://images.pexels.com/photos/5717981/pexels-photo-5717981.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
  {
    num: '06',
    name: 'Revoo Concept',
    url: 'revooconcept.com',
    desc: 'D2C fashion store. Conversion-focused design with bundles, upsells, and custom cart.',
    tags: ['Shopify', 'D2C', 'CRO'],
    img: 'https://images.pexels.com/photos/7667453/pexels-photo-7667453.jpeg?auto=compress&cs=tinysrgb&h=400&w=700',
  },
];

const marqueeItems = [
  'Shopify Expert', 'Custom Themes', 'Migrations', 'Speed Optimisation',
  'Shopify Plus', 'CRO Specialist', 'Klaviyo', 'Figma to Code', 'Mobile-First', 'Liquid Dev',
];

const clients = [
  { name: 'Welevate Club', top: '12%', left: '4%' },
  { name: 'MywaveX', top: '8%', left: '38%' },
  { name: 'Halo Coffee', top: '6%', left: '66%' },
  { name: 'Oh Little Wren', top: '34%', left: '2%' },
  { name: 'Galatea', top: '38%', left: '44%' },
  { name: 'Revoo Concept', top: '32%', left: '62%' },
  { name: 'Bloom & Co.', top: '60%', left: '8%' },
  { name: 'NativeSkins', top: '62%', left: '40%' },
  { name: 'Arcadia Home', top: '58%', left: '68%' },
  { name: 'CloudKart', top: '84%', left: '6%' },
  { name: 'LuminaFit', top: '80%', left: '46%' },
  { name: 'Craftfolk', top: '82%', left: '70%' },
];

/* ============================================================
   STAT COUNTER HOOK
   ============================================================ */
function useCountUp(target: number, suffix: string, inView: boolean) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const duration = 1600;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return `${count}${suffix}`;
}

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const display = useCountUp(value, suffix, inView);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="stat-item reveal" ref={ref}>
      <div className="stat-item-inner">
        <span className="stat-number">{display}</span>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function HomeV2Client() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right');
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="v2home">
      {/* Scroll progress */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* ====================================================
          NAV
      ==================================================== */}
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <img src="/branding/rachna-builds-wordmark-on-dark.svg" alt="Rachna Builds" style={{ height: 20, width: 'auto', display: 'block' }} />
          </a>
          <div className="nav-links">
            <a href="#work">Our Work</a>
            <a href="#services">Services</a>
            <a href="/tools">Free Tools</a>
            <a href="/blog">Blog</a>
            <a href="/free-audit">Free Audit</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="nav-right">
            <a href="#contact" className="btn-primary">Let&apos;s discuss →</a>
            <button
              className={`nav-hamburger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <a href="#work" onClick={closeMenu}>Our Work</a>
        <a href="#services" onClick={closeMenu}>Services</a>
        <a href="/tools" onClick={closeMenu}>Free Tools</a>
        <a href="/blog" onClick={closeMenu}>Blog</a>
        <a href="/free-audit" onClick={closeMenu}>Free Audit</a>
        <a href="#contact" onClick={closeMenu}>Contact</a>
        <a href="#contact" className="btn-primary" onClick={closeMenu}>Let&apos;s discuss →</a>
      </div>

      {/* ====================================================
          HERO — split grid with animated blobs + CSS mockup
      ==================================================== */}
      <section className="hero" id="top">
        {/* Animated gradient blobs */}
        <div className="hero-blob-1" />
        <div className="hero-blob-2" />
        <div className="hero-blob-3" />

        {/* LEFT — text content */}
        <div className="hero-left">
          <div className="reveal">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Certified Shopify Expert · Available for New Projects
            </div>
          </div>

          <h1 className="hero-heading-block reveal reveal-delay-1">
            <span className="hero-line">Shopify Stores</span>
            <span className="hero-line-outline">That Convert.</span>
            <span className="hero-line">Built. Fixed. Scaled.</span>
          </h1>

          <p className="hero-sub reveal reveal-delay-2">
            Optimise <span>·</span> Build <span>·</span> Migrate
          </p>

          <div className="hero-cta-row reveal reveal-delay-3">
            <a href="#contact" className="btn-primary">Start a Project →</a>
            <a href="#work" className="btn-ghost">See My Work</a>
          </div>
        </div>

        {/* RIGHT — CSS browser mockup */}
        <div className="hero-right">
          <div className="hero-mockup-wrap">
            <div className="hero-mockup-stack">
              {/* Card 1 — main store preview */}
              <div className="hero-mockup-card hero-mockup-card-1">
                <div className="hero-mockup-bar">
                  <div className="hero-mockup-dot" />
                  <div className="hero-mockup-dot" />
                  <div className="hero-mockup-dot" />
                  <div className="hero-mockup-url" />
                </div>
                <div className="hero-mockup-screen">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/6994293/pexels-photo-6994293.jpeg?auto=compress&cs=tinysrgb&h=400&w=700"
                    alt="Shopify store"
                    loading="eager"
                  />
                </div>
              </div>
              {/* Card 2 — product detail overlay */}
              <div className="hero-mockup-card hero-mockup-card-2">
                <div className="hero-mockup-bar">
                  <div className="hero-mockup-dot" />
                  <div className="hero-mockup-dot" />
                  <div className="hero-mockup-dot" />
                  <div className="hero-mockup-url" />
                </div>
                <div className="hero-mockup-screen">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.pexels.com/photos/6207749/pexels-photo-6207749.jpeg?auto=compress&cs=tinysrgb&h=400&w=700"
                    alt="Ecommerce product page"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS ROW — spans both columns */}
        <div className="hero-stats-row">
          {[
            { num: '50+', label: 'Shopify Stores Built' },
            { num: '4+', label: 'Years Experience' },
            { num: '12+', label: 'Countries Served' },
            { num: '5.0 ★', label: 'Upwork Rating' },
          ].map((stat, i) => (
            <div className="hero-stat" key={i}>
              <div className="hero-stat-inner">
                <div className="hero-stat-num">{stat.num}</div>
                <div className="hero-stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================
          MARQUEE
      ==================================================== */}
      <div className="marquee-section">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <div className="marquee-item" key={i}>{item}</div>
          ))}
        </div>
      </div>

      {/* ====================================================
          JOIN FORCES
      ==================================================== */}
      <section className="join-section" id="about">
        <div className="join-inner">
          <div className="join-text-block">
            <p className="join-label reveal">Certified Shopify Expert</p>
            <h2 className="join-headline reveal reveal-delay-1">
              Traffic isn&apos;t the problem.<br />
              <em>Conversion is.</em>
            </h2>
            <p className="join-sub reveal reveal-delay-2">
              Most founders keep paying for visitors their store can&apos;t convert.
              I turn underperforming Shopify stores into 2%+ converting storefronts —
              and build new ones that convert from day one. Partnering with D2C brands
              across the globe.
            </p>
          </div>
          <div className="join-cta reveal reveal-delay-3">
            <a href="#contact" className="btn-primary">Start a Project →</a>
          </div>
        </div>
      </section>

      {/* ====================================================
          SERVICES — Horizontal carousel, cream cards
      ==================================================== */}
      <section className="services-section" id="services">
        <div className="services-intro">
          <div>
            <p className="services-intro-label reveal">What We Do</p>
            <h2 className="services-intro-headline reveal reveal-delay-1">
              Turn exceptional ideas<br />into exceptional experiences
            </h2>
          </div>
          <p className="services-intro-right reveal reveal-delay-2">
            Whether your store underperforms or doesn&apos;t exist yet — every engagement
            starts with conversion principles, not just design.
          </p>
        </div>

        <div className="services-carousel-outer">
          <div className="services-carousel-track">

            {/* Card 3 — We Optimise */}
            <div className="service-card">
              <div className="service-card-icon">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="service-card-we">We</span>
              <h3 className="service-card-name">Optimise</h3>
              <p className="service-card-tagline">Already have a store that isn&apos;t converting?</p>
              <p className="service-card-desc">
                My Conversion Bottleneck process finds exactly why visitors leave without
                buying — then fixes it. Audit, rebuild, and revenue systems (cart recovery,
                upsells, trust) delivered in 14 days.
              </p>
              <ul className="service-card-list">
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  PageSpeed &amp; Core Web Vitals
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  CRO Audits &amp; A/B Testing
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Klaviyo Email Flows
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Search Engine Optimisation
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Analytics &amp; Tracking
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Store Speed Audit
                </li>
              </ul>
              <div className="service-card-cta">
                <a href="#contact" className="btn-cream">Request an Audit →</a>
              </div>
            </div>


            {/* Card 1 — We Build */}
            <div className="service-card">
              <div className="service-card-icon">
                <svg viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <span className="service-card-we">We</span>
              <h3 className="service-card-name">Build</h3>
              <p className="service-card-tagline">Starting fresh? Built to convert from day one.</p>
              <p className="service-card-desc">
                Every store is custom-coded for your brand — fast, functional, and built
                for long-term growth. We design and develop Shopify experiences that turn
                visitors into loyal customers.
              </p>
              <ul className="service-card-list">
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Shopify Plus UI/UX Design
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Shopify Plus Development
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Custom Liquid Themes
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Mobile App Development
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Custom Integrations
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Figma to Shopify
                </li>
              </ul>
              <div className="service-card-cta">
                <a href="#contact" className="btn-cream">Start a Build →</a>
              </div>
            </div>

            {/* Card 2 — We Migrate */}
            <div className="service-card">
              <div className="service-card-icon">
                <svg viewBox="0 0 24 24">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </div>
              <span className="service-card-we">We</span>
              <h3 className="service-card-name">Migrate</h3>
              <p className="service-card-tagline">Full replatforming — clean and complete.</p>
              <p className="service-card-desc">
                You focus on business growth while we handle every detail of your migration.
                Zero data loss, full SEO preservation, and a seamless launch on Shopify.
              </p>
              <ul className="service-card-list">
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  WooCommerce to Shopify Plus
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Magento / BigCommerce
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Data Migration
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  SEO Preservation
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Payment Gateway Reconnection
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Post-Launch Support
                </li>
              </ul>
              <div className="service-card-cta">
                <a href="#contact" className="btn-cream">Plan a Migration →</a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ====================================================
          SOCIAL PROOF (DARK)
      ==================================================== */}
      <div className="proof-section">
        <div className="proof-inner">
          <div className="proof-partner-badge reveal">
            <div className="proof-partner-icon">S</div>
            <div className="proof-partner-text">
              <p className="proof-partner-label">Verified Partner</p>
              <p className="proof-partner-name">Shopify Expert</p>
            </div>
          </div>
          <h3 className="proof-headline reveal reveal-delay-1">
            Highest-rated across every major platform
          </h3>
          <div className="proof-cards">
            <div className="proof-card reveal reveal-delay-1">
              <div className="proof-card-emoji">⭐</div>
              <div>
                <p className="proof-card-main">Highest-rated · 5/5 Star</p>
                <p className="proof-card-sub">Verified Shopify Expert</p>
              </div>
            </div>
            <div className="proof-card reveal reveal-delay-2">
              <div className="proof-card-emoji">🏆</div>
              <div>
                <p className="proof-card-main">Top Rated · 100% JSS</p>
                <p className="proof-card-sub">Upwork Verified · 100+ Reviews</p>
              </div>
            </div>
            <div className="proof-card reveal reveal-delay-3">
              <div className="proof-card-emoji">🥇</div>
              <div>
                <p className="proof-card-main">Perfect 5.0 Score</p>
                <p className="proof-card-sub">Clutch · Verified Client Reviews</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================
          TESTIMONIALS — Video style, 2-column per row
      ==================================================== */}
      <section className="testimonials-section">
        <div className="testimonials-header">
          <p className="section-label reveal">Client Love</p>
          <h2 className="section-title reveal reveal-delay-1">
            Here is What Our Clients<br />Say About Us
          </h2>
        </div>

        {testimonials.map((t, i) => (
          <div
            className="testimonial-item"
            key={i}
            style={i % 2 === 1 ? { direction: 'rtl' } : {}}
          >
            {/* Quote side */}
            <div style={i % 2 === 1 ? { direction: 'ltr' } : {}}>
              <span className="testimonial-logo reveal">{t.logo}</span>
              <p className="testimonial-quote-big reveal reveal-delay-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="testimonial-source reveal reveal-delay-2">
                <strong>{t.name}</strong> · {t.company}
              </p>
            </div>
            {/* Video thumbnail side */}
            <div
              className="testimonial-video-wrap reveal reveal-delay-1"
              style={i % 2 === 1 ? { direction: 'ltr' } : {}}
            >
              {playingVideo === i ? (
                <video
                  src={PEXELS_VIDEO}
                  autoPlay
                  controls
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }}
                />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="testimonial-video-bg" src={t.photo} alt={t.name} />
                  <div className="testimonial-video-overlay" />
                  <div className="testimonial-video-name">{t.name} · {t.company}</div>
                  <button
                    className="testimonial-play"
                    aria-label="Play testimonial"
                    onClick={() => setPlayingVideo(i)}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                  </button>
                  <span className="testimonial-platform">{t.platform}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ====================================================
          LOGOS WALL — Trusted by brands worldwide
      ==================================================== */}
      <div className="logos-section">
        <div className="logos-card reveal">
          <div className="logos-card-left">
            <p className="logos-card-label">Trusted by</p>
            <h3 className="logos-card-title">
              Brands from<br />12+ Countries
            </h3>
          </div>
          <div className="logos-grid">
            {clients.map((c, i) => (
              <div
                className="logo-chip"
                key={i}
                style={{ top: c.top, left: c.left }}
              >
                {c.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====================================================
          STATS (DARK)
      ==================================================== */}
      <section className="stats-section">
        <div className="stats-inner">
          <div className="stats-header">
            <p className="stats-label reveal">Trusted by Dreamers, Doers, and Leaders</p>
            <h2 className="stats-title reveal reveal-delay-1">
              Our Numbers Speak<br />for Themselves
            </h2>
          </div>
          <div className="stats-grid">
            <StatItem value={50} suffix="+" label="Shopify Stores Built" />
            <StatItem value={7} suffix=" Days" label="Average Build Time" />
            <StatItem value={12} suffix="+" label="Countries Served" />
            <StatItem value={90} suffix="+" label="PageSpeed Score" />
          </div>
        </div>
      </section>

      {/* ====================================================
          PORTFOLIO / SUCCESS STORIES
      ==================================================== */}
      <section className="portfolio-section" id="work">
        <div className="portfolio-inner">
          <div className="portfolio-header">
            <div>
              <p className="section-label reveal">Portfolio</p>
              <h2 className="section-title reveal reveal-delay-1">
                Success Stories<br />Worth Exploring
              </h2>
            </div>
            <a href="#contact" className="btn-ghost reveal reveal-delay-2">View All Work →</a>
          </div>

          <div className="portfolio-watermark">Portfolio</div>

          <div className="portfolio-grid">
            {portfolioProjects.map((p, i) => (
              <div
                className="portfolio-card reveal"
                style={{ transitionDelay: `${(i % 3) * 0.08}s` }}
                key={i}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="portfolio-card-thumb" src={p.img} alt={p.name} loading="lazy" />
                <p className="portfolio-card-num">{p.num}</p>
                <h3 className="portfolio-card-logo">{p.name}</h3>
                <p className="portfolio-card-url">{p.url}</p>
                <p className="portfolio-card-desc">{p.desc}</p>
                <div className="portfolio-tags">
                  {p.tags.map((tag, j) => (
                    <span className="portfolio-tag" key={j}>{tag}</span>
                  ))}
                </div>
                <a
                  href={`https://${p.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portfolio-card-link"
                >
                  Visit site →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================
          AWARDS & CERTIFICATION
      ==================================================== */}
      <section className="awards-section">
        <div className="awards-inner">
          <div className="awards-header">
            <p className="awards-label reveal">Recognition</p>
            <h2 className="awards-title reveal reveal-delay-1">
              Awards &amp; Certification
            </h2>
          </div>
          <div className="awards-grid">
            <div className="award-card reveal">
              <div className="award-icon">🛍</div>
              <h3 className="award-name">Certified Shopify Expert</h3>
              <p className="award-desc">In-house Certified Shopify Professional with development, migration, and optimisation expertise. Perfect 5.0 rating on Shopify.</p>
            </div>
            <div className="award-card reveal reveal-delay-1">
              <div className="award-icon">⭐</div>
              <h3 className="award-name">Recognised by Upwork</h3>
              <p className="award-desc">Top Rated freelancer with 100% Job Success Score. Trusted by 100+ clients across India, UK, US, Australia, and Europe.</p>
            </div>
            <div className="award-card reveal reveal-delay-2">
              <div className="award-icon">🏅</div>
              <h3 className="award-name">Verified by Clients</h3>
              <p className="award-desc">Every review earned. 5.0 score across Clutch and Shopify — backed by real brands, real results, and measurable growth.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          FINAL CTA
      ==================================================== */}
      <section className="cta-section" id="contact">
        <div className="cta-inner">
          <div className="cta-headline-block">
            <span className="cta-line1 reveal">Don&apos;t settle for</span>
            <span className="cta-line2 reveal reveal-delay-1">second-best.</span>
            <p className="cta-sub reveal reveal-delay-2">
              When you have Rachna Builds by your side.
            </p>
          </div>
          <div className="cta-actions reveal reveal-delay-2">
            <a href="mailto:rachna@rachnabuilds.com" className="btn-primary">
              Let&apos;s discuss your expectations →
            </a>
            <a
              href="https://wa.me/919999999999?text=Hi%20Rachna%2C%20I%27d%20like%20to%20discuss%20a%20Shopify%20project"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ====================================================
          FOOTER
      ==================================================== */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <p className="footer-logo"><img src="/branding/rachna-builds-wordmark-on-dark.svg" alt="Rachna Builds" style={{ height: 20, width: 'auto', display: 'block' }} /></p>
            <p className="footer-tagline">Certified Shopify Expert &amp; E-Commerce Developer. Custom stores, migrations, and speed optimisation.</p>
            <div className="footer-contact">
              <a href="mailto:rachna@rachnabuilds.com">rachna@rachnabuilds.com</a>
              <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          </div>

          <div>
            <p className="footer-col-title">Services</p>
            <ul className="footer-links">
              <li><a href="#services">Shopify Development</a></li>
              <li><a href="#services">Platform Migration</a></li>
              <li><a href="#services">Speed Optimisation</a></li>
              <li><a href="#services">Shopify Plus</a></li>
              <li><a href="#services">Klaviyo Setup</a></li>
            </ul>
          </div>

          <div>
            <p className="footer-col-title">Pages</p>
            <ul className="footer-links">
              <li><a href="#work">Portfolio</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="https://rachnabuilds.com/blog" target="_blank" rel="noopener noreferrer">Blog</a></li>
            </ul>
          </div>

          <div>
            <p className="footer-col-title">Connect</p>
            <ul className="footer-links">
              <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><a href="https://upwork.com" target="_blank" rel="noopener noreferrer">Upwork</a></li>
              <li><a href="https://calendly.com" target="_blank" rel="noopener noreferrer">Book a Call</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">© {new Date().getFullYear()} Rachna Builds. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
