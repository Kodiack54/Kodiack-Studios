'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserContext } from '@/app/contexts/UserContextProvider';
import { NodeState, PCGitState, GitDriftResponse, DriftStatus } from '../lib/types';
import { filterReposByProject } from '../lib/project-mapping';

const AI_TEAM_PREFIXES = ['ai-chad', 'ai-jen', 'ai-susan', 'ai-ryan', 'ai-clair', 'ai-jason', 'ai-mike', 'ai-tiffany'];

const EXCLUDED_REPOS = ['ai-team', 'Studio', 'Projects'];

const FAMILY_PATTERNS = [
  { pattern: /^ai-chad-\d+$/, family: 'ai-chad', display: 'Chad' },
  { pattern: /^ai-jen-\d+$/, family: 'ai-jen', display: 'Jen' },
  { pattern: /^ai-susan-\d+$/, family: 'ai-susan', display: 'Susan' },
];

interface RegistryEntry {
  repo_slug: string;
  display_name?: string;
  family_key?: string;
  is_ai_team?: boolean;
  server_path?: string;
  github_url?: string;
  pc_path?: string;
  pc_root?: string;
  pc_relative_path?: string;
  db_type?: string;
  db_target_id?: string;
  db_name?: string;
  db_schema?: string;
  db_last_ok_at?: string;
  db_last_err?: string;
  db_schema_hash?: string;
}

function getFamilyKey(repoName: string): string | null {
  for (const { pattern, family } of FAMILY_PATTERNS) {
    if (pattern.test(repoName.toLowerCase())) return family;
  }
  return null;
}

function getFamilyDisplay(familyKey: string): string {
  const match = FAMILY_PATTERNS.find(p => p.family === familyKey);
  return match?.display || familyKey;
}

function getInstanceLabel(repoName: string): string {
  const port = repoName.match(/(\d{4})$/)?.[1];
  if (!port) return 'SERVER';
  const tens = port.charAt(2);
  if (tens === '0') return 'SERVER';
  if (tens === '1') return 'SERVER 1';
  if (tens === '2') return 'SERVER 2';
  if (tens === '3') return 'SERVER 3';
  return `SERVER ${tens}`;
}

function formatCommitDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}

function formatTimeAgo(dateStr: string | undefined): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

interface GitDriftBoardProps {
  onRepoSelect?: (repo: string, node: string) => void;
  viewFilter?: 'all' | 'studio' | 'ai_team';
  dropletFilter?: string;
}

interface RepoPair {
  repoName: string;
  server?: { node_id: string; repo: any; };
  pc?: any;
}

interface FamilyGroup {
  familyKey: string;
  display: string;
  instances: RepoPair[];
  pc?: any;
}

