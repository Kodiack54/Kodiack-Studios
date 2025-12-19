'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
  level: number;
  description: string;
}

export default function AddMemberPage() {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('developer');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoles() {
      try {
        const res = await fetch('/api/team/roles');
        const data = await res.json();
        setRoles(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: email.split('@')[0], // Use email prefix as name
          email: email.toLowerCase(),
          role: selectedRole,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to add member');
      }

      router.push('/team/members');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const selectedRoleInfo = roles.find(r => r.id === selectedRole);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/team" className="hover:text-white transition-colors">
            Team
          </Link>
          <span>/</span>
          <Link href="/team/members" className="hover:text-white transition-colors">
            Members
          </Link>
          <span>/</span>
          <span className="text-white">Add Member</span>
        </div>
        <h2 className="text-2xl font-semibold text-white">Add Team Member</h2>
        <p className="text-gray-400 text-sm">
          Grant Dashboard access to an existing NextBid user
        </p>
      </div>

      {/* Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-lg mb-6">
        <strong>Note:</strong> The user must already have a NextBid account (registered via Gateway).
        This form grants them access to the Dashboard with a specific role.
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-2 text-sm text-gray-500">
            Must match their NextBid account email
          </p>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Role
          </label>
          {loading ? (
            <div className="text-gray-400">Loading roles...</div>
          ) : (
            <>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} (Level {role.level})
                  </option>
                ))}
              </select>
              {selectedRoleInfo && (
                <p className="mt-2 text-sm text-gray-500">
                  {selectedRoleInfo.description}
                </p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Member'}
          </button>
          <Link
            href="/team/members"
            className="px-6 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
