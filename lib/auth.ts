// Central auth for admin + client-portal + legacy-report sessions.
//
// Every session cookie is a signed, expiring token: `v2.<expMs>.<sig>` where
// sig = HMAC-SHA256(AUTH_SECRET, "<scope>|<subject>|<exp>|<fingerprint>").
//
// AUTH_SECRET is 32 random bytes generated once and stored in the settings
// table — deliberately NOT derived from ADMIN_PASSWORD, so nothing a client
// holds (their own cookie) can be brute-forced back into the admin password.
//
// Fingerprints bind a token to the credential it was minted from:
//   admin  → sha256(ADMIN_PASSWORD)   (changing the password logs everyone out)
//   portal → client.passwordHash + isActive (password reset / deactivation revokes)
//   report → report.passwordHash + isActive
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SECRET_KEY = 'auth_secret_v1';
let cachedSecret: Buffer | null = null;

async function authSecret(): Promise<Buffer> {
  if (cachedSecret) return cachedSecret;
  let row = await prisma.setting.findUnique({ where: { key: SECRET_KEY } });
  if (!row) {
    // create-if-absent: if two instances race, both read back the winner
    await prisma.setting.upsert({
      where: { key: SECRET_KEY },
      create: { key: SECRET_KEY, value: crypto.randomBytes(32).toString('hex') },
      update: {},
    });
    row = await prisma.setting.findUnique({ where: { key: SECRET_KEY } });
  }
  cachedSecret = Buffer.from(row!.value, 'hex');
  return cachedSecret;
}

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

async function sign(payload: string): Promise<string> {
  return crypto.createHmac('sha256', await authSecret()).update(payload).digest('base64url');
}

async function mint(scope: string, subject: string, fingerprint: string, ttlMs: number): Promise<string> {
  const exp = Date.now() + ttlMs;
  return `v2.${exp}.${await sign(`${scope}|${subject}|${exp}|${fingerprint}`)}`;
}

async function check(scope: string, subject: string, fingerprint: string, token?: string | null): Promise<boolean> {
  if (!token || !token.startsWith('v2.')) return false;
  const [, expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!exp || exp < Date.now() || !sig) return false;
  const expected = await sign(`${scope}|${subject}|${exp}|${fingerprint}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Constant-time string compare for shared secrets (bearer tokens, keys). */
export function safeEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// ── Admin ────────────────────────────────────────────────────────────────
export const ADMIN_TTL_MS = 90 * 24 * 3600_000;

function adminFingerprint(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? sha(pw) : null;
}

export async function mintAdminToken(): Promise<string> {
  const fp = adminFingerprint();
  if (!fp) throw new Error('ADMIN_PASSWORD not configured');
  return mint('admin', 'admin', fp, ADMIN_TTL_MS);
}

export async function isAdminToken(token?: string | null): Promise<boolean> {
  const fp = adminFingerprint();
  if (!fp) return false;
  return check('admin', 'admin', fp, token);
}

/** For route handlers / server components: is the caller the admin? */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isAdminToken(store.get('admin_session')?.value);
}

// ── Client portal (pc_<slug>) ───────────────────────────────────────────
export const PORTAL_TTL_MS = 7 * 24 * 3600_000;

async function clientFingerprint(slug: string): Promise<string | null> {
  const c = await prisma.client.findUnique({ where: { slug }, select: { passwordHash: true, isActive: true } });
  if (!c || !c.isActive) return null;
  return sha(c.passwordHash).slice(0, 24);
}

export async function mintClientPortalToken(slug: string): Promise<string | null> {
  const fp = await clientFingerprint(slug);
  return fp ? mint('pc', slug, fp, PORTAL_TTL_MS) : null;
}

export async function isClientPortalToken(slug: string, token?: string | null): Promise<boolean> {
  if (!token) return false;
  const fp = await clientFingerprint(slug);
  return fp ? check('pc', slug, fp, token) : false;
}

/** Client with a valid pc_<slug> cookie, or the admin. */
export async function hasClientPortalAccess(slug: string): Promise<boolean> {
  const store = await cookies();
  if (await isClientPortalToken(slug, store.get(`pc_${slug}`)?.value)) return true;
  return isAdminToken(store.get('admin_session')?.value);
}

/** Only the client themself (NOT admin) — for actions that must be the client's own (sign, accept, submit). */
export async function isClientSession(slug: string): Promise<boolean> {
  const store = await cookies();
  return isClientPortalToken(slug, store.get(`pc_${slug}`)?.value);
}

// ── Legacy report portal (rp_<slug>) ────────────────────────────────────
export const REPORT_TTL_MS = 24 * 3600_000;

async function reportFingerprint(slug: string): Promise<string | null> {
  const r = await prisma.report.findUnique({ where: { slug }, select: { passwordHash: true, isActive: true } });
  if (!r || !r.isActive) return null;
  return sha(r.passwordHash).slice(0, 24);
}

export async function mintReportToken(slug: string): Promise<string | null> {
  const fp = await reportFingerprint(slug);
  return fp ? mint('rp', slug, fp, REPORT_TTL_MS) : null;
}

export async function isReportSession(slug: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(`rp_${slug}`)?.value;
  if (!token) return false;
  const fp = await reportFingerprint(slug);
  return fp ? check('rp', slug, fp, token) : false;
}

// ── Cookie options ──────────────────────────────────────────────────────
export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    path: '/',
    maxAge: maxAgeSec,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}
