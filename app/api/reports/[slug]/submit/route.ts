import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendPushToAll } from '@/lib/webpush';
import { isReportSession } from '@/lib/auth';
import { httpsUrlOrNull } from '@/lib/safeUrl';

interface RouteContext { params: Promise<{ slug: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;

  if (!(await isReportSession(slug))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, url, note } = await req.json();
  if (!title?.trim() || !url?.trim()) return NextResponse.json({ error: 'title and url required' }, { status: 400 });
  if (!httpsUrlOrNull(url)) return NextResponse.json({ error: 'Please use a full https:// link' }, { status: 400 });

  const report = await prisma.report.findUnique({ where: { slug }, select: { id: true } });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const doc = await prisma.clientDocument.create({
    data: {
      id: randomBytes(12).toString('hex'),
      reportId: report.id,
      docType: 'client_upload',
      title: title.trim(),
      url: url.trim(),
      notes: note?.trim() || null,
    },
  });

  sendPushToAll('File Submitted', `Client submitted: ${title.trim()}`, `/admin/reports/${report.id}`).catch(() => {})

  return NextResponse.json(doc, { status: 201 });
}
