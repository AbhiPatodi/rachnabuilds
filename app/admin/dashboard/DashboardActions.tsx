'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  reportId: string;
  reportSlug: string;
  isActive: boolean;
}

export default function DashboardActions({ reportId, reportSlug, isActive }: Props) {
  const router = useRouter();

  const copyLink = () => {
    navigator.clipboard.writeText(`rachnabuilds.com/reports/${reportSlug}`);
  };

  const toggleActive = async () => {
    await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <Link href={`/admin/reports/${reportId}`} className="admin-btn admin-btn-ghost admin-btn-icon">
        Manage →
      </Link>
      <button className="admin-btn admin-btn-ghost admin-btn-icon" onClick={copyLink} title="Copy portal link">
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
      </button>
      <button
        className={`admin-btn admin-btn-icon ${isActive ? 'admin-btn-danger' : 'admin-btn-ghost'}`}
        onClick={toggleActive}
        title={isActive ? 'Deactivate' : 'Activate'}
        style={{ fontSize: 11 }}
      >
        {isActive ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}
