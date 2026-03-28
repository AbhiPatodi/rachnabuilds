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
    // Only on public non-admin pages
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/reports')) return
    // Only once per session
    if (sessionStorage.getItem('exit_popup_shown')) return

    // Desktop: mouse leave top of page
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !triggered.current) {
        triggered.current = true
        sessionStorage.setItem('exit_popup_shown', '1')
        // Delay 300ms to feel less jarring
        setTimeout(() => setVisible(true), 300)
      }
    }

    // Mobile: fast scroll up
    let lastScrollY = window.scrollY
    let lastScrollTime = Date.now()
    const handleScroll = () => {
      const now = Date.now()
      const dy = window.scrollY - lastScrollY
      const dt = now - lastScrollTime
      const velocity = dy / dt // px/ms, negative = scrolling up fast
      if (velocity < -1.5 && window.scrollY > 200 && !triggered.current) {
        triggered.current = true
        sessionStorage.setItem('exit_popup_shown', '1')
        setTimeout(() => setVisible(true), 300)
      }
      lastScrollY = window.scrollY
      lastScrollTime = now
    }

    // Only trigger after 15 seconds on page
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave)
      window.addEventListener('scroll', handleScroll, { passive: true })
    }, 15000)

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
