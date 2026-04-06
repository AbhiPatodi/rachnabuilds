// GET /api/portal/[clientSlug]/logout
// Clears the httpOnly portal cookie and redirects to the login page
import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ clientSlug: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { clientSlug } = await params;
  const res = NextResponse.redirect(new URL(`/portal/${clientSlug}`, _req.url));
  res.cookies.set(`pc_${clientSlug}`, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  return res;
}
