import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Credentials live in the settings table too — they must never be shipped to
// a browser (even the admin's: an XSS there would exfiltrate them) and must
// never be overwritable through the generic settings form.
const SECRET_KEYS = new Set(['google_calendar_refresh_token', 'auth_secret_v1']);

export async function GET() {
  const rows = await prisma.setting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    if (SECRET_KEYS.has(row.key)) continue;
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }
  if (SECRET_KEYS.has(String(key))) {
    return NextResponse.json({ error: 'This setting cannot be changed here' }, { status: 403 });
  }
  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
  return NextResponse.json(setting);
}
