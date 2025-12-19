'use client';

import { useEffect, useContext } from 'react';
import Link from 'next/link';
import { PageTitleContext, PageActionsContext } from '@/app/layout';

export default function SSHPage() {
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  useEffect(() => {
    setPageTitle({
      title: 'SSH Terminal',
      description: 'Secure shell access to servers'
    });

    return () => {
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions]);

  return (
    <div>

      {/* Placeholder */}
      <div className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 px-6 py-4 rounded-xl mb-6">
        <div className="font-semibold mb-1">Web Terminal</div>
        <div className="text-sm">
          SSH terminal functionality requires a WebSocket connection to the server.
          Connect using your preferred SSH client or configure web terminal.
        </div>
      </div>

      {/* Quick Connect Options */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Tradelines (7101)', host: 'tradelines.server' },
          { name: 'Portals (7102)', host: 'portals.server' },
          { name: 'NextBidder (7103)', host: 'nextbidder.server' },
          { name: 'Sources (7104)', host: 'sources.server' },
          { name: 'NextTech (7105)', host: 'nexttech.server' },
          { name: 'NextTask (7106)', host: 'nexttask.server' },
        ].map((server) => (
          <div
            key={server.host}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors cursor-pointer"
          >
            <div className="font-medium text-white">{server.name}</div>
            <div className="text-xs text-gray-500 font-mono">{server.host}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
