import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendPushToAll } from '@/lib/webpush';

interface RouteContext { params: Promise<{ slug: string }> }

function verifyPortalCookie(req: NextRequest, slug: string) {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(slug).digest('hex');
  return req.cookies.get(`rp_${slug}`)?.value === expected;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  if (!verifyPortalCookie(req, slug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const context = searchParams.get('context') || 'general';

  const report = await prisma.report.findUnique({ where: { slug }, select: { id: true } });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const comments = await prisma.portalComment.findMany({
    where: { reportId: report.id, context },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  if (!verifyPortalCookie(req, slug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { context = 'general', author, text } = await req.json();
  if (!author?.trim() || !text?.trim()) return NextResponse.json({ error: 'author and text required' }, { status: 400 });

  const report = await prisma.report.findUnique({ where: { slug }, select: { id: true } });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const comment = await prisma.portalComment.create({
    data: { id: randomBytes(12).toString('hex'), reportId: report.id, context, author: author.trim(), text: text.trim() },
  });

  sendPushToAll('New Comment', `${author.trim()}: ${text.trim().slice(0, 80)}`, `/admin/reports/${report.id}`).catch(() => {})

  return NextResponse.json(comment, { status: 201 });
}
