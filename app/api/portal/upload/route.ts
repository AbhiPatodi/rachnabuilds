// POST /api/portal/upload
// Authenticated portal route — uploads a file to Vercel Blob and returns the URL
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { put } from '@vercel/blob';
import { hasClientPortalAccess } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // Verify portal or admin cookie
  const store = await cookies();
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  if (!(await hasClientPortalAccess(slug))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ALLOWED_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/html',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed', 'application/x-zip',
  ]);

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // 10 MB limit
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 });
  }

  // File type validation
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({
      error: 'File type not allowed. Accepted: images, PDF, Word, Excel, PowerPoint, CSV, ZIP',
    }, { status: 415 });
  }

  const randomHex = crypto.randomBytes(16).toString('hex');
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `portal/${slug}/${randomHex}-${sanitizedFilename}`;
  // Convert to Buffer to avoid ReadableStream compatibility issues in Node.js runtime
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(filename, buffer, { access: 'public', contentType: file.type });

  return NextResponse.json({ url: blob.url });
}
