import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ projectId: string }> }

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;

  // ?countOnly=1 — return unread count without marking as read (for polling badge)
  if (req.nextUrl.searchParams.get('countOnly') === '1') {
    const count = await prisma.projectMessage.count({
      where: { projectId, senderType: 'client', readByAdmin: false },
    });
    return NextResponse.json({ count });
  }

  const messages = await prisma.projectMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });

  const unreadIds = messages
    .filter(m => m.senderType === 'client' && !m.readByAdmin)
    .map(m => m.id);

  if (unreadIds.length > 0) {
    await prisma.projectMessage.updateMany({
      where: { id: { in: unreadIds } },
      data: { readByAdmin: true },
    });
  }

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;

  const body = await req.json() as { text?: string; attachmentUrl?: string; attachmentName?: string };
  const text = body.text?.trim() || '';
  const attachmentUrl = body.attachmentUrl?.trim() || null;
  const attachmentName = body.attachmentName?.trim() || null;

  if (!text && !attachmentUrl) {
    return NextResponse.json({ error: 'text or attachment required' }, { status: 400 });
  }

  const [message] = await prisma.$transaction(async (tx) => {
    const msg = await tx.projectMessage.create({
      data: {
        id: randomBytes(12).toString('hex'),
        projectId,
        senderType: 'admin',
        text: text || (attachmentName ? `📎 ${attachmentName}` : 'File attached'),
        readByAdmin: true,
        attachmentUrl,
        attachmentName,
      },
    });

    // Auto-add to project documents when attachment present
    if (attachmentUrl && attachmentName) {
      await tx.projectDocument.create({
        data: {
          id: randomBytes(12).toString('hex'),
          projectId,
          docType: 'other',
          title: attachmentName,
          url: attachmentUrl,
          notes: text || null,
        },
      });
    }

    return [msg];
  });

  return NextResponse.json(message, { status: 201 });
}
