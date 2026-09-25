import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SendTestPush from './SendTestPush';

export const dynamic = 'force-dynamic';

// Push endpoint host → readable platform
function platform(endpoint: string) {
  try {
    const host = new URL(endpoint).host;
    if (host.includes('fcm.googleapis')) return 'Android / Chrome';
    if (host.includes('push.apple')) return 'iPhone / Safari';
    if (host.includes('notify.windows') || host.includes('wns')) return 'Windows';
    if (host.includes('mozilla')) return 'Firefox';
    return host;
  } catch {
    return 'unknown';
  }
}

function when(d: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

export default async function NotificationsPage() {
  const [logs, devices] = await Promise.all([
    prisma.notificationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.pushSubscription.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  const failedCount = logs.filter((l) => l.failed > 0).length;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Notifications</h1>
          <p className="admin-page-subtitle">
            Every push sent to your devices — so a missed alert is still findable
          </p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Devices Subscribed</div>
          <div className="admin-stat-value accent">{devices.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Sent (last 100)</div>
          <div className="admin-stat-value">{logs.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">With Failures</div>
          <div className="admin-stat-value" style={{ color: failedCount ? '#ef4444' : undefined }}>
            {failedCount}
          </div>
        </div>
      </div>

      {devices.length === 0 && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: 20 }}>
          No device is subscribed, so notifications go nowhere. Tap{' '}
          <strong>Enable Notifications</strong> on each phone or laptop that should get lead alerts.
        </div>
      )}

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <h2 className="admin-card-title">Your Devices</h2>
        {devices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>None yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {devices.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 13.5,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {d.label || platform(d.endpoint)}
                  {d.label && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}> · {platform(d.endpoint)}</span>}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  added {when(d.createdAt)}{d.lastSeenAt ? ` · last seen ${when(d.lastSeenAt)}` : ' · not seen since the device-check update'}
                </span>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '14px 0 0' }}>
          Missing a phone or laptop? Open the admin on it and tap <strong>Enable Notifications</strong>. Each
          browser and each person needs their own. On iPhone it only works from the Home Screen app
          (Safari → Share → Add to Home Screen), not from Safari itself.
        </p>
        <div style={{ marginTop: 16 }}>
          <SendTestPush disabled={devices.length === 0} />
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'clip' }}>
        {logs.length === 0 ? (
          <div className="admin-empty">
            Nothing sent yet. Lead alerts, booking alerts and test pushes will all appear here.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Notification</th>
                  <th className="nl-col-delivery">Delivery</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link
                        href={l.url}
                        style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--text)' }}
                      >
                        {l.title}
                      </Link>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {l.body}
                      </div>
                      {l.error && (
                        <div style={{ fontSize: 11.5, color: '#ef4444', marginTop: 4 }}>
                          {l.error}
                        </div>
                      )}
                    </td>
                    <td className="nl-col-delivery" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      <span style={{ color: l.delivered ? '#06D6A0' : 'var(--text-muted)' }}>
                        {l.delivered}/{l.devices}
                      </span>
                      {l.failed > 0 && (
                        <span style={{ color: '#ef4444' }}> · {l.failed} failed</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {when(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
