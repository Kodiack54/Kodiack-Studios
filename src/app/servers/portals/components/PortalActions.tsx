'use client';

import Link from 'next/link';
import { useState } from 'react';

interface PortalActionsProps {
  portal: {
    id: string;
    name: string;
    status: string;
  };
}

export default function PortalActions({ portal }: PortalActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(action);

    try {
      const res = await fetch(`/api/portals/${action}/${portal.id}`, { method: 'POST' });
      const result = await res.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || 'Action failed');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      <Link
        href={`/servers/portals/${portal.id}`}
        className="px-3 py-1 text-xs font-semibold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors"
      >
        View
      </Link>
      <button
        onClick={() => handleAction('deploy')}
        disabled={loading !== null}
        className="px-3 py-1 text-xs font-semibold rounded bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
      >
        {loading === 'deploy' ? '...' : 'Deploy'}
      </button>
      <Link
        href={`/servers/portals/credentials?portal=${portal.id}`}
        className="px-3 py-1 text-xs font-semibold rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-colors"
      >
        Creds
      </Link>
    </div>
  );
}
