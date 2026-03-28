import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ slug: string; docId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { slug, docId } = await params;

  // Verify portal auth cookie
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(slug).digest('hex');
  const cookieVal = req.cookies.get(`rp_${slug}`)?.value;

  if (cookieVal !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { note } = await req.json();
  if (typeof note !== 'string') {
    return NextResponse.json({ error: 'note must be a string' }, { status: 400 });
  }

  // Make sure the doc belongs to this report
  const doc = await prisma.clientDocument.findFirst({
    where: { id: docId, report: { slug } },
  });
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const updated = await prisma.clientDocument.update({
    where: { id: docId },
    data: { notes: note.trim() || null },
  });

  return NextResponse.json(updated);
}
