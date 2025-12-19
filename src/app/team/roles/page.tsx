'use client';

import { useEffect, useState, useContext } from 'react';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import RolesList from './components/RolesList';

export default function TeamRolesPage() {
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);
  const [roles, setRoles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Set page title in nav
  useEffect(() => {
    setPageTitle({
      title: 'Roles & Permissions',
      description: 'System-defined roles and their permissions'
    });
    setPageActions(null);

    return () => {
      setPageTitle({ title: '', description: '' });
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions]);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/team/roles');
        if (!res.ok) throw new Error('Failed to load roles');
        const data = await res.json();
        setRoles(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Roles List */}
      <RolesList roles={roles} />
    </div>
  );
}
