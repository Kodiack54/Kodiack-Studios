'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
}

interface TicketActionsProps {
  ticket: {
    id: string;
    status: string;
    priority: string;
    assignee?: string;
  };
  assignableUsers: User[];
}

export default function TicketActions({ ticket, assignableUsers }: TicketActionsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating('status');
    try {
      const res = await fetch(`/api/helpdesk/system-tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await res.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    setUpdating('priority');
    try {
      const res = await fetch(`/api/helpdesk/system-tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      const result = await res.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || 'Failed to update priority');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  const handleAssigneeChange = async (newAssignee: string) => {
    setUpdating('assignee');
    try {
      const res = await fetch(`/api/helpdesk/system-tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee: newAssignee || null }),
      });

      const result = await res.json();

      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error || 'Failed to update assignee');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(null);
    }
  };

  const handleClose = async () => {
    const resolution = prompt('Enter resolution notes (optional):');
    if (resolution === null) return;

    setUpdating('close');
    try {
      const res = await fetch(`/api/helpdesk/system-tickets/${ticket.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });

      const result = await res.json();

      if (result.success) {
        router.push('/helpdesk/system-tickets');
      } else {
        alert(result.error || 'Failed to close ticket');
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
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updating === 'status'}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
        >
          <option value="open">Open</option>
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
          onChange={(e) => handlePriorityChange(e.target.value)}
          disabled={updating === 'priority'}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Assignee</label>
        <select
          value={ticket.assignee || ''}
          onChange={(e) => handleAssigneeChange(e.target.value)}
          disabled={updating === 'assignee'}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
        >
          <option value="">Unassigned</option>
          {assignableUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <hr className="border-gray-700" />

      {/* Quick Actions */}
      <div className="space-y-2">
        {ticket.status !== 'closed' && (
          <button
            onClick={handleClose}
            disabled={updating !== null}
            className="w-full px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {updating === 'close' ? 'Closing...' : 'Close Ticket'}
          </button>
        )}
      </div>
    </div>
  );
}
