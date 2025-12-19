'use client';

import { useEffect, useContext, Suspense } from 'react';
import Link from 'next/link';
import { Download, RefreshCw } from 'lucide-react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';

export default function LogsPage() {
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  useEffect(() => {
    setPageTitle({
      title: 'System Logs',
      description: 'View and search server logs'
    });

    setPageActions(
      <div className="flex gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    );

    return () => {
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions]);

  return (
    <div>

      {/* Server Selection */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {['All', 'Tradelines', 'Portals', 'NextBidder', 'Sources', 'NextTech', 'NextTask'].map((server) => (
          <button
            key={server}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              server === 'All'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {server}
          </button>
        ))}
      </div>

      {/* Log Viewer */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-sm text-gray-400">Log Output</span>
          <div className="flex gap-2">
            <button className="text-xs text-gray-500 hover:text-white">Clear</button>
            <button className="text-xs text-gray-500 hover:text-white">Export</button>
          </div>
        </div>
        <div className="p-4 font-mono text-xs text-green-400 h-96 overflow-y-auto">
          <div className="text-gray-600">[Waiting for log stream...]</div>
          <div className="mt-2 text-gray-500">
            Connect to a server to view live logs, or use filters to search historical logs.
          </div>
        </div>
      </div>
    </div>
  );
}
