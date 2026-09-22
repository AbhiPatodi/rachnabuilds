'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function ExitIntentPopup() {
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const triggered = useRef(false)
  const pathname = usePathname()

  useEffect(() => {
    // ALLOWLIST: browse-mode marketing pages only. Never on conversion or
    // deliverable pages (/free-audit, /audit, /report, /training, /start,
    // /contact...) — a popup there competes with the page's own single job.
    const BROWSE_PAGES = ['/', '/work', '/services', '/pricing', '/blog', '/tools']
    const allowed = BROWSE_PAGES.some((p) =>
      p === '/' ? pathname === '/' : pathname === p || pathname?.startsWith(`${p}/`),
    )
    if (!allowed) return
    // At most once a week per browser (was once per session — too pushy)
    try {
      const last = Number(localStorage.getItem('exit_popup_at') || 0)
      if (Date.now() - last < 7 * 24 * 60 * 60 * 1000) return
    } catch { /* storage blocked — fall through, session cap below still applies */ }
    if (sessionStorage.getItem('exit_popup_shown')) return

    const fire = () => {
      if (triggered.current) return
      triggered.current = true
      sessionStorage.setItem('exit_popup_shown', '1')
      try { localStorage.setItem('exit_popup_at', String(Date.now())) } catch { /* ignore */ }
      // Delay 300ms to feel less jarring
      setTimeout(() => setVisible(true), 300)
    }

    // Desktop only: cursor leaves through the top of the viewport (real exit intent)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) fire()
    }

    // Touch devices only: sustained fast scroll-up from deep in the page
    let lastScrollY = window.scrollY
    let lastScrollTime = Date.now()
    const handleScroll = () => {
      const now = Date.now()
      const dy = window.scrollY - lastScrollY
      const dt = Math.max(now - lastScrollTime, 1)
      const velocity = dy / dt // px/ms, negative = scrolling up
      if (velocity < -3 && window.scrollY > 800) fire()
      lastScrollY = window.scrollY
      lastScrollTime = now
    }

    const isTouch = window.matchMedia('(pointer: coarse)').matches

    // Arm only after the visitor has actually engaged with the page
    const timer = setTimeout(() => {
      if (isTouch) {
        window.addEventListener('scroll', handleScroll, { passive: true })
      } else {
        document.addEventListener('mouseleave', handleMouseLeave)
      }
    }, isTouch ? 20000 : 10000)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [pathname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Exit Intent Lead',
          email,
          message: 'Requested free store audit via exit intent popup',
          service: 'Free Audit',
        }),
      })
      setDone(true)
    } catch {
      // fail silently
    }
    setLoading(false)
  }

  if (!visible) return null

  return (
    <div className="exit-overlay" onClick={() => setVisible(false)}>
      <div className="exit-popup" onClick={e => e.stopPropagation()}>
        <button className="exit-close" onClick={() => setVisible(false)}>✕</button>
        {done ? (
          <div className="exit-done">
            <div className="exit-done-icon">🎉</div>
            <h3>You&apos;re on the list!</h3>
            <p>We&apos;ll be in touch within 24 hours with your free audit.</p>
          </div>
        ) : (
          <>
            <div className="exit-badge">FREE AUDIT</div>
            <h3>Wait — before you go!</h3>
            <p>Get a <strong>free 15-minute Shopify store audit</strong> — we&apos;ll find the top 3 things killing your conversions.</p>
            <form onSubmit={handleSubmit} className="exit-form">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="exit-input"
              />
              <input
                type="email"
                placeholder="Your email *"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="exit-input"
              />
              <button type="submit" disabled={loading} className="exit-submit">
                {loading ? 'Sending...' : 'Get My Free Audit →'}
              </button>
            </form>
            <p className="exit-fine">No spam. No obligations. Just actionable insights.</p>
          </>
        )}
      </div>
    </div>
  )
}
