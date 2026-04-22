// POST /api/admin/projects/[projectId]/prototype
// Accepts a .zip file, extracts it, uploads every file to Vercel Blob under
// prototypes/{projectId}/{relativePath}, creates a ProjectDocument record.
// Returns: { documentId, fileCount, entryFile }
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import JSZip from 'jszip';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ projectId: string }> }

async function auth() {
  const store = await cookies();
  const session = store.get('admin_session')?.value;
  const hash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  return session === hash;
}

// MIME types by extension
const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css:  'text/css',
  js:   'application/javascript',
  json: 'application/json',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  svg:  'image/svg+xml',
  webp: 'image/webp',
  ico:  'image/x-icon',
  woff: 'font/woff',
  woff2:'font/woff2',
  ttf:  'font/ttf',
  eot:  'application/vnd.ms-fontobject',
  mp4:  'video/mp4',
  webm: 'video/webm',
  txt:  'text/plain',
  xml:  'application/xml',
};

function getMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const docTitle = (form.get('title') as string) || 'Prototype';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'Zip too large (max 50 MB)' }, { status: 413 });

    // Load zip
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    // Find the root folder prefix (if zip has a top-level folder like "talentbridge-prototype/")
    const entries = Object.keys(zip.files);
    let prefix = '';
    const firstDir = entries.find(e => zip.files[e].dir);
    if (firstDir) {
      const candidate = firstDir;
      if (entries.every(e => e === candidate || e.startsWith(candidate))) {
        prefix = candidate;
      }
    }

    // Upload all non-directory files to Vercel Blob
    let fileCount = 0;
    let entryFile = 'index.html';
    const uploadedFiles: string[] = [];

    for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      const relativePath = prefix ? zipPath.slice(prefix.length) : zipPath;
      if (!relativePath) continue;

      const content = await zipEntry.async('nodebuffer');
      const mimeType = getMime(relativePath);
      const blobPath = `prototypes/${projectId}/${relativePath}`;

      await put(blobPath, content, {
        access: 'public',
        contentType: mimeType,
        addRandomSuffix: false,
        allowOverwrite: true,
      } as Parameters<typeof put>[2]);

      uploadedFiles.push(relativePath);
      fileCount++;
    }

    // Determine entry file (prefer index.html at root)
    const rootHtmlFiles = uploadedFiles.filter(f => !f.includes('/') && f.endsWith('.html'));
    if (rootHtmlFiles.includes('index.html')) entryFile = 'index.html';
    else if (rootHtmlFiles.length > 0) entryFile = rootHtmlFiles[0];

    // Create document record
    const doc = await prisma.projectDocument.create({
      data: {
        projectId,
        docType: 'prototype',
        title: docTitle,
        url: `prototype::${projectId}::${entryFile}`,
        notes: `${fileCount} files · Entry: ${entryFile}`,
      },
    });

    return NextResponse.json({ documentId: doc.id, fileCount, entryFile });
  } catch (err) {
    console.error('[prototype upload]', err);
    return NextResponse.json({ error: 'Failed to process prototype zip' }, { status: 500 });
  }
}

// DELETE — remove prototype document record
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const { documentId } = await req.json();
  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

  await prisma.projectDocument.delete({ where: { id: documentId } });
  // Note: blob files remain (Vercel Blob delete by prefix not available in free tier)
  return NextResponse.json({ ok: true });
}
