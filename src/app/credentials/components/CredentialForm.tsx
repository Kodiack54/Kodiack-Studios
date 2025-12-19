'use client';

import { useState } from 'react';
import { SourceCredential } from './SourceCard';

interface CredentialFormProps {
  source: SourceCredential;
  onSave: (source: SourceCredential, updates: Record<string, string>) => Promise<void>;
  onClose: () => void;
  onTest?: (source: SourceCredential) => Promise<{ success: boolean; message: string }>;
}

export default function CredentialForm({ source, onSave, onClose, onTest }: CredentialFormProps) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [username, setUsername] = useState(source.username || '');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState(source.apiKey || '');
  const [expiresAt, setExpiresAt] = useState(source.expiresAt?.split('T')[0] || '');

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updates: Record<string, string> = {};

      if (source.type === 'login') {
        if (username) updates.username = username;
        if (password) updates.password = password;
      } else if (source.type === 'api_key') {
        if (apiKey) updates.api_key = apiKey;
      }

      if (expiresAt) updates.expires_at = expiresAt;

      await onSave(source, updates);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    setTestResult(null);

    try {
      const result = await onTest(source);
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, message: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">{source.name}</h3>
            <p className="text-xs text-gray-500">{source.platform}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {testResult && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              testResult.success
                ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                : 'bg-red-500/15 border border-red-500/30 text-red-400'
            }`}>
              {testResult.message}
            </div>
          )}

          {/* Login Type */}
          {source.type === 'login' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={source.hasPassword ? '••••••••' : 'Enter password'}
                    autoComplete="current-password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-400"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {source.hasPassword && !password && (
                  <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing password</p>
                )}
              </div>
            </>
          )}

          {/* API Key Type */}
          {source.type === 'api_key' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-sm pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Expiration Date (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Info */}
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Current Status</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                source.status === 'active' ? 'bg-green-500/20 text-green-400' :
                source.status === 'failed' || source.status === 'expired' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {source.status}
              </span>
            </div>
            {source.lastChecked && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Last Checked</span>
                <span className="text-gray-400 text-xs">
                  {new Date(source.lastChecked).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <div>
            {onTest && (
              <button
                onClick={handleTest}
                disabled={testing || source.status === 'not_configured'}
                className="px-4 py-2 text-sm font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Push'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
