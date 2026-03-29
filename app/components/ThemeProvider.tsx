'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rb_theme';

export function autoTheme(): Theme {
  const h = new Date().getHours();
  return h >= 6 && h < 20 ? 'light' : 'dark'; // 6am–8pm = light
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
    // cycle: auto → light → dark → auto
    const next: ThemeMode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto';
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }, [mode, apply]);

  return <ThemeCtx.Provider value={{ theme, mode, toggle }}>{children}</ThemeCtx.Provider>;
}
