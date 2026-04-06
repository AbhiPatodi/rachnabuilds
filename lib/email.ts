import { Resend } from 'resend';

const FROM = 'Rachna Builds <noreply@rachnabuilds.com>';
const ADMIN_EMAIL = 'rachnajain2103@gmail.com';
const SITE_URL = 'https://rachnabuilds.com';

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

// ─── Base layout ─────────────────────────────────────────────────────────────

function base(preheader: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Rachna Builds</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#F1F5F9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;font-size:1px;color:#F1F5F9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Logo header -->
          <tr>
            <td style="background:#0B0F1A;padding:24px 36px 22px;border-radius:12px 12px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#06D6A0;letter-spacing:-0.5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Rachna<span style="color:#ffffff;">Builds</span></span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#4A5568;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:0.05em;text-transform:uppercase;">Client Portal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;padding:20px 36px;border-top:1px solid #E2E8F0;border-radius:0 0 12px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;color:#94A3B8;line-height:1.7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                    You received this because you are a client of Rachna Builds.
                    Questions? Reply to this email or write to
                    <a href="mailto:rachnajain2103@gmail.com" style="color:#06D6A0;text-decoration:none;">rachnajain2103@gmail.com</a>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${SITE_URL}" style="font-size:11px;color:#CBD5E1;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;white-space:nowrap;">rachnabuilds.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Component helpers ────────────────────────────────────────────────────────

function heading(text: string): string {
  return `<h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;line-height:1.25;">${text}</h1>`;
}

function subheading(text: string): string {
  return `<p style="margin:0 0 24px;font-size:14px;color:#64748B;line-height:1.5;">${text}</p>`;
}

function bodyText(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">${html}</p>`;
}

function em(text: string): string {
  return `<strong style="color:#0F172A;font-weight:700;">${text}</strong>`;
}

function accentText(text: string): string {
  return `<span style="color:#06D6A0;font-weight:600;">${text}</span>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;"/>`;
}

function infoBox(rows: Array<{ label: string; value: string }>): string {
  const cells = rows.map(r => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #F1F5F9;vertical-align:top;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#94A3B8;">${r.label}</span>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #F1F5F9;vertical-align:top;">
        <span style="font-size:14px;color:#1E293B;font-weight:500;">${r.value}</span>
      </td>
    </tr>`).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin:20px 0;overflow:hidden;">
      ${cells}
    </table>`;
}

function quoteBox(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="border-left:3px solid #06D6A0;padding:12px 18px;background:#F0FDF9;border-radius:0 6px 6px 0;">
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;font-style:italic;">${text}</p>
        </td>
      </tr>
    </table>`;
}

function ctaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
      <tr>
        <td style="background:#06D6A0;border-radius:8px;">
          <a href="${url}" style="display:inline-block;padding:13px 30px;background:#06D6A0;color:#0B0F1A;font-size:14px;font-weight:800;text-decoration:none;border-radius:8px;letter-spacing:-0.01em;">${label} →</a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0;font-size:12px;color:#94A3B8;">Or copy this link: <a href="${url}" style="color:#06D6A0;text-decoration:none;">${url}</a></p>`;
}

function adminCtaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
      <tr>
        <td style="background:#1E293B;border-radius:8px;border:1px solid #334155;">
          <a href="${url}" style="display:inline-block;padding:13px 30px;background:#1E293B;color:#06D6A0;font-size:14px;font-weight:800;text-decoration:none;border-radius:8px;letter-spacing:-0.01em;">${label} →</a>
        </td>
      </tr>
    </table>`;
}

// ─── Low-level wrapper ────────────────────────────────────────────────────────

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; reason?: string }> {
  const client = getResend();
  if (!client) {
    console.log(`[email] RESEND_API_KEY not set — skipping email to ${to} | subject: ${subject}`);
    return { ok: false, reason: 'no key' };
  }

  try {
    const { error } = await client.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error('[email] Resend error:', error);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email] sendEmail threw:', err);
    return { ok: false, reason: 'exception' };
  }
}

// ─── Client notifications ─────────────────────────────────────────────────────

/** Contract is ready to sign — sent to client */
export async function notifyContractReady(
  clientEmail: string,
  clientName: string,
  projectName: string,
  portalUrl: string,
): Promise<{ ok: boolean; reason?: string }> {
  const firstName = clientName.split(' ')[0];
  const html = base(
    `Your contract for ${projectName} is ready to sign.`,
    `
    ${heading('Your contract is ready to sign')}
    ${subheading('Action required — please review and sign at your earliest convenience.')}
    ${bodyText(`Hi ${em(firstName)},`)}
    ${bodyText(`Rachna has prepared and sent your contract for the project below. Please log in to your client portal to review the full terms and sign it digitally.`)}
    ${infoBox([
      { label: 'Project', value: projectName },
      { label: 'Next step', value: 'Review & sign the contract in your portal' },
    ])}
    ${ctaButton('Review & Sign Contract', portalUrl)}
    ${divider()}
    ${bodyText(`If you have any questions before signing, simply reply to this email or message Rachna directly at <a href="mailto:rachnajain2103@gmail.com" style="color:#06D6A0;text-decoration:none;">rachnajain2103@gmail.com</a>.`)}
    `,
  );

  return sendEmail(clientEmail, `Contract ready to sign — ${projectName}`, html);
}

/** New document shared by admin — sent to client */
export async function notifyDocumentAdded(
  clientEmail: string,
  clientName: string,
  docTitle: string,
  projectName: string,
  portalUrl: string,
): Promise<{ ok: boolean; reason?: string }> {
  const firstName = clientName.split(' ')[0];
  const html = base(
    `Rachna has shared a new document on ${projectName}.`,
    `
    ${heading('New document shared with you')}
    ${subheading('A file is waiting for you in your client portal.')}
    ${bodyText(`Hi ${em(firstName)},`)}
    ${bodyText(`Rachna has added a new document to your project. You can view, download, and confirm receipt directly from your portal.`)}
    ${infoBox([
      { label: 'Document', value: docTitle },
      { label: 'Project', value: projectName },
    ])}
    ${ctaButton('View Document', portalUrl)}
    `,
  );

  return sendEmail(clientEmail, `New document: ${docTitle}`, html);
}

/** Client posted a comment — sent to Rachna */
export async function notifyClientComment(
  projectName: string,
  clientName: string,
  commentText: string,
  adminProjectUrl: string,
): Promise<{ ok: boolean; reason?: string }> {
  const preview = commentText.length > 300 ? commentText.slice(0, 300) + '…' : commentText;
  const html = base(
    `${clientName} left a comment on ${projectName}.`,
    `
    ${heading('New comment from client')}
    ${subheading(`${projectName} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`)}
    ${bodyText(`${accentText(clientName)} left a comment in their client portal:`)}
    ${quoteBox(preview)}
    ${adminCtaButton('View in Admin', adminProjectUrl)}
    ${divider()}
    ${bodyText(`<span style="font-size:13px;color:#94A3B8;">You can reply directly from the project's Messages tab in your admin panel.</span>`)}
    `,
  );

  return sendEmail(ADMIN_EMAIL, `💬 ${clientName} commented — ${projectName}`, html);
}

/** Proposal accepted — sent to Rachna */
export async function notifyProposalAccepted(
  projectName: string,
  clientName: string,
  acceptedBy: string,
  adminProjectUrl: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acceptedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const html = base(
    `${clientName} has accepted the proposal for ${projectName}.`,
    `
    ${heading('Proposal accepted! 🎉')}
    ${subheading('Your client has reviewed and accepted the project proposal.')}
    ${bodyText(`${accentText(clientName)} has formally accepted the proposal for ${em(projectName)}. You can now move forward with sending the contract and scheduling the project kickoff.`)}
    ${infoBox([
      { label: 'Project', value: projectName },
      { label: 'Client', value: clientName },
      { label: 'Signed by', value: acceptedBy },
      { label: 'Accepted on', value: acceptedAt },
      { label: 'Next step', value: 'Send the contract' },
    ])}
    ${adminCtaButton('View Project & Send Contract', adminProjectUrl)}
    `,
  );

  return sendEmail(ADMIN_EMAIL, `✅ Proposal accepted — ${projectName}`, html);
}
