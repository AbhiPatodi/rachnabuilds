/** "IN" → 🇮🇳 (regional-indicator emoji); '' for anything that isn't a 2-letter code. */
export function countryFlag(code?: string | null): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** "🇮🇳 Indore, IN" — flag + place for any tracked view. */
export function placeWithFlag(city?: string | null, country?: string | null): string {
  const where = [city, country].filter(Boolean).join(', ');
  const flag = countryFlag(country);
  return [flag, where].filter(Boolean).join(' ');
}
