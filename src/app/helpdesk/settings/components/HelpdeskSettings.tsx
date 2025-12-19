'use client';

import { useState } from 'react';

export default function HelpdeskSettings() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    auto_assign: true,
    auto_response_enabled: false,
    auto_response_message: 'Thank you for contacting support. We have received your request and will respond shortly.',
    notification_email: '',
    slack_webhook: '',
    sla_response_hours: 24,
    sla_resolution_hours: 72,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/helpdesk/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const result = await res.json();

      if (result.success) {
        alert('Settings saved successfully');
      } else {
        alert(result.error || 'Failed to save settings');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* General Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.auto_assign}
              onChange={(e) => setSettings((prev) => ({ ...prev, auto_assign: e.target.checked }))}
              className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
            />
            <div>
              <div className="text-sm font-medium text-white">Auto-assign tickets</div>
              <div className="text-xs text-gray-500">Automatically assign new tickets to available agents</div>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.auto_response_enabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, auto_response_enabled: e.target.checked }))}
              className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
            />
            <div>
              <div className="text-sm font-medium text-white">Auto-response</div>
              <div className="text-xs text-gray-500">Send automatic acknowledgment to new tickets</div>
            </div>
          </label>

          {settings.auto_response_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Auto-response Message
              </label>
              <textarea
                value={settings.auto_response_message}
                onChange={(e) => setSettings((prev) => ({ ...prev, auto_response_message: e.target.value }))}
                rows={3}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* SLA Settings */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">SLA Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Response Time (hours)
            </label>
            <input
              type="number"
              value={settings.sla_response_hours}
              onChange={(e) => setSettings((prev) => ({ ...prev, sla_response_hours: parseInt(e.target.value) || 0 }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
            />
            <div className="text-xs text-gray-500 mt-1">Target time for first response</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Resolution Time (hours)
            </label>
            <input
              type="number"
              value={settings.sla_resolution_hours}
              onChange={(e) => setSettings((prev) => ({ ...prev, sla_resolution_hours: parseInt(e.target.value) || 0 }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
            />
            <div className="text-xs text-gray-500 mt-1">Target time for resolution</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Notification Email
            </label>
            <input
              type="email"
              value={settings.notification_email}
              onChange={(e) => setSettings((prev) => ({ ...prev, notification_email: e.target.value }))}
              placeholder="support@example.com"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
            <div className="text-xs text-gray-500 mt-1">Email for new ticket notifications</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Slack Webhook URL
            </label>
            <input
              type="url"
              value={settings.slack_webhook}
              onChange={(e) => setSettings((prev) => ({ ...prev, slack_webhook: e.target.value }))}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
            <div className="text-xs text-gray-500 mt-1">Optional: Send notifications to Slack</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
