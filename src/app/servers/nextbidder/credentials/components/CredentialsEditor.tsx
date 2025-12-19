'use client';

import { useState } from 'react';

interface CredentialsEditorProps {
  credentials: any;
}

const credentialTypes = [
  {
    key: 'govplanet',
    label: 'GovPlanet',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password' as const },
    ],
  },
  {
    key: 'publicsurplus',
    label: 'Public Surplus',
    fields: [
      { key: 'username', label: 'Username', type: 'text' as const },
      { key: 'password', label: 'Password', type: 'password' as const },
    ],
  },
  {
    key: 'govdeals',
    label: 'GovDeals',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password' as const },
    ],
  },
  {
    key: 'propertyroom',
    label: 'PropertyRoom',
    fields: [
      { key: 'username', label: 'Username', type: 'text' as const },
      { key: 'password', label: 'Password', type: 'password' as const },
    ],
  },
];

export default function CredentialsEditor({ credentials }: CredentialsEditorProps) {
  const [activeTab, setActiveTab] = useState(credentialTypes[0].key);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>(credentials || {});
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleFieldChange = (typeKey: string, fieldKey: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [typeKey]: {
        ...(prev[typeKey] || {}),
        [fieldKey]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/nextbidder/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: formData }),
      });
      const result = await res.json();
      if (result.success) {
        alert('Credentials saved successfully');
      } else {
        alert(result.error || 'Failed to save');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const activeType = credentialTypes.find((t) => t.key === activeTab);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl">
      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-6">
        {credentialTypes.map((type) => (
          <button
            key={type.key}
            onClick={() => setActiveTab(type.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === type.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeType && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-4">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded bg-gray-700 border-gray-600"
              />
              Show passwords
            </label>

            {activeType.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type === 'password' && !showPasswords ? 'password' : 'text'}
                  value={formData[activeTab]?.[field.key] || ''}
                  onChange={(e) => handleFieldChange(activeTab, field.key, e.target.value)}
                  className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end px-6 py-4 border-t border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
