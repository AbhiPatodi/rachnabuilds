'use client';
import { useTheme } from './ThemeProvider';

const Sun = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5"/>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

const Moon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const Auto = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
  </svg>
);

export function ThemeToggle({ className = 'theme-toggle' }: { className?: string }) {
  const { mode, theme, toggle } = useTheme();
  const labels: Record<string, string> = {
    auto: 'Auto (time-based) — click for Light',
    light: 'Light mode — click for Dark',
    dark: 'Dark mode — click for Auto',
  };
  return (
    <button className={className} onClick={toggle} aria-label={labels[mode]} title={labels[mode]}>
      {mode === 'auto' ? <Auto /> : theme === 'light' ? <Sun /> : <Moon />}
    </button>
  );
}
