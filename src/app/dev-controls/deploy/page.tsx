'use client';

import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { Rocket, RefreshCw } from 'lucide-react';
import { getDeployments } from '../api';
import DeploymentsList from './components/DeploymentsList';
import { PageTitleContext, PageActionsContext } from '@/app/layout';

export default function DeployPage() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const data = await getDeployments({ limit: 20 });
      setDeployments(data?.jobs || []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPageTitle({
      title: 'Deployments',
      description: 'View and manage deployment history'
    });

    setPageActions(
      <div className="flex gap-1">
        <Link
          href="/dev-controls/releases"
          className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/80 hover:bg-cyan-500 border border-black/30 rounded-lg text-white text-sm transition-colors"
        >
          <Rocket className="w-3.5 h-3.5" />
          New Deploy
        </Link>
      </div>
    );

    return () => {
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions]);

  useEffect(() => {
    fetchDeployments();
  }, []);

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-gray-400 text-center py-8">Loading deployments...</div>
      ) : (
        <DeploymentsList deployments={deployments} />
      )}
    </div>
  );
}
