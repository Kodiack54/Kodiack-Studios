'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface TimeAdjustmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TimeAdjustmentModal({ onClose, onSuccess }: TimeAdjustmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    request_type: 'missed_punch',
    adjustment_date: '',
    original_clock_in: '',
    original_clock_out: '',
    requested_clock_in: '',
    requested_clock_out: '',
    requested_break_minutes: 0,
    reason: '',
    detailed_description: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Save to dev_timesheet_adjustments table
      console.log('Timesheet adjustment:', formData);
      alert('Timesheet adjustment request submitted! Your manager will review it.');
      onSuccess();
    } catch (error) {
      console.error('Error submitting adjustment:', error);
      alert('Error submitting request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Request Timesheet Adjustment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What needs to be corrected? *
            </label>
            <select
              value={formData.request_type}
              onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="missed_punch">Forgot to Clock In/Out</option>
              <option value="clock_in_correction">Clock In Time Wrong</option>
              <option value="clock_out_correction">Clock Out Time Wrong</option>
              <option value="missed_break">Forgot to Log Break</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date of Work *
            </label>
            <input
              type="date"
              value={formData.adjustment_date}
              onChange={(e) => setFormData({ ...formData, adjustment_date: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Original Times */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Original Time (What it shows now)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Clock In
                </label>
                <input
                  type="time"
                  value={formData.original_clock_in}
                  onChange={(e) => setFormData({ ...formData, original_clock_in: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Clock Out
                </label>
                <input
                  type="time"
                  value={formData.original_clock_out}
                  onChange={(e) => setFormData({ ...formData, original_clock_out: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Requested Times */}
          <div>
            <h3 className="text-sm font-semibold text-blue-400 mb-3">Requested Time (What it should be) *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Clock In *
                </label>
                <input
                  type="time"
                  value={formData.requested_clock_in}
                  onChange={(e) => setFormData({ ...formData, requested_clock_in: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border-2 border-blue-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Clock Out *
                </label>
                <input
                  type="time"
                  value={formData.requested_clock_out}
                  onChange={(e) => setFormData({ ...formData, requested_clock_out: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border-2 border-blue-500 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Break Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Break Time (minutes)
            </label>
            <input
              type="number"
              min="0"
              step="15"
              value={formData.requested_break_minutes}
              onChange={(e) => setFormData({ ...formData, requested_break_minutes: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 30 for 30-minute lunch"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason *
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Forgot to clock out for lunch"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional Details
            </label>
            <textarea
              value={formData.detailed_description}
              onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
              rows={3}
              placeholder="Please provide any additional context that will help your manager approve this request"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
              disabled={loading || !formData.adjustment_date || !formData.requested_clock_in || !formData.requested_clock_out || !formData.reason}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
