// Resolves a Page-scoped access token for Graph API calls.
//
// META_PAGE_ACCESS_TOKEN holds a never-expiring *system user* token. Meta's new
// Pages experience rejects system-user tokens on Page endpoints (subscribed_apps,
// lead retrieval) and wants a Page-scoped token instead — which we can derive
// from the system-user token. Result is cached in module scope; Page tokens
// minted from a non-expiring system user token don't expire either, so the cache
// only exists to save a round trip per warm lambda.
const GRAPH = 'https://graph.facebook.com/v21.0';

let cached: { pageId: string; token: string; at: number } | null = null;
const TTL_MS = 60 * 60 * 1000;

export interface PageAuth {
  pageId: string;
  token: string;
  /** true when we exchanged the system-user token for a Page token */
  derived: boolean;
}

export async function getPageAuth(pageIdOverride?: string | null): Promise<PageAuth | null> {
  const envToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!envToken) return null;

  if (cached && Date.now() - cached.at < TTL_MS && (!pageIdOverride || pageIdOverride === cached.pageId)) {
    return { pageId: cached.pageId, token: cached.token, derived: true };
  }

  // /me/accounts on a system-user token returns each Page *with* its own token
  const accounts = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${envToken}`,
  ).then((r) => r.json()).catch(() => null);

  const pages: Array<{ id: string; name?: string; access_token?: string }> = accounts?.data ?? [];
  const match = pageIdOverride ? pages.find((p) => p.id === pageIdOverride) : pages[0];

  if (match?.access_token) {
    cached = { pageId: match.id, token: match.access_token, at: Date.now() };
    return { pageId: match.id, token: match.access_token, derived: true };
  }

  // Fall back to asking the Page directly for its token
  const pageId = pageIdOverride || match?.id || process.env.META_PAGE_ID;
  if (pageId) {
    const direct = await fetch(
      `${GRAPH}/${pageId}?fields=access_token&access_token=${envToken}`,
    ).then((r) => r.json()).catch(() => null);
    if (direct?.access_token) {
      cached = { pageId, token: direct.access_token, at: Date.now() };
      return { pageId, token: direct.access_token, derived: true };
    }
    // Env value may already be a Page token (if someone pastes one later)
    return { pageId, token: envToken, derived: false };
  }

  return null;
}
