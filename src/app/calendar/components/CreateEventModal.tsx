'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreateEventModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialHour?: number;
}

const EVENT_TYPES = [
  { value: 'deploy', label: 'Deployment' },
  { value: 'sprint', label: 'Sprint Planning' },
  { value: 'standup', label: 'Standup' },
  { value: 'review', label: 'Code Review' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'task', label: 'Task' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'release', label: 'Release' },
];

const COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
];

export default function CreateEventModal({
  onClose,
  onSuccess,
  initialDate,
  initialHour,
}: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);

  const getInitialTimes = () => {
    let startDate = '';
    let startTime = '';
    let endTime = '';

    if (initialDate) {
      const year = initialDate.getFullYear();
      const month = String(initialDate.getMonth() + 1).padStart(2, '0');
      const day = String(initialDate.getDate()).padStart(2, '0');
      startDate = `${year}-${month}-${day}`;
    }

    if (initialHour !== undefined) {
      const hours = String(initialHour).padStart(2, '0');
      startTime = `${hours}:00`;
      const endHour = (initialHour + 1) % 24;
      endTime = `${String(endHour).padStart(2, '0')}:00`;
    }

    return { startDate, startTime, endTime };
  };

  const { startDate, startTime, endTime } = getInitialTimes();

  const [formData, setFormData] = useState({
    event_type: 'task',
    title: '',
    description: '',
    start_date: startDate,
    start_time: startTime,
    end_date: '',
    end_time: endTime,
    all_day: false,
    color: '#3B82F6',
    assigned_devs: [] as string[],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // For now, just log - will integrate with dev_calendar_events table
      const startDateTime = formData.all_day
        ? `${formData.start_date}T00:00:00`
        : `${formData.start_date}T${formData.start_time}:00`;

      const endDateTime = formData.end_date
        ? formData.all_day
          ? `${formData.end_date}T23:59:59`
          : `${formData.end_date}T${formData.end_time || '23:59'}:00`
        : formData.end_time
          ? `${formData.start_date}T${formData.end_time}:00`
          : null;

      console.log('Creating event:', {
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description,
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        all_day: formData.all_day,
        color: formData.color,
      });

      // TODO: Save to dev_calendar_events table
      alert('Event created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-700">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Create Event</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
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
                  onClick={() => setFormData({ ...formData, event_type: type.value })}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    formData.event_type === type.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
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
              placeholder="e.g., Deploy Tradelines v2.5"
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
              placeholder="Details, notes, links..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* All Day Toggle */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.all_day}
                onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">All day event</span>
            </label>
          </div>

          {/* Dates */}
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

            {!formData.all_day && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Time *</label>
                <select
                  value={formData.start_time}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    const [hours] = newStartTime.split(':').map(Number);
                    const endHour = (hours + 1) % 24;
                    const newEndTime = `${String(endHour).padStart(2, '0')}:00`;
                    setFormData({ ...formData, start_time: newStartTime, end_time: newEndTime });
                  }}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!formData.all_day}
                >
                  <option value="">Select time...</option>
                  {Array.from({ length: 96 }, (_, i) => {
                    const hour = Math.floor(i / 4);
                    const minute = (i % 4) * 15;
                    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    const ampm = hour < 12 ? 'AM' : 'PM';
                    return (
                      <option key={timeStr} value={timeStr}>
                        {displayHour}:{String(minute).padStart(2, '0')} {ampm}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date (Optional)</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {!formData.all_day && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Time *</label>
                <select
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!formData.all_day}
                >
                  <option value="">Select time...</option>
                  {Array.from({ length: 96 }, (_, i) => {
                    const hour = Math.floor(i / 4);
                    const minute = (i % 4) * 15;
                    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    const ampm = hour < 12 ? 'AM' : 'PM';
                    return (
                      <option key={timeStr} value={timeStr}>
                        {displayHour}:{String(minute).padStart(2, '0')} {ampm}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
            <div className="flex space-x-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    formData.color === color.value ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
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
              <span>{loading ? 'Creating...' : 'Create Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
