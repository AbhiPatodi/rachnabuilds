'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rb_theme';

export function autoTheme(): Theme {
  // Marketing site defaults to the dark forest brand; the admin defaults to light.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return 'light';
  return 'dark';
}

interface ThemeCtx { theme: Theme; mode: ThemeMode; toggle: () => void; }
const ThemeCtx = createContext<ThemeCtx>({ theme: 'dark', mode: 'auto', toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [theme, setTheme] = useState<Theme>('dark');

  const apply = useCallback((m: ThemeMode) => {
    const t = m === 'auto' ? autoTheme() : m;
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  // Init from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const m: ThemeMode = saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto';
    setMode(m);
    apply(m);
  }, [apply]);

  // Re-check every 5 min when in auto mode
  useEffect(() => {
    if (mode !== 'auto') return;
    const id = setInterval(() => apply('auto'), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [mode, apply]);

  const toggle = useCallback(() => {
    // Admin: plain light ↔ dark. Marketing site keeps the auto → light → dark cycle.
    const inAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const next: ThemeMode = inAdmin ? (theme === 'light' ? 'dark' : 'light')
      : mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto';
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }, [mode, theme, apply]);

  return <ThemeCtx.Provider value={{ theme, mode, toggle }}>{children}</ThemeCtx.Provider>;
}
