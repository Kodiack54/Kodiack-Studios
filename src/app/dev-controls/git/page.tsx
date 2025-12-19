'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { RoleGate, PermissionButton } from '@/app/settings/RoleGate';
import { gitPullDev, pushDevToProd } from '../api';
import { PageTitleContext, PageActionsContext } from '@/app/layout';

export default function GitPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  useEffect(() => {
    setPageTitle({
      title: 'Git Repositories',
      description: 'Manage code repositories and branches'
    });

    setPageActions(
      <button className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-black/30 rounded-lg text-white text-sm transition-colors">
        <RefreshCw className="w-3.5 h-3.5" />
        Fetch All
      </button>
    );

    return () => {
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions]);

  const repositories = [
    { id: 'tradelines', name: 'NextBid Engine Patcher', branch: 'main', lastCommit: '2 hours ago' },
    { id: 'sources', name: 'NextSource Patcher', branch: 'main', lastCommit: '1 day ago' },
    { id: 'nextbidder', name: 'NextBidder Patcher', branch: 'develop', lastCommit: '3 hours ago' },
    { id: 'portals', name: 'NextBid Portal Patcher', branch: 'main', lastCommit: '5 hours ago' },
    { id: 'nexttech', name: 'NextTech Patcher', branch: 'main', lastCommit: '1 week ago' },
    { id: 'nexttask', name: 'NextTask Patcher', branch: 'main', lastCommit: '2 days ago' },
    { id: 'dashboard', name: 'NextBid Dashboard', branch: 'main', lastCommit: 'just now' },
  ];

  const handlePull = async (repoId: string) => {
    setLoading(`pull-${repoId}`);
    try {
      const result = await gitPullDev();
      alert('Pull successful');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const handlePush = async (repoId: string) => {
    if (!confirm('Push changes to production repository?')) return;
    setLoading(`push-${repoId}`);
    try {
      const result = await pushDevToProd();
      alert('Push successful');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>

      {/* Repositories */}
      <div className="space-y-3">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-purple-500/5 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white mb-1">{repo.name}</div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="text-purple-400">⎇</span>
                    {repo.branch}
                  </span>
                  <span>Last commit: {repo.lastCommit}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <RoleGate permission="canPushToTest">
                  <button
                    onClick={() => handlePull(repo.id)}
                    disabled={loading === `pull-${repo.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loading === `pull-${repo.id}` ? 'Pulling...' : 'Pull'}
                  </button>
                </RoleGate>
                <RoleGate permission="canPushToProd">
                  <button
                    onClick={() => handlePush(repo.id)}
                    disabled={loading === `push-${repo.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loading === `push-${repo.id}` ? 'Pushing...' : 'Push'}
                  </button>
                </RoleGate>
                <button className="px-3 py-1.5 text-xs font-semibold rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
