'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserTicketActionsProps {
  ticket: {
    id: string;
    status: string;
    priority: string;
    category: string;
    assigned_to?: string;
    user_id: string;
    user_email: string;
  };
  assignableUsers: User[];
}

export default function UserTicketActions({ ticket, assignableUsers }: UserTicketActionsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleUpdate = async (field: string, value: string) => {
    setUpdating(field);
    try {
      const res = await fetch(`/api/helpdesk/user-tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value || null }),
      });

      const result = await res.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || `Failed to update ${field}`);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  const handleResolve = async () => {
    const resolution = prompt('Enter resolution notes:');
    if (resolution === null) return;

    setUpdating('resolve');
    try {
      const res = await fetch(`/api/helpdesk/user-tickets/${ticket.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });

      const result = await res.json();

      if (result.success) {
        router.push('/helpdesk/user-tickets');
      } else {
        alert(result.error || 'Failed to resolve ticket');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white">Actions</h3>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
        <select
          value={ticket.status}
          onChange={(e) => handleUpdate('status', e.target.value)}
          disabled={updating === 'status'}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
        >
          <option value="open">Open</option>
          <option value="awaiting_response">Awaiting Response</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
        <select
          value={ticket.priority}
          onChange={(e) => handleUpdate('priority', e.target.value)}
          disabled={updating === 'priority'}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
        <select
          value={ticket.category}
          onChange={(e) => handleUpdate('category', e.target.value)}
          disabled={updating === 'category'}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
        >
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="account">Account</option>
          <option value="feedback">Feedback</option>
        </select>
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Assigned To</label>
        <select
          value={ticket.assigned_to || ''}
          onChange={(e) => handleUpdate('assigned_to', e.target.value)}
          disabled={updating === 'assigned_to'}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
        >
          <option value="">Unassigned</option>
          {assignableUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <hr className="border-gray-700" />

      {/* Customer Info */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Customer</label>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-sm text-white">{ticket.user_email}</div>
          <div className="text-xs text-gray-500 mt-1">ID: {ticket.user_id}</div>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-gray-700" />

      {/* Quick Actions */}
      <div className="space-y-2">
        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
          <button
            onClick={handleResolve}
            disabled={updating !== null}
            className="w-full px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg text-sm font-semibold hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {updating === 'resolve' ? 'Resolving...' : 'Mark as Resolved'}
          </button>
        )}
      </div>
    </div>
  );
}
