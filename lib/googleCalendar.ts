import { google } from 'googleapis';
import { prisma } from './prisma';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // e.g. https://rachnabuilds.com/api/admin/calendar/callback

const TOKEN_KEY = 'google_calendar_refresh_token';
const EMAIL_KEY = 'google_calendar_connected_email';
const CALENDAR_ID = 'primary';

export function getOAuthClient() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('Google Calendar env vars missing (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI)');
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // forces refresh_token to be reissued every connect
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
}

export async function saveTokensFromCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('No refresh_token returned — remove Google account access at myaccount.google.com/permissions and reconnect');
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: client, version: 'v2' });
  const { data } = await oauth2.userinfo.get();

  await prisma.setting.upsert({
    where: { key: TOKEN_KEY },
    create: { key: TOKEN_KEY, value: tokens.refresh_token },
    update: { value: tokens.refresh_token },
  });
  await prisma.setting.upsert({
    where: { key: EMAIL_KEY },
    create: { key: EMAIL_KEY, value: data.email || 'unknown' },
    update: { value: data.email || 'unknown' },
  });
  return data.email;
}

export async function getConnectedEmail(): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: EMAIL_KEY } });
  return row?.value ?? null;
}

export async function disconnectCalendar() {
  await prisma.setting.deleteMany({ where: { key: { in: [TOKEN_KEY, EMAIL_KEY] } } });
}

export async function getAuthedClient() {
  const row = await prisma.setting.findUnique({ where: { key: TOKEN_KEY } });
  if (!row) return null;
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: row.value });
  return client;
}

/** Send an HTML email via the Gmail API using the connected Google account. */
export async function sendViaGmail(to: string, subject: string, html: string): Promise<{ ok: boolean; reason?: string }> {
  const auth = await getAuthedClient();
  if (!auth) {
    console.log(`[email] Google account not connected — skipping email to ${to} | subject: ${subject}`);
    return { ok: false, reason: 'not connected' };
  }
  try {
    const fromEmail = (await getConnectedEmail()) || 'hello@rachnabuilds.com';
    const gmail = google.gmail({ version: 'v1', auth });
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
    const mime = [
      `From: Rachna Builds <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n');
    const raw = Buffer.from(mime, 'utf8').toString('base64url');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    return { ok: true };
  } catch (err) {
    console.error('[email] Gmail send error:', err);
    return { ok: false, reason: err instanceof Error ? err.message : 'send failed' };
  }
}

export async function isCalendarConnected() {
  const row = await prisma.setting.findUnique({ where: { key: TOKEN_KEY } });
  return !!row;
}

/** Returns busy [{start, end}] intervals between two ISO dates. */
export async function getBusyIntervals(timeMin: string, timeMax: string) {
  const auth = await getAuthedClient();
  if (!auth) return [];
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.freebusy.query({
    requestBody: { timeMin, timeMax, items: [{ id: CALENDAR_ID }] },
  });
  const busy = res.data.calendars?.[CALENDAR_ID]?.busy ?? [];
  return busy.map((b) => ({ start: new Date(b.start!), end: new Date(b.end!) }));
}

export async function createCalendarEvent(opts: {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string;
  timezone: string;
}) {
  const auth = await getAuthedClient();
  if (!auth) throw new Error('Google Calendar is not connected');
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: opts.summary,
      description: opts.description,
      start: { dateTime: opts.startTime.toISOString(), timeZone: opts.timezone },
      end: { dateTime: opts.endTime.toISOString(), timeZone: opts.timezone },
      attendees: [{ email: opts.attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId: `rb-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: { useDefault: true },
    },
  });

  return {
    eventId: res.data.id!,
    meetLink: res.data.hangoutLink || res.data.conferenceData?.entryPoints?.[0]?.uri || null,
  };
}

export async function cancelCalendarEvent(eventId: string) {
  const auth = await getAuthedClient();
  if (!auth) return;
  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId, sendUpdates: 'all' }).catch(() => {});
}
