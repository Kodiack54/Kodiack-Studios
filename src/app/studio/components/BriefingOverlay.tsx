'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Copy, RefreshCw, Check, Loader2, Database, MessageSquare } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

type TabType = 'packet' | 'chatgpt';

interface BriefingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  projectSlug?: string;
  devTeam: string;
  basePort: number;
  devSlot: string;
  pcTag: string;
  userName: string;
}

interface ServerPacket {
  briefingPacket: string;
  chatgptSyncPayload: string;
  rawData: Record<string, unknown>;
}

export function BriefingOverlay({
  isOpen,
  onClose,
  projectName,
  projectId,
  devTeam,
  basePort,
  devSlot,
  pcTag,
  userName,
}: BriefingOverlayProps) {
  const [activeTab, setActiveTab] = useState<TabType>('packet');
  const [copied, setCopied] = useState<string | null>(null);

  // Server-generated packet state
  const [serverPacket, setServerPacket] = useState<ServerPacket | null>(null);
  const [packetLoading, setPacketLoading] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);

  // Fetch server packet
  const fetchServerPacket = useCallback(async () => {
    if (!projectId) return;

    setPacketLoading(true);
    setPacketError(null);

    try {
      const res = await fetch('/api/studio/project-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          teamId: devTeam,
          basePort,
          devSlot,
          pcTag,
          userName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setServerPacket({
          briefingPacket: data.briefingPacket,
          chatgptSyncPayload: data.chatgptSyncPayload,
          rawData: data.rawData,
        });
      } else {
        setPacketError(data.error || 'Failed to generate packet');
      }
    } catch (err) {
      setPacketError('Network error fetching packet');
      console.error('[BriefingOverlay] Packet fetch error:', err);
    } finally {
      setPacketLoading(false);
    }
  }, [projectId, devTeam, basePort, devSlot, pcTag, userName]);

  // Fetch packet on open
  useEffect(() => {
    if (isOpen && !serverPacket && !packetLoading) {
      fetchServerPacket();
    }
  }, [isOpen, serverPacket, packetLoading, fetchServerPacket]);

  const handleCopy = useCallback(async (content: string, label: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setCopied(null);
    setServerPacket(null);
    fetchServerPacket();
  }, [fetchServerPacket]);

  if (!isOpen) return null;

  const tabConfig = {
    packet: {
      title: 'Project Briefing Packet',
      description: 'Server-generated briefing from live database - paste into Claude',
    },
    chatgpt: {
      title: 'ChatGPT Sync Payload',
      description: 'Paste this into ChatGPT to sync project context',
    },
  };

  const currentTab = tabConfig[activeTab];

  // Get content for current tab
  const currentContent = activeTab === 'packet'
    ? serverPacket?.briefingPacket || ''
    : serverPacket?.chatgptSyncPayload || '';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header with Tabs - neutral slate gradient */}
        <div className="flex flex-col rounded-t-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          {/* Tab Buttons */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('packet')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'packet'
                  ? 'bg-white/10 text-white border-b-2 border-sky-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              Project Packet (Live)
            </button>
            <button
              onClick={() => setActiveTab('chatgpt')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'chatgpt'
                  ? 'bg-white/10 text-white border-b-2 border-sky-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              ChatGPT Sync
            </button>
            <button
              onClick={onClose}
              className="px-4 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Tab Title */}
          <div className="px-6 py-4">
            <h2 className="text-lg font-bold text-white">{currentTab.title}</h2>
            <p className="text-sm text-gray-400">{currentTab.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {packetLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <span className="ml-3 text-gray-400">Generating briefing packet...</span>
            </div>
          ) : packetError ? (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
              <p className="font-medium">Error generating packet</p>
              <p className="text-sm mt-1">{packetError}</p>
              <button
                onClick={fetchServerPacket}
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : serverPacket ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-300">
                  {activeTab === 'packet' ? 'Briefing Packet' : 'Sync Payload'}
                </h3>
                <button
                  onClick={() => handleCopy(currentContent, activeTab)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded"
                >
                  {copied === activeTab ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === activeTab ? 'Copied!' : `Copy ${activeTab === 'packet' ? 'Packet' : 'Payload'}`}
                </button>
              </div>
              <pre className="bg-gray-900 border border-slate-700 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[55vh] overflow-y-auto">
                {currentContent}
              </pre>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Click Refresh to generate packet
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/50 rounded-b-xl">
          <div className="flex items-center gap-2">
            {copied && (
              <span className="flex items-center gap-1 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Copied to clipboard!
              </span>
            )}
            <span className="text-xs text-gray-500">
              {projectName} &bull; {devTeam} &bull; Slot {devSlot}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={packetLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${packetLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => handleCopy(currentContent, activeTab)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
