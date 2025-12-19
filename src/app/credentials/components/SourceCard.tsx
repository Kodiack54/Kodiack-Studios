'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface SourceCredential {
  id: string;
  name: string;
  platform: string;
  type: 'api_key' | 'login' | 'oauth';
  status: 'active' | 'expired' | 'expiring' | 'failed' | 'not_configured';
  username?: string;
  hasPassword?: boolean;
  apiKey?: string;
  expiresAt?: string;
  lastChecked?: string;
  lastError?: string;
  balance?: number;
  portalCount?: number;
  categoryCount?: number;
  tradelines?: string[];
}

interface SourceCardProps {
  source: SourceCredential;
  onEdit?: (source: SourceCredential) => void;
  onTest?: (source: SourceCredential) => void;
  onSync?: (source: SourceCredential) => void;
  href?: string;
}

export default function SourceCard({ source, onEdit, onTest, onSync, href }: SourceCardProps) {
  const [testing, setTesting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      case 'expiring': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'not_configured': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 border-green-500/30';
      case 'expired': return 'bg-red-500/10 border-red-500/30';
      case 'expiring': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'failed': return 'bg-red-500/10 border-red-500/30';
      case 'not_configured': return 'bg-gray-800 border-gray-700';
      default: return 'bg-gray-800 border-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'expiring': return 'Expiring Soon';
      case 'failed': return 'Login Failed';
      case 'not_configured': return 'Not Configured';
      default: return status;
    }
  };

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    await onTest(source);
    setTesting(false);
  };

  const daysUntilExpiry = source.expiresAt
    ? Math.ceil((new Date(source.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className={`border rounded-xl p-4 ${getStatusBg(source.status)}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(source.status)}`} />
          <div>
            <h4 className="font-medium text-white">{source.name}</h4>
            <p className="text-xs text-gray-500">{source.platform}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs rounded ${
            source.status === 'active' ? 'bg-green-500/20 text-green-400' :
            source.status === 'expired' || source.status === 'failed' ? 'bg-red-500/20 text-red-400' :
            source.status === 'expiring' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            {getStatusText(source.status)}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {source.type === 'login' && source.username && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Username</span>
            <span className="text-gray-300 font-mono text-xs">{source.username}</span>
          </div>
        )}
        {source.type === 'api_key' && source.apiKey && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">API Key</span>
            <span className="text-gray-300 font-mono text-xs">
              {source.apiKey.substring(0, 8)}...{source.apiKey.slice(-4)}
            </span>
          </div>
        )}
        {source.balance !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Balance</span>
            <span className={`font-medium ${source.balance < 10 ? 'text-red-400' : source.balance < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
              ${source.balance.toFixed(2)}
            </span>
          </div>
        )}
        {daysUntilExpiry !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Expires</span>
            <span className={`${daysUntilExpiry < 7 ? 'text-red-400' : daysUntilExpiry < 30 ? 'text-yellow-400' : 'text-gray-300'}`}>
              {daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry} days`}
            </span>
          </div>
        )}
        {source.portalCount !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Portals</span>
            <span className="text-gray-300">{source.portalCount}</span>
          </div>
        )}
        {source.lastError && (
          <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1 mt-2">
            {source.lastError}
          </div>
        )}
      </div>

      {/* Tradelines */}
      {source.tradelines && source.tradelines.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {source.tradelines.slice(0, 4).map((t, i) => (
              <span key={i} className="px-1.5 py-0.5 text-xs bg-gray-700/50 text-gray-400 rounded capitalize">
                {t}
              </span>
            ))}
            {source.tradelines.length > 4 && (
              <span className="px-1.5 py-0.5 text-xs text-gray-500">
                +{source.tradelines.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {href ? (
          <Link
            href={href}
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-center"
          >
            Configure
          </Link>
        ) : onEdit ? (
          <button
            onClick={() => onEdit(source)}
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            Edit
          </button>
        ) : null}
        {onTest && (
          <button
            onClick={handleTest}
            disabled={testing || source.status === 'not_configured'}
            className="px-3 py-1.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {testing ? '...' : 'Test'}
          </button>
        )}
        {onSync && (
          <button
            onClick={() => onSync(source)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Sync
          </button>
        )}
      </div>
    </div>
  );
}
