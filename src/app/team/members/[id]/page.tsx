'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageTitleContext, PageActionsContext } from '@/app/layout';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  phone?: string;
  title?: string;
  department?: string;
}

interface Role {
  id: string;
  name: string;
  level: number;
  description: string;
}

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);

  const [member, setMember] = useState<Member | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // If there's an avatar file, upload it first
      let uploadedAvatarUrl = avatarUrl;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('memberId', memberId);

        const uploadRes = await fetch('/api/team/members/upload-avatar', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadResult = await uploadRes.json();
          uploadedAvatarUrl = uploadResult.url;
        }
      }

      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          status: selectedStatus,
          phone,
          title,
          department,
          avatar_url: uploadedAvatarUrl,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to update member');
      }

      setSuccess('Member updated successfully!');
      setMember(result.member);
      setAvatarFile(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this member\'s Dashboard access?')) {
      return;
    }

    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to delete member');
      }

      router.push('/team/members');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [memberRes, rolesRes] = await Promise.all([
          fetch(`/api/team/members/${memberId}`),
          fetch('/api/team/roles'),
        ]);

        if (!memberRes.ok) {
          throw new Error('Member not found');
        }

        const memberData = await memberRes.json();
        const rolesData = await rolesRes.json();

        setMember(memberData);
        setRoles(rolesData);
        setSelectedRole(memberData.role);
        setSelectedStatus(memberData.status);
        setPhone(memberData.phone || '');
        setTitle(memberData.title || '');
        setDepartment(memberData.department || '');
        setAvatarUrl(memberData.avatar_url || '');
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [memberId]);

  // Set page title and actions in nav
  useEffect(() => {
    setPageTitle({
      title: member ? `Edit ${member.name}` : 'Edit Member',
      description: member ? member.email : 'Update role and permissions'
    });

    setPageActions(
      <div className="flex items-center gap-2">
        <Link
          href="/team/members"
          className="px-4 py-1.5 bg-black/20 text-white rounded-lg text-sm font-semibold hover:bg-black/30 transition-colors border border-black/30"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 border border-black/30"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    );

    return () => {
      setPageTitle({ title: '', description: '' });
      setPageActions(null);
    };
  }, [member, saving, setPageTitle, setPageActions, selectedRole, selectedStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
        Member not found
      </div>
    );
  }

  const selectedRoleInfo = roles.find(r => r.id === selectedRole);

  return (
    <div>
      {/* Alerts */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/15 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      {/* Profile Photo & Basic Info */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Profile</h3>

        <div className="flex items-start gap-6 mb-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-3xl overflow-hidden border-2 border-gray-600">
              {avatarPreview || avatarUrl ? (
                <img
                  src={avatarPreview || avatarUrl}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                member.name.charAt(0).toUpperCase()
              )}
            </div>
            <label className="mt-3 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-600 transition-colors cursor-pointer">
              Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Name & Email (read-only from nextbid_users) */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <div className="text-white text-lg">{member.name}</div>
              <p className="text-xs text-gray-500">Name is managed via NextBid account</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <div className="text-white">{member.email}</div>
              <p className="text-xs text-gray-500">Email is managed via NextBid account</p>
            </div>
          </div>
        </div>

        {/* Editable Profile Fields */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Job Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Developer"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. (555) 123-4567"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Role & Access */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Role & Access</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} (Level {role.level})
                </option>
              ))}
            </select>
            {selectedRoleInfo && (
              <p className="mt-2 text-xs text-gray-500">
                {selectedRoleInfo.description}
              </p>
            )}
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-gray-800 border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-gray-400 text-sm mb-4">
          Removing Dashboard access will prevent this user from accessing the dev dashboard.
          Their NextBid account will remain active.
        </p>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg font-semibold hover:bg-red-500 hover:text-white transition-colors"
        >
          Remove Dashboard Access
        </button>
      </div>
    </div>
  );
}
