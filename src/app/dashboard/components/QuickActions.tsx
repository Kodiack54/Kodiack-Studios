'use client';

import { useState } from 'react';

export default function QuickActions() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:border-blue-500 hover:text-blue-400 transition-colors text-sm disabled:opacity-50"
      >
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