export default function GitDriftBoard({ onRepoSelect, viewFilter = 'all', dropletFilter = 'all' }: GitDriftBoardProps) {
  const router = useRouter();
  const { effectiveProject } = useUserContext();
  const [nodes, setNodes] = useState<NodeState[]>([]);
  const [pcState, setPcState] = useState<PCGitState | null>(null);
  const [registry, setRegistry] = useState<Map<string, RegistryEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driftRes, registryRes] = await Promise.all([
          fetch(`/git-database/api/drift?include_ignored=${showIgnored}`, { cache: 'no-store' }),
          fetch('/git-database/api/registry', { cache: 'no-store' }),
        ]);
        
        const driftData: GitDriftResponse = await driftRes.json();
        const registryData = await registryRes.json();
        
        if (driftData.success) {
          setNodes(driftData.nodes || []);
          setPcState(driftData.pc || null);
          setError(null);
        } else {
          setError(driftData.error || 'Failed to fetch drift data');
        }
        
        if (registryData.success && registryData.repos) {
          const regMap = new Map<string, RegistryEntry>();
          for (const repo of registryData.repos) {
            regMap.set(repo.repo_slug, repo);
            if (repo.family_key) {
              regMap.set(repo.family_key, repo);
            }
          }
          setRegistry(regMap);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [showIgnored]);

  const getDisplayName = (repoName: string): string => {
    const direct = registry.get(repoName);
    if (direct?.display_name) return direct.display_name;
    
    const familyKey = getFamilyKey(repoName);
    if (familyKey) {
      const family = registry.get(familyKey);
      if (family?.display_name) return family.display_name;
      return getFamilyDisplay(familyKey);
    }
    
    return repoName
      .replace(/^ai-/, '')
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const statusColor = (status: DriftStatus) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const statusBorder = (status: DriftStatus) => {
    switch (status) {
      case 'green': return 'border-green-500';
      case 'yellow': return 'border-yellow-500';
      case 'orange': return 'border-orange-500';
      case 'red': return 'border-red-500';
      default: return 'border-gray-500';
    }
  };

  const dbStatusColor = (regEntry: RegistryEntry | undefined): string => {
    if (!regEntry) return 'bg-gray-500';
    
    const hasDbConfig = !!(regEntry.db_type && regEntry.db_target_id && regEntry.db_name);
    
    if (!hasDbConfig) return 'bg-yellow-500';
    if (regEntry.db_last_err) return 'bg-orange-500';
    if (!regEntry.db_last_ok_at) return 'bg-orange-500';
    
    const lastSync = new Date(regEntry.db_last_ok_at);
    const now = new Date();
    const diffHours = (now.getTime() - lastSync.getTime()) / 3600000;
    
    if (diffHours > 24) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const dbStatusText = (regEntry: RegistryEntry | undefined): string => {
    if (!regEntry) return 'Not Linked';
    
    const hasDbConfig = !!(regEntry.db_type && regEntry.db_target_id && regEntry.db_name);
    
    if (!hasDbConfig) return 'Awaiting Config';
    if (regEntry.db_last_err) return 'Error';
    if (!regEntry.db_last_ok_at) return 'Never Synced';
    
    const lastSync = new Date(regEntry.db_last_ok_at);
    const now = new Date();
    const diffHours = (now.getTime() - lastSync.getTime()) / 3600000;
    
    if (diffHours > 24) return 'Stale';
    return 'Verified';
  };

  const isAiTeamRepo = (repoName: string) => {
    const regEntry = registry.get(repoName);
    if (regEntry?.is_ai_team !== undefined) return regEntry.is_ai_team;
    return AI_TEAM_PREFIXES.some(prefix => repoName.toLowerCase().startsWith(prefix));
  };

  const getEffectiveGitStatus = (repoName: string, driftStatus: DriftStatus): DriftStatus => {
    const regEntry = registry.get(repoName);
    if (!regEntry) return 'yellow';
    
    const hasGithub = !!regEntry.github_url;
    const hasServer = !!regEntry.server_path;
    const hasPc = !!(regEntry.pc_path || (regEntry.pc_root && regEntry.pc_relative_path));
    
    if (!hasGithub || !hasServer || !hasPc) return 'yellow';
    return driftStatus;
  };

  const applyViewFilter = (repos: any[]) => {
    let filtered = repos;
    if (viewFilter === 'ai_team') {
      filtered = filtered.filter(r => isAiTeamRepo(r.repo));
    } else if (viewFilter === 'studio') {
      filtered = filtered.filter(r => !isAiTeamRepo(r.repo));
    }
    return filtered;
  };

  const projectSlug = effectiveProject?.slug || null;
  
  const dropletFilteredNodes = dropletFilter === 'all' 
    ? nodes 
    : nodes.filter(node => node.node_id === dropletFilter);
  
  const filteredNodes = dropletFilteredNodes.map(node => ({
    ...node,
    repos: applyViewFilter(node.repos)
  })).filter(node => node.repos.length > 0);

  const filteredPcRepos = applyViewFilter(pcState ? pcState.repos : []);

  const createRepoPairs = (): RepoPair[] => {
    const pairs = new Map<string, RepoPair>();

    for (const node of filteredNodes) {
      for (const repo of node.repos) {
        const repoName = repo.repo;
        if (!pairs.has(repoName)) pairs.set(repoName, { repoName });
        pairs.get(repoName)!.server = { node_id: node.node_id, repo };
      }
    }

    for (const pcRepo of filteredPcRepos) {
      const repoName = pcRepo.repo;
      if (!pairs.has(repoName)) pairs.set(repoName, { repoName });
      pairs.get(repoName)!.pc = pcRepo;
    }

    return Array.from(pairs.values())
      .filter(p => !EXCLUDED_REPOS.includes(p.repoName))
      .sort((a, b) => a.repoName.localeCompare(b.repoName));
  };

  const repoPairs = createRepoPairs();

  const groupByFamily = (): { families: FamilyGroup[]; singles: RepoPair[] } => {
    const familyMap = new Map<string, FamilyGroup>();
    const singles: RepoPair[] = [];

    for (const pair of repoPairs) {
      const familyKey = getFamilyKey(pair.repoName);
      if (familyKey) {
        if (!familyMap.has(familyKey)) {
          familyMap.set(familyKey, {
            familyKey,
            display: getDisplayName(pair.repoName),
            instances: [],
          });
        }
        familyMap.get(familyKey)!.instances.push(pair);
        if (pair.pc) {
          familyMap.get(familyKey)!.pc = pair.pc;
        }
      } else {
        singles.push(pair);
      }
    }

    for (const family of familyMap.values()) {
      family.instances.sort((a, b) => a.repoName.localeCompare(b.repoName));
    }

    return {
      families: Array.from(familyMap.values()).sort((a, b) => a.familyKey.localeCompare(b.familyKey)),
      singles,
    };
  };

  const { families, singles } = groupByFamily();

  const headsMatch = (pair: RepoPair): boolean => {
    if (!pair.server || !pair.pc) return false;
    return pair.server.repo.local_sha?.slice(0, 7) === pair.pc.head?.slice(0, 7);
  };

  const familyInSync = (family: FamilyGroup): boolean => {
    const heads = family.instances
      .filter(i => i.server?.repo.local_sha)
      .map(i => i.server!.repo.local_sha.slice(0, 7));
    if (heads.length === 0) return false;
    return heads.every(h => h === heads[0]);
  };

  const familyHasDirty = (family: FamilyGroup): boolean => {
    return family.instances.some(i => i.server?.repo.is_dirty);
  };

  const getFamilyGitStatus = (family: FamilyGroup): DriftStatus => {
    const mainRepo = family.instances[0]?.repoName;
    const regEntry = mainRepo ? registry.get(mainRepo) : null;
    if (!regEntry) return 'yellow';
    
    const hasGithub = !!regEntry.github_url;
    const hasServer = !!regEntry.server_path;
    const hasPc = !!(regEntry.pc_path || (regEntry.pc_root && regEntry.pc_relative_path));
    
    if (!hasGithub || !hasServer || !hasPc) return 'yellow';
    if (family.instances.every(i => !i.server)) return 'gray';
    if (!familyInSync(family)) return 'orange';
    if (familyHasDirty(family)) return 'orange';
    return 'green';
  };

  const handleCardClick = (repoName: string) => {
    router.push(`/git-database/${encodeURIComponent(repoName)}`);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="text-gray-400 text-center">Loading drift data...</div>
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

  const totalRepos = families.reduce((sum, f) => sum + f.instances.length, 0) + singles.length;

  const GitColumnHeaders = () => (
    <div className="flex items-center px-4 py-2 text-xs uppercase text-gray-500 border-b border-gray-700/50 bg-gray-900/30">
      <div className="w-24 flex-shrink-0">Source</div>
      <div className="w-40">Instance</div>
      <div className="flex-1" />
      <div className="w-20 text-right">Branch</div>
      <div className="w-48 text-right">Timestamp</div>
      <div className="w-20 text-right">HEAD</div>
      <div className="w-16 text-center">Status</div>
      <div className="w-20 text-center">+/-</div>
      <div className="w-16 text-right">Sync</div>
    </div>
  );

  const DbStatusPanel = ({ repoName }: { repoName: string }) => {
    const regEntry = registry.get(repoName);
    const hasDbConfig = !!(regEntry?.db_type && regEntry?.db_target_id && regEntry?.db_name);
    const dbColor = dbStatusColor(regEntry);
    const dbText = dbStatusText(regEntry);
    
    return (
      <div className="w-1/3 border-l border-gray-700/50 bg-gray-900/20 p-4 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${dbColor}`} />
          <span className="text-sm font-semibold text-gray-300">DB: {dbText}</span>
        </div>
        
        {hasDbConfig ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-500">
              <span className="text-gray-400">{regEntry?.db_type}</span>
              <span className="mx-2">•</span>
              <span className="text-gray-400">{regEntry?.db_name}</span>
            </div>
            <div className="text-sm text-gray-500">
              Last pull: <span className="text-gray-400">{formatTimeAgo(regEntry?.db_last_ok_at)}</span>
            </div>
            {regEntry?.db_schema_hash && (
              <div className="text-xs text-gray-600 font-mono truncate">
                Hash: {regEntry.db_schema_hash.slice(0, 12)}...
              </div>
            )}
            {regEntry?.db_last_err && (
              <div className="text-xs text-red-400 truncate" title={regEntry.db_last_err}>
                Error: {regEntry.db_last_err.slice(0, 40)}...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-yellow-400 font-medium">
              Database not configured
            </div>
            <div className="text-xs text-gray-500">
              Double-click → Edit Config → Set DB Target
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 flex items-center gap-2 mb-2">
        {projectSlug && (
          <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded">
            Project: {effectiveProject?.name || projectSlug}
          </span>
        )}
        {viewFilter !== 'all' && (
          <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded">
            {viewFilter === 'ai_team' ? 'AI Team' : 'Studio'}
          </span>
        )}
        <button
          onClick={() => setShowIgnored(!showIgnored)}
          className={`px-2 py-0.5 rounded text-xs ${showIgnored ? "bg-orange-600/30 text-orange-300" : "bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500"}`}
        >
          {showIgnored ? "Showing Ignored" : "Show Ignored"}
        </button>
        <span className="text-gray-500">
          {families.length} families, {singles.length} repos ({totalRepos} total)
        </span>
      </div>

      {families.map((family) => {
        const gitStatus = getFamilyGitStatus(family);
        const inSync = familyInSync(family);
        const primaryHead = family.instances[0]?.server?.repo.local_sha?.slice(0, 7);
        const mainRepoName = family.instances[0]?.repoName;
        
        return (
          <div 
            key={family.familyKey}
            className={`bg-gray-800/50 border-2 rounded-xl overflow-hidden ${statusBorder(gitStatus)}`}
          >
            <div className="px-4 py-2.5 bg-gray-900/60 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColor(gitStatus)}`} />
                <span className="font-bold text-white text-lg">{family.display}</span>
                <span className="px-1.5 py-0.5 text-xs bg-purple-600/50 text-purple-200 rounded">AI TEAM</span>
                <span className="text-gray-500 text-sm">({family.instances.length} instances)</span>
              </div>
              <div className="flex items-center gap-3">
                {inSync && <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded font-bold">ALL SYNCED</span>}
                {!inSync && <span className="px-2 py-0.5 text-xs bg-orange-600 text-white rounded font-bold">OUT OF SYNC</span>}
              </div>
            </div>

            <div className="flex">
              <div className="w-2/3">
                <GitColumnHeaders />

                <div 
                  className={`flex items-center px-4 py-2 cursor-pointer hover:brightness-110 ${family.pc ? 'bg-blue-900/30' : 'bg-gray-800/30 opacity-50'}`}
                  onDoubleClick={() => family.pc && handleCardClick(family.pc.repo)}
                >
                  <div className="w-24 flex-shrink-0">
                    <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded font-bold">LOCAL</span>
                  </div>
                  <div className="w-40 text-sm text-gray-400 font-mono truncate">{family.pc?.repo || '—'}</div>
                  <div className="flex-1" />
                  {family.pc ? (
                    <>
                      <div className="w-20 text-right"><span className="text-xs text-gray-400">{family.pc.branch}</span></div>
                      <div className="w-48 text-right"><span className="text-xs text-gray-500">{formatCommitDate(family.pc.last_commit_time)}</span></div>
                      <div className="w-20 text-right">
                        <span className={`text-xs font-mono cursor-help ${family.pc.head?.slice(0,7) === primaryHead ? 'text-green-400' : 'text-blue-400'}`} title={family.pc.last_commit_msg || 'No commit message'}>{family.pc.head?.slice(0, 7) || "—"}
                        </span>
                      </div>
                      <div className="w-16 text-center">
                        {family.pc.dirty ? <span className="text-orange-400 text-xs">● dirty</span> : <span className="text-green-400/60 text-xs">○ clean</span>}
                      </div>
                      <div className="w-20 text-center font-mono text-xs">
                        <span className={family.pc.ahead > 0 ? 'text-blue-400' : 'text-gray-500'}>+{family.pc.ahead || 0}</span>
                        <span className="text-gray-600">/</span>
                        <span className={family.pc.behind > 0 ? 'text-blue-300' : 'text-gray-500'}>-{family.pc.behind || 0}</span>
                      </div>
                      <div className="w-16 text-right">
                        {family.pc.head?.slice(0,7) === primaryHead ? 
                          <span className="text-xs text-green-400">synced</span> : 
                          <span className="text-xs text-blue-400">differs</span>
                        }
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 text-right text-xs text-gray-600">not cloned locally</div>
                  )}
                </div>

                {family.instances.map((inst) => {
                  const label = getInstanceLabel(inst.repoName);
                  const isDirty = inst.server?.repo.is_dirty;
                  const head = inst.server?.repo.local_sha?.slice(0, 7);
                  const matchesPrimary = head === primaryHead;
                  
                  return (
                    <div 
                      key={inst.repoName}
                      className={`flex items-center px-4 py-2 cursor-pointer hover:brightness-110 ${
                        inst.server ? 'bg-purple-900/30' : 'bg-gray-800/30 opacity-50'
                      }`}
                      onDoubleClick={() => handleCardClick(inst.repoName)}
                    >
                      <div className="w-24 flex-shrink-0">
                        <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded font-bold">{label}</span>
                      </div>
                      <div className="w-40 text-sm text-gray-400 font-mono truncate">{inst.repoName}</div>
                      <div className="flex-1" />
                      {inst.server ? (
                        <>
                          <div className="w-20 text-right"><span className="text-xs text-gray-400">{inst.server.repo.branch}</span></div>
                          <div className="w-48 text-right"><span className="text-xs text-gray-500">{formatCommitDate(inst.server.repo.last_commit_time)}</span></div>
                          <div className="w-20 text-right">
                            <span className={`text-xs font-mono cursor-help ${matchesPrimary ? 'text-green-400' : 'text-orange-400'}`} title={inst.server?.repo.last_commit_msg || 'No commit message'}>{head || '—'}</span>
                          </div>
                          <div className="w-16 text-center">
                            {isDirty ? <span className="text-orange-400 text-xs">● dirty</span> : <span className="text-green-400/60 text-xs">○ clean</span>}
                          </div>
                          <div className="w-20 text-center font-mono text-xs">
                            <span className={inst.server.repo.ahead > 0 ? 'text-purple-400' : 'text-gray-500'}>+{inst.server.repo.ahead || 0}</span>
                            <span className="text-gray-600">/</span>
                            <span className={inst.server.repo.behind > 0 ? 'text-purple-300' : 'text-gray-500'}>-{inst.server.repo.behind || 0}</span>
                          </div>
                          <div className="w-16 text-right">
                            {matchesPrimary ? 
                              <span className="text-xs text-green-400">OK</span> : 
                              <span className="text-xs text-orange-400">DRIFT</span>
                            }
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 text-right text-xs text-gray-600">not on server</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <DbStatusPanel repoName={mainRepoName || family.familyKey} />
            </div>
          </div>
        );
      })}

      {singles.map((pair) => {
        const matched = headsMatch(pair);
        const serverStatus = pair.server?.repo.drift_status as DriftStatus || 'gray';
        const rawStatus = matched ? 'green' : (pair.server ? serverStatus : 'gray');
        const gitStatus = getEffectiveGitStatus(pair.repoName, rawStatus);
        const isAiTeam = isAiTeamRepo(pair.repoName);
        const displayName = getDisplayName(pair.repoName);
        
        return (
          <div 
            key={pair.repoName}
            className={`bg-gray-800/50 border-2 rounded-xl overflow-hidden cursor-pointer transition-all hover:bg-gray-800/80 ${statusBorder(gitStatus)}`}
            onDoubleClick={() => handleCardClick(pair.repoName)}
          >
            <div className="px-4 py-2.5 bg-gray-900/60 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColor(gitStatus)}`} />
                <span className="font-bold text-white text-lg">{displayName}</span>
                <span className="text-gray-500 text-sm font-mono">({pair.repoName})</span>
                {isAiTeam && <span className="px-1.5 py-0.5 text-xs bg-purple-600/50 text-purple-200 rounded">AI TEAM</span>}
              </div>
              <div className="flex items-center gap-3">
                {matched && <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded font-bold">SYNCED</span>}
                {!matched && pair.server && pair.pc && <span className="px-2 py-0.5 text-xs bg-orange-600 text-white rounded font-bold">OUT OF SYNC</span>}
                <span className="text-gray-500">→</span>
              </div>
            </div>

            <div className="flex">
              <div className="w-2/3">
                <GitColumnHeaders />

                <div className={`flex items-center px-4 py-2.5 cursor-pointer hover:brightness-110 ${pair.pc ? 'bg-blue-900/30' : 'bg-gray-800/30 opacity-50'}`}>
                  <div className="w-24 flex-shrink-0">
                    <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded font-bold">LOCAL</span>
                  </div>
                  <div className="w-40 text-sm text-gray-300 font-mono truncate">{pair.repoName}</div>
                  <div className="flex-1" />
                  {pair.pc ? (
                    <>
                      <div className="w-20 text-right"><span className="text-xs text-gray-400">{pair.pc.branch}</span></div>
                      <div className="w-48 text-right"><span className="text-xs text-gray-500">{formatCommitDate(pair.pc.last_commit_time)}</span></div>
                      <div className="w-20 text-right">
                        <span className={`text-xs font-mono cursor-help ${matched ? 'text-green-400' : 'text-blue-400'}`} title={pair.pc.last_commit_msg || 'No commit message'}>{pair.pc.head?.slice(0, 7) || "—"}</span>
                      </div>
                      <div className="w-16 text-center">
                        {pair.pc.dirty ? <span className="text-orange-400 text-xs">● dirty</span> : <span className="text-green-400/60 text-xs">○ clean</span>}
                      </div>
                      <div className="w-20 text-center font-mono text-xs">
                        <span className={pair.pc.ahead > 0 ? 'text-blue-400' : 'text-gray-500'}>+{pair.pc.ahead || 0}</span>
                        <span className="text-gray-600">/</span>
                        <span className={pair.pc.behind > 0 ? 'text-blue-300' : 'text-gray-500'}>-{pair.pc.behind || 0}</span>
                      </div>
                      <div className="w-16 text-right">
                        {matched ? <span className="text-xs text-green-400">synced</span> : <span className="text-xs text-blue-400">differs</span>}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 text-right"><span className="text-xs text-gray-600">not cloned locally</span></div>
                  )}
                </div>

                <div className={`flex items-center px-4 py-2.5 cursor-pointer hover:brightness-110 ${pair.server ? 'bg-purple-900/30' : 'bg-gray-800/30 opacity-50'}`}>
                  <div className="w-24 flex-shrink-0">
                    <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded font-bold">SERVER</span>
                  </div>
                  <div className="w-40 text-sm text-gray-300 font-mono truncate">{pair.repoName}</div>
                  <div className="flex-1" />
                  {pair.server ? (
                    <>
                      <div className="w-20 text-right"><span className="text-xs text-gray-400">{pair.server.repo.branch}</span></div>
                      <div className="w-48 text-right"><span className="text-xs text-gray-500">{formatCommitDate(pair.server.repo.last_commit_time)}</span></div>
                      <div className="w-20 text-right">
                        <span className={`text-xs font-mono ${matched ? 'text-green-400' : 'text-orange-400'}`}>
                          {pair.server.repo.local_sha?.slice(0, 7) || "—"}
                        </span>
                      </div>
                      <div className="w-16 text-center">
                        {pair.server.repo.is_dirty ? <span className="text-orange-400 text-xs">● dirty</span> : <span className="text-green-400/60 text-xs">○ clean</span>}
                      </div>
                      <div className="w-20 text-center font-mono text-xs">
                        <span className={pair.server.repo.ahead > 0 ? 'text-purple-400' : 'text-gray-500'}>+{pair.server.repo.ahead || 0}</span>
                        <span className="text-gray-600">/</span>
                        <span className={pair.server.repo.behind > 0 ? 'text-purple-300' : 'text-gray-500'}>-{pair.server.repo.behind || 0}</span>
                      </div>
                      <div className="w-16 text-right">
                        <div className={`w-3 h-3 rounded-full inline-block ${statusColor(serverStatus)}`} />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 text-right"><span className="text-xs text-gray-600">not deployed on server</span></div>
                  )}
                </div>
              </div>

              <DbStatusPanel repoName={pair.repoName} />
            </div>
          </div>
        );
      })}

      {families.length === 0 && singles.length === 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
          <div className="text-gray-400">
            {viewFilter !== 'all' 
              ? `No ${viewFilter === 'ai_team' ? 'AI Team' : 'Studio'} repos found`
              : projectSlug ? `No repos found for project "${effectiveProject?.name || projectSlug}"` : 'No repos found'
            }
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 pt-3 border-t border-gray-700/50 mt-4">
        <div className="font-semibold text-gray-400">Git Status:</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Synced</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span>Awaiting Config</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /><span>Drift/Dirty</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-gray-500" /><span>Offline</span></div>
        
        <div className="w-px h-4 bg-gray-700 mx-2" />
        
        <div className="font-semibold text-gray-400">DB Status:</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Verified</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span>Awaiting Config</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /><span>Stale/Error</span></div>
        
        <div className="ml-auto text-gray-600">Click a repo to view details →</div>
      </div>
    </div>
  );
}
