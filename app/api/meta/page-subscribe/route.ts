// One-shot helper to wire the Facebook Page to this app's leadgen webhook.
//
// Meta requires a POST to /{page-id}/subscribed_apps with a Page-scoped token
// before it will deliver leadgen events. Doing it here means the token stays in
// Vercel env and never has to be pasted into a terminal or chat.
//
//   GET  → report Page id, token scopes and current app subscriptions
//   POST → subscribe this app to the Page's leadgen field
//
// Auth: Bearer CRON_SECRET. (Must live outside /api/admin — proxy.ts guards
// those paths with the admin_session cookie.)
import { NextRequest, NextResponse } from 'next/server';
import { getPageAuth, lastExchangeError } from '@/lib/metaPage';

export const dynamic = 'force-dynamic';

const GRAPH = 'https://graph.facebook.com/v21.0';

function unauthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return !process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const page = await getPageAuth(req.nextUrl.searchParams.get('page_id'));
  if (!page) {
    return NextResponse.json({
      error: 'META_PAGE_ACCESS_TOKEN not set or no Page found',
      tokenPresent: !!process.env.META_PAGE_ACCESS_TOKEN,
      tokenLength: process.env.META_PAGE_ACCESS_TOKEN?.length ?? 0,
      graphError: lastExchangeError,
    }, { status: 400 });
  }

  const [subs, debug] = await Promise.all([
    fetch(`${GRAPH}/${page.pageId}/subscribed_apps?access_token=${page.token}`).then((r) => r.json()),
    fetch(
      `${GRAPH}/debug_token?input_token=${page.token}&access_token=${process.env.META_PAGE_ACCESS_TOKEN}`,
    ).then((r) => r.json()),
  ]);

  // Every Page this system user can act on — useful when leads turn out to
  // live on a Page other than the one we defaulted to.
  const accounts = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,tasks&access_token=${process.env.META_PAGE_ACCESS_TOKEN}`,
  ).then((r) => r.json()).catch(() => null);

  return NextResponse.json({
    pageId: page.pageId,
    pageTokenDerived: page.derived,
    subscribedApps: subs,
    tokenType: debug?.data?.type ?? null,
    tokenScopes: debug?.data?.scopes ?? null,
    tokenExpires: debug?.data?.expires_at ?? null,
    visiblePages: accounts?.data ?? accounts?.error ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const page = await getPageAuth(req.nextUrl.searchParams.get('page_id'));
  if (!page) {
    return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN not set or no Page found' }, { status: 400 });
  }

  const res = await fetch(
    `${GRAPH}/${page.pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${page.token}`,
    { method: 'POST' },
  );
  const result = await res.json();

  const verify = await fetch(
    `${GRAPH}/${page.pageId}/subscribed_apps?access_token=${page.token}`,
  ).then((r) => r.json());

  return NextResponse.json(
    { ok: res.ok, pageId: page.pageId, result, subscribedApps: verify },
    { status: res.ok ? 200 : 400 },
  );
}
