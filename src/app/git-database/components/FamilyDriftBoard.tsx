'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FamilySummary, FamilySummaryResponse, RepoPairSummary, GitSummaryResponse } from '../lib/types';

interface FamilyDriftBoardProps {
  viewFilter?: 'all' | 'studio' | 'ai_team';
}

export default function FamilyDriftBoard({ viewFilter = 'all' }: FamilyDriftBoardProps) {
  const router = useRouter();
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [singleRepos, setSingleRepos] = useState<RepoPairSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch both families and all repos in parallel
      const [famRes, repoRes] = await Promise.all([
        fetch('/git-database/api/families'),
        fetch('/git-database/api/summary'),
      ]);
      
      const famData: FamilySummaryResponse = await famRes.json();
      const repoData: GitSummaryResponse = await repoRes.json();
      
      if (famData.success) {
        setFamilies(famData.families || []);
      }
      
      if (repoData.success) {
        // Get family keys to exclude from single repos
        const familyKeys = new Set((famData.families || []).flatMap(f => 
          f.instances.map(i => i.service_id.toLowerCase())
        ));
        
        // Filter out repos that belong to a family
        const singles = (repoData.repos || []).filter(r => {
          const repoName = r.repo.toLowerCase();
          // Check if this repo is part of any family
          return !familyKeys.has(repoName) && 
                 !(famData.families || []).some(f => 
                   repoName.includes(f.family_key.replace('ai-', ''))
                 );
        });
        setSingleRepos(singles);
      }
      
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async (familyKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncing(familyKey);
    try {
      const res = await fetch('/git-database/api/sync-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_key: familyKey }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (e) {
      alert(`Sync error: ${(e as Error).message}`);
    } finally {
      setSyncing(null);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const statusBorder = (status: string) => {
    switch (status) {
      case 'green': return 'border-green-500/50';
      case 'orange': return 'border-orange-500/50';
      case 'red': return 'border-red-500/50';
      default: return 'border-gray-500/50';
    }
  };

  const isAiTeam = (name: string) => {
    const prefixes = ['ai-chad', 'ai-jen', 'ai-susan', 'ai-ryan', 'ai-clair', 'ai-jason', 'ai-mike', 'ai-tiffany'];
    return prefixes.some(p => name.toLowerCase().startsWith(p));
  };

  // Apply view filter to families
  const filteredFamilies = families.filter(f => {
    if (viewFilter === 'ai_team') return f.is_ai_team;
    if (viewFilter === 'studio') return !f.is_ai_team;
    return true;
  }).filter(f => f.instance_count > 0); // Only show families with instances

  // Apply view filter to single repos
  const filteredSingles = singleRepos.filter(r => {
    if (viewFilter === 'ai_team') return r.registry?.is_ai_team || false;
    if (viewFilter === 'studio') return !r.registry?.is_ai_team;
    return true;
  });

  // Sort families: orange first, then green, then gray
  const sortedFamilies = [...filteredFamilies].sort((a, b) => {
    const order: Record<string, number> = { orange: 0, red: 1, green: 2, gray: 3 };
    return (order[a.sync.state] ?? 4) - (order[b.sync.state] ?? 4);
  });

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="text-gray-400 text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-6">
        <div className="text-red-400 text-center">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">
        {viewFilter !== 'all' && (
          <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded">
            {viewFilter === 'ai_team' ? 'AI Team' : 'Studio'}
          </span>
        )}
        <span className="text-gray-500">
          {sortedFamilies.length} families, {filteredSingles.length} individual repos
        </span>
      </div>

      {/* FAMILY CARDS */}
      {sortedFamilies.map((family) => {
        const hasOffenders = family.sync.out_of_sync_instances.length > 0;
        const hasDirty = family.sync.dirty_instances.length > 0;
        const hasOffline = family.sync.offline_instances.length > 0;
        const isSyncing = syncing === family.family_key;
        
        return (
          <div 
            key={family.family_key}
            className={`bg-gray-800/50 border-2 rounded-xl overflow-hidden transition-all ${statusBorder(family.sync.state)}`}
          >
            {/* Card Header */}
            <div className="px-4 py-2.5 bg-gray-900/60 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColor(family.sync.state)}`} />
                <span className="font-bold text-white text-lg">{family.display_name}</span>
                {family.is_ai_team && <span className="px-1.5 py-0.5 text-[9px] bg-purple-600/50 text-purple-200 rounded">AI TEAM</span>}
                <span className="text-gray-500 text-sm">({family.instance_count} instances)</span>
              </div>
              <div className="flex items-center gap-3">
                {family.sync.state === 'green' && (
                  <span className="px-2 py-0.5 text-[10px] bg-green-600 text-white rounded font-bold">SYNCED</span>
                )}
                {hasOffenders && (
                  <span className="px-2 py-0.5 text-[10px] bg-orange-600 text-white rounded font-bold">
                    {family.sync.out_of_sync_instances.length} DRIFT
                  </span>
                )}
                {hasDirty && !hasOffenders && (
                  <span className="px-2 py-0.5 text-[10px] bg-yellow-600 text-white rounded font-bold">DIRTY</span>
                )}
                {family.instance_count > 1 && family.sync.state !== 'gray' && (
                  <button
                    onClick={(e) => handleSync(family.family_key, e)}
                    disabled={isSyncing}
                    className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                      isSyncing ? 'bg-gray-600 text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isSyncing ? 'SYNCING...' : 'SYNC ALL'}
                  </button>
                )}
              </div>
            </div>

            {/* Instance Rows */}
            <div className="divide-y divide-gray-700/30">
              {family.instances.map((inst, idx) => {
                const isOffender = family.sync.out_of_sync_instances.includes(inst.service_id);
                const isDirty = family.sync.dirty_instances.includes(inst.service_id);
                const isOffline = inst.status === 'offline';
                
                // Determine label based on port pattern
                let label = `SERVER ${idx}`;
                const port = inst.service_id.match(/\d{4}/)?.[0];
                if (port) {
                  const lastDigit = port.charAt(2);
                  if (lastDigit === '0') label = 'SERVER';
                  else if (lastDigit === '1') label = 'SERVER 1';
                  else if (lastDigit === '2') label = 'SERVER 2';
                  else if (lastDigit === '3') label = 'SERVER 3';
                }
                
                const borderColor = isOffline ? 'border-gray-600' : isOffender ? 'border-orange-500' : isDirty ? 'border-yellow-500' : 'border-green-500';
                
                return (
                  <div key={inst.service_id} className={`px-4 py-2 flex items-center border-l-4 ${borderColor} ${isOffline ? 'opacity-50' : ''}`}>
                    <div className="w-20 flex-shrink-0">
                      <span className="px-2 py-0.5 text-[10px] bg-orange-600/80 text-white rounded font-bold">{label}</span>
                    </div>
                    <div className="w-24 text-sm text-gray-400 font-mono">{inst.service_id}</div>
                    <div className="w-16 text-right"><span className="text-xs text-gray-400">{inst.branch || '—'}</span></div>
                    <div className="w-20 text-right">
                      <span className={`text-xs font-mono ${isOffender ? 'text-orange-400' : 'text-green-400'}`}>{inst.head_short || '—'}</span>
                    </div>
                    <div className="w-16 text-center">
                      {isDirty ? <span className="text-orange-400 text-xs">● dirty</span> : <span className="text-green-400/60 text-xs">○</span>}
                    </div>
                    <div className="flex-1 text-right">
                      {isOffline ? <span className="text-[10px] text-gray-500">OFFLINE</span> : 
                       isOffender ? <span className="text-[10px] text-orange-400">DRIFT</span> : 
                       <span className="text-[10px] text-green-400">OK</span>}
                    </div>
                  </div>
                );
              })}
              
              {/* LOCAL placeholder */}
              <div className="px-4 py-2 flex items-center border-l-4 border-purple-500 bg-black/20">
                <div className="w-20"><span className="px-2 py-0.5 text-[10px] bg-purple-600 text-white rounded font-bold">LOCAL</span></div>
                <div className="flex-1 text-sm text-gray-500">— coming soon —</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* SINGLE REPO CARDS */}
      {filteredSingles.map((repo) => {
        const status = repo.sync.state;
        
        return (
          <div 
            key={repo.key}
            className={`bg-gray-800/50 border-2 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-800/80 ${statusBorder(status)}`}
            onClick={() => router.push(`/git-database/${encodeURIComponent(repo.repo)}`)}
          >
            <div className="px-4 py-2.5 bg-gray-900/60 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColor(status)}`} />
                <span className="font-bold text-white">{repo.repo}</span>
              </div>
              <span className="text-gray-500">→</span>
            </div>
            
            {/* Server row */}
            <div className={`px-4 py-2 flex items-center border-l-4 ${repo.server ? 'border-orange-500' : 'border-gray-600 opacity-50'}`}>
              <div className="w-20"><span className="px-2 py-0.5 text-[10px] bg-orange-600 text-white rounded font-bold">SERVER</span></div>
              {repo.server ? (
                <>
                  <div className="w-20 text-xs text-gray-400">{repo.server.branch}</div>
                  <div className="w-20 text-xs font-mono text-green-400">{repo.server.head_short}</div>
                  <div className="w-16">{repo.server.dirty ? <span className="text-orange-400 text-xs">● dirty</span> : <span className="text-green-400/60 text-xs">○</span>}</div>
                  <div className="flex-1 text-right text-xs text-gray-500">{repo.sync.reasons?.join(', ') || '—'}</div>
                </>
              ) : <div className="flex-1 text-xs text-gray-600">not on server</div>}
            </div>
            
            {/* PC row */}
            <div className={`px-4 py-2 flex items-center border-l-4 bg-black/20 ${repo.pc ? 'border-purple-500' : 'border-gray-600 opacity-50'}`}>
              <div className="w-20"><span className="px-2 py-0.5 text-[10px] bg-purple-600 text-white rounded font-bold">LOCAL</span></div>
              {repo.pc ? (
                <>
                  <div className="w-20 text-xs text-gray-400">{repo.pc.branch}</div>
                  <div className="w-20 text-xs font-mono text-purple-400">{repo.pc.head_short}</div>
                  <div className="w-16">{repo.pc.dirty ? <span className="text-orange-400 text-xs">● dirty</span> : <span className="text-green-400/60 text-xs">○</span>}</div>
                  <div className="flex-1 text-right text-xs">{repo.server?.head === repo.pc?.head ? <span className="text-green-400">synced</span> : <span className="text-purple-400">differs</span>}</div>
                </>
              ) : <div className="flex-1 text-xs text-gray-600">not on PC</div>}
            </div>
          </div>
        );
      })}

      {sortedFamilies.length === 0 && filteredSingles.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="text-gray-400">No repos found</div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500 pt-3 border-t border-gray-700/50 mt-4">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Synced</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /><span>Drift</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-500" /><span>Offline</span></div>
      </div>
    </div>
  );
}
