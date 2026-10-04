/** Link-preview fetchers (WhatsApp, iMessage, Slack…) load a page when a link is
 *  pasted; they are not a person opening it. */
export function isPreviewBot(ua: string | null | undefined): boolean {
  if (!ua) return true; // real browsers always send a user-agent
  if (/WhatsApp|facebookexternalhit|meta-externalagent|Facebot|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|SkypeUriPreview|Googlebot|GoogleOther|bingbot|Applebot|Pinterestbot|redditbot|Embedly|HeadlessChrome|python|okhttp|curl|wget|axios|Go-http|\bbot\b|crawler|spider|preview/i.test(ua)) return true;
  // WhatsApp's preview fetcher sometimes uses a bare UA (seen from Singapore DCs):
  // no recognizable browser engine means no human. Real phones/desktops always match one.
  return !/Chrome|CriOS|Safari|Firefox|FxiOS|Edg\/|SamsungBrowser|Instagram|FBAN|FBAV|Opera|OPR\//i.test(ua);
}

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
