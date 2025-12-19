'use client';

import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import MembersTable from './components/MembersTable';

export default function TeamMembersPage() {
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Set page title and actions in nav
  useEffect(() => {
    setPageTitle({
      title: 'Team Members',
      description: 'Manage team member accounts and access'
    });
    setPageActions(
      <Link
        href="/team/members/new"
        className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-semibold hover:bg-white/30 transition-colors border border-white/30"
      >
        + Add Member
      </Link>
    );

    // Cleanup on unmount
    return () => {
      setPageTitle({ title: '', description: '' });
      setPageActions(null);
    };
  }, [setPageTitle, setPageActions]);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [membersRes, rolesRes] = await Promise.all([
          fetch('/api/team/members'),
          fetch('/api/team/roles'),
        ]);

        if (!membersRes.ok) throw new Error('Failed to load members');
        if (!rolesRes.ok) throw new Error('Failed to load roles');

        const membersData = await membersRes.json();
        const rolesData = await rolesRes.json();

        setMembers(membersData);
        setRoles(rolesData);
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

      {/* Members Table */}
      <MembersTable members={members} roles={roles} />
    </div>
  );
}
