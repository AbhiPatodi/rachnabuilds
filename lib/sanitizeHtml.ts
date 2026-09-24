// Defense-in-depth for report HTML generated from crawling third-party stores:
// the engine escapes what it scrapes, but anything that slipped through must
// never execute in the admin (or client portal) session. Strips executable
// elements, inline event handlers and script-scheme URLs; keeps <style>.
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<(iframe|object|embed|frame|frameset|applet|base|meta)\b[\s\S]*?(<\/\1\s*>|\/?>)/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(javascript|vbscript|data:text\/html)[^"'\s>]*/gi, '$1=$2#');
}
