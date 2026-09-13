// One-shot helper to wire the Facebook Page to this app's leadgen webhook.
//
// Meta requires a POST to /{page-id}/subscribed_apps with the Page token before
// it will deliver leadgen events. Doing it here means the token stays in Vercel
// env and never has to be pasted into a terminal or chat.
//
//   GET  → report which apps the Page is subscribed to (diagnostic)
//   POST → subscribe this app to the Page's leadgen field
//
// Auth: Bearer CRON_SECRET.
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GRAPH = 'https://graph.facebook.com/v21.0';

function unauthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return !process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`;
}

// Resolve the Page id the token belongs to; falls back to ?page_id=
async function resolvePageId(token: string, override: string | null) {
  if (override) return override;
  const res = await fetch(`${GRAPH}/me/accounts?fields=id,name&access_token=${token}`);
  const data = await res.json();
  if (Array.isArray(data?.data) && data.data.length) return data.data[0].id as string;
  // A Page-scoped token answers /me with the Page itself
  const me = await fetch(`${GRAPH}/me?fields=id,name&access_token=${token}`).then((r) => r.json());
  return (me?.id as string) || null;
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN not set' }, { status: 400 });

  const pageId = await resolvePageId(token, req.nextUrl.searchParams.get('page_id'));
  if (!pageId) return NextResponse.json({ error: 'Could not resolve page id' }, { status: 400 });

  const [subs, perms] = await Promise.all([
    fetch(`${GRAPH}/${pageId}/subscribed_apps?access_token=${token}`).then((r) => r.json()),
    fetch(`${GRAPH}/debug_token?input_token=${token}&access_token=${token}`).then((r) => r.json()),
  ]);

  return NextResponse.json({
    pageId,
    subscribedApps: subs,
    tokenScopes: perms?.data?.scopes ?? null,
    tokenExpires: perms?.data?.expires_at ?? null,
    tokenType: perms?.data?.type ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN not set' }, { status: 400 });

  const pageId = await resolvePageId(token, req.nextUrl.searchParams.get('page_id'));
  if (!pageId) return NextResponse.json({ error: 'Could not resolve page id' }, { status: 400 });

  const res = await fetch(
    `${GRAPH}/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${token}`,
    { method: 'POST' },
  );
  const result = await res.json();

  const verify = await fetch(`${GRAPH}/${pageId}/subscribed_apps?access_token=${token}`).then((r) =>
    r.json(),
  );

  return NextResponse.json({ ok: res.ok, pageId, result, subscribedApps: verify }, {
    status: res.ok ? 200 : 400,
  });
}
