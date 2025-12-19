'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search } from 'lucide-react';

interface EditEventModalProps {
  event: {
    id: string;
    title: string;
    description?: string;
    start_datetime: string;
    end_datetime?: string;
    event_type: string;
    color?: string;
    location_address?: string;
    status: string;
    project?: string;
    assigned_to_ids?: string[];
  };
  onClose: () => void;
  onSuccess: (updatedEvent: any) => void;
  onDelete?: (eventId: string) => void;
}

const EVENT_TYPES = [
  { value: 'task', label: 'Task', color: '#3B82F6' },
  { value: 'meeting', label: 'Meeting', color: '#8B5CF6' },
  { value: 'deploy', label: 'Deploy', color: '#10B981' },
  { value: 'sprint', label: 'Sprint', color: '#F59E0B' },
  { value: 'standup', label: 'Standup', color: '#06B6D4' },
  { value: 'review', label: 'Review', color: '#EC4899' },
  { value: 'maintenance', label: 'Maintenance', color: '#EF4444' },
  { value: 'release', label: 'Release', color: '#84CC16' },
];

const PROJECTS = [
  { value: 'tradelines', label: 'Tradelines (7101)' },
  { value: 'portals', label: 'User Portals (7102)' },
  { value: 'nextbidder', label: 'NextBidder (7103)' },
  { value: 'sources', label: 'Sources (7104)' },
  { value: 'nexttech', label: 'NextTech (7105)' },
  { value: 'nexttask', label: 'NextTask (7106)' },
  { value: 'dashboard', label: 'Dashboard' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

// Mock team members - TODO: load from dev_team_members
const TEAM_MEMBERS = [
  { id: '1', name: 'Michael', email: 'michael@nextbid.com' },
  { id: '2', name: 'Dev Team', email: 'dev@nextbid.com' },
  { id: '3', name: 'Support', email: 'support@nextbid.com' },
];

export default function EditEventModal({
  event,
  onClose,
  onSuccess,
  onDelete
}: EditEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getInitialFormData = () => {
    const startDate = new Date(event.start_datetime);
    const endDate = event.end_datetime ? new Date(event.end_datetime) : null;

    return {
      event_type: event.event_type || 'task',
      title: event.title || '',
      description: event.description || '',
      start_date: startDate.toISOString().split('T')[0],
      start_time: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      end_date: endDate ? endDate.toISOString().split('T')[0] : startDate.toISOString().split('T')[0],
      end_time: endDate ? `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}` : '',
      location_address: event.location_address || '',
      color: event.color || '#3B82F6',
      project: event.project || '',
      assigned_to_ids: event.assigned_to_ids || [],
      status: event.status || 'scheduled'
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [teamSearch, setTeamSearch] = useState('');

  const filteredTeamMembers = TEAM_MEMBERS.filter(member =>
    member.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(teamSearch.toLowerCase())
  );

  function toggleAssignee(memberId: string) {
    setFormData(prev => ({
      ...prev,
      assigned_to_ids: prev.assigned_to_ids.includes(memberId)
        ? prev.assigned_to_ids.filter(id => id !== memberId)
        : [...prev.assigned_to_ids, memberId]
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}:00`);
      const endDateTime = formData.end_time
        ? new Date(`${formData.end_date || formData.start_date}T${formData.end_time}:00`)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const updatedEvent = {
        ...event,
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        location_address: formData.location_address || null,
        color: formData.color,
        project: formData.project || null,
        assigned_to_ids: formData.assigned_to_ids,
        status: formData.status
      };

      // TODO: Save to dev_calendar_events table
      console.log('Updating event:', updatedEvent);

      onSuccess(updatedEvent);
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Error updating event. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);

    try {
      // TODO: Delete from dev_calendar_events table
      console.log('Deleting event:', event.id);
      onDelete(event.id);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Edit Event</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, event_type: type.value, color: type.color })}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    formData.event_type === type.value
                      ? 'text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  style={formData.event_type === type.value ? { backgroundColor: type.color } : {}}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Event title"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Event details, notes, etc."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
            <select
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No project</option>
              {PROJECTS.map((project) => (
                <option key={project.value} value={project.value}>{project.label}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
            <input
              type="text"
              value={formData.location_address}
              onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
              placeholder="Meeting room, address, or video link"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Assign Team Members */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Assign Team Members</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="Search team members..."
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="max-h-32 overflow-y-auto border border-gray-700 rounded-lg">
              {filteredTeamMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleAssignee(member.id)}
                  className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-gray-700 border-b border-gray-700 last:border-b-0 ${
                    formData.assigned_to_ids.includes(member.id) ? 'bg-blue-500/20' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium text-white">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                  {formData.assigned_to_ids.includes(member.id) && (
                    <span className="text-blue-400">✓</span>
                  )}
                </button>
              ))}
            </div>

            {formData.assigned_to_ids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.assigned_to_ids.map(id => {
                  const member = TEAM_MEMBERS.find(m => m.id === id);
                  return member ? (
                    <span
                      key={id}
                      className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm"
                    >
                      {member.name}
                      <button
                        type="button"
                        onClick={() => toggleAssignee(id)}
                        className="ml-1 hover:text-blue-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
            <div className="flex space-x-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div>
              {onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Delete Event
                </button>
              )}
              {showDeleteConfirm && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Delete?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 text-sm font-medium text-gray-400 hover:text-white"
                  >
                    No
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.title || !formData.start_date}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
