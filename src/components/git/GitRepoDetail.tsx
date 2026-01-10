'use client';

import { useState, useEffect } from 'react';

interface GitCommit {
  sha: string;
  sha_short: string;
  author: string;
  date: string;
  message: string;
}

interface CommitEntry {
  id: string;
  type: 'commit' | 'snapshot';
  timestamp: string;
  node: string;
  head?: string;
  old_head?: string;
  new_head?: string;
  branch: string;
  dirty?: boolean;
  message?: string;
  last_commit_msg?: string;
  last_commit_time?: string;
}

interface RepoDetails {
  server?: {
    node_id: string;
    branch: string;
    local_sha: string;
    is_dirty: boolean;
    ahead: number;
    behind: number;
    drift_status: string;
    drift_reasons: string[];
    last_commit_msg?: string;
    path?: string;
    github_url?: string;
  };
  pc?: {
    branch: string;
    head: string;
    dirty: boolean;
    ahead: number;
    behind: number;
    last_commit_msg?: string;
    last_commit_time?: string;
    path?: string;
  };
}

interface RepoConfig {
  repo_slug: string;
  display_name?: string;
  server_path?: string;
  pc_path?: string;
  github_url?: string;
  is_active: boolean;
  is_ai_team: boolean;
  auto_discovered: boolean;
  notes?: string;
}

interface GitRepoDetailProps {
  repoName: string;
  isModal?: boolean;
  onClose?: () => void;
}

function extractPort(repoName: string): string | null {
  const match = repoName.match(/-(\d{4})$/);
  return match ? match[1] : null;
}

export default function GitRepoDetail({ repoName, isModal = false, onClose }: GitRepoDetailProps) {
  const [history, setHistory] = useState<CommitEntry[]>([]);
  const [gitLog, setGitLog] = useState<GitCommit[]>([]);
  const [gitLogLoading, setGitLogLoading] = useState(true);
  const [selectedCommit, setSelectedCommit] = useState<{sha: string; subject: string; body: string; author: {name: string; email: string}; date: string; stat: string} | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [dirtyFiles, setDirtyFiles] = useState<{status: string; file: string; type: string}[]>([]);
  const [showDirtyFiles, setShowDirtyFiles] = useState(false);
  const [dirtyFilesLoading, setDirtyFilesLoading] = useState(false);
  const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null);
  const [repoConfig, setRepoConfig] = useState<RepoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateHash, setStateHash] = useState<string | null>(null);
  const [pcLastSeen, setPcLastSeen] = useState<string | null>(null);
  const [serverLastSeen, setServerLastSeen] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  
  const fetchDirtyFiles = async () => {
    setDirtyFilesLoading(true);
    try {
      const res = await fetch(`/git-database/api/git-status?repo=${encodeURIComponent(repoName)}`);
      const data = await res.json();
      if (data.success) {
        setDirtyFiles(data.files || []);
        setShowDirtyFiles(true);
      }
    } catch (e) {
      console.error('Failed to fetch dirty files:', e);
    } finally {
      setDirtyFilesLoading(false);
    }
  };

  const fetchCommitDetails = async (sha: string) => {
    setCommitLoading(true);
    try {
      const res = await fetch(`/git-database/api/git-commit?repo=${encodeURIComponent(repoName)}&sha=${sha}`);
      const data = await res.json();
      if (data.success && data.commit) {
        setSelectedCommit(data.commit);
      }
    } catch (e) {
      console.error('Failed to fetch commit details:', e);
    } finally {
      setCommitLoading(false);
    }
  };

  const displayName = repoConfig?.display_name || repoName;
  const port = extractPort(repoName);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/git-database/api/registry/${encodeURIComponent(repoName)}`);
      const data = await res.json();
      if (data.success && data.repo) {
        setRepoConfig(data.repo);
      }
    } catch (e) {
      console.error('Failed to fetch repo config:', e);
    }
  };

  // Poll hash endpoint - lightweight check for changes
  const checkHash = async () => {
    try {
      const res = await fetch(`/git-database/api/repo-hash?repo=${encodeURIComponent(repoName)}`);
      const data = await res.json();
      if (data.success) {
        setPcLastSeen(data.pc_last_seen);
        setServerLastSeen(data.server_last_seen);
        // Return true if hash changed (need to refetch)
        if (data.state_hash !== stateHash) {
          setStateHash(data.state_hash);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const fetchData = async (force = false) => {
      // Only show loading on initial fetch
      if (!repoDetails) setLoading(true);
      
      // If not forcing and we have data, check hash first
      if (!force && repoDetails && stateHash) {
        const changed = await checkHash();
        if (!changed) return; // No change, skip full fetch
      }
      try {
        const [historyRes, driftRes] = await Promise.all([
          fetch(`/git-database/api/history?repo=${encodeURIComponent(repoName)}&limit=200`),
          fetch('/git-database/api/drift'),
        ]);
        
        const historyData = await historyRes.json();
        const driftData = await driftRes.json();
        
        if (historyData.success) {
          setHistory(historyData.history || []);
        }
        
        if (driftData.success) {
          const details: RepoDetails = {};
          
          for (const node of driftData.nodes || []) {
            const repo = node.repos?.find((r: any) => r.repo === repoName);
            if (repo) {
              details.server = {
                node_id: node.node_id,
                branch: repo.branch,
                local_sha: repo.local_sha,
                is_dirty: repo.is_dirty,
                ahead: repo.ahead || 0,
                behind: repo.behind || 0,
                drift_status: repo.drift_status,
                drift_reasons: repo.drift_reasons || [],
                last_commit_msg: repo.last_commit_msg,
                path: repo.path,
                github_url: repo.github_url,
              };
            }
          }
          
          if (driftData.pc?.repos) {
            const pcRepo = driftData.pc.repos.find((r: any) => r.repo === repoName);
            if (pcRepo) {
              details.pc = {
                branch: pcRepo.branch,
                head: pcRepo.head,
                dirty: pcRepo.dirty,
                ahead: pcRepo.ahead || 0,
                behind: pcRepo.behind || 0,
                last_commit_msg: pcRepo.last_commit_msg,
                last_commit_time: pcRepo.last_commit_time,
                path: pcRepo.path,
              };
            }
          }
          
          setRepoDetails(details);
        }
        
        await fetchConfig();
        
        // Fetch real git log from server
        try {
          setGitLogLoading(true);
          const gitLogRes = await fetch(`/git-database/api/git-log?repo=${encodeURIComponent(repoName)}&limit=50`);
          const gitLogData = await gitLogRes.json();
          if (gitLogData.success) {
            setGitLog(gitLogData.commits || []);
          }
        } catch (e) {
          console.error('Failed to fetch git log:', e);
        } finally {
          setGitLogLoading(false);
        }
        
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Poll hash every 15s, only full fetch on change
    const interval = setInterval(async () => {
      const changed = await checkHash();
      if (changed) {
        fetchData(true);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [repoName]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const headsMatch = () => {
    if (!repoDetails?.server || !repoDetails?.pc) return false;
    return repoDetails.server.local_sha?.slice(0, 7) === repoDetails.pc.head?.slice(0, 7);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[300px]">
        <div className="text-gray-400">Loading repository details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center min-h-[300px]">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  const matched = headsMatch();
  const serverPath = repoConfig?.server_path || repoDetails?.server?.path;
  const githubUrl = repoConfig?.github_url || repoDetails?.server?.github_url;

  // Determine sync status - this is what matters for the dot colors
  // Dots represent SYNC state, not working tree cleanliness
  const syncDotColor = matched ? 'bg-green-500' : 'bg-orange-500';

  return (
    <div className={`flex flex-col ${isModal ? 'h-full' : 'h-full overflow-y-auto p-4'}`}>
      {/* Header Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Dot color = SYNC status (green=matched, orange=diverged) */}
            <div className={`w-4 h-4 rounded-full ${syncDotColor}`} />
            <div>
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              {displayName !== repoName && (
                <div className="text-sm text-gray-500 font-mono">{repoName}</div>
              )}
            </div>
            {/* Primary sync state badge */}
            {matched ? (
              <span className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg font-semibold">SYNCED</span>
            ) : (
              <span className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg font-semibold">DRIFTED</span>
            )}
            {repoConfig?.is_ai_team && (
              <span className="px-3 py-1 text-sm bg-cyan-600 text-white rounded-lg font-semibold">AI TEAM</span>
            )}
          </div>
          {isModal && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          )}
        </div>

        {/* Server Info Bar */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {repoDetails?.server?.node_id && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Droplet:</span>
              <span className="text-purple-400 font-mono">{repoDetails.server.node_id}</span>
            </div>
          )}
          {port && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Port:</span>
              <span className="text-cyan-400 font-mono">{port}</span>
            </div>
          )}
          {serverPath && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Path:</span>
              <span className="text-gray-300 font-mono text-xs">{serverPath}</span>
            </div>
          )}
          {githubUrl && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">GitHub:</span>
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs truncate max-w-xs">
                {githubUrl.replace('https://github.com/', '')}
              </a>
            </div>
          )}
        </div>

        {repoConfig?.notes && (
          <div className="text-sm text-gray-400 mb-4 p-2 bg-gray-900/50 rounded">{repoConfig.notes}</div>
        )}

        {/* Status Grid - LOCAL on LEFT, SERVER on RIGHT */}
        <div className="grid grid-cols-2 gap-4">
          {/* LOCAL Status - LEFT SIDE (your reference point) */}
          <div className={`p-4 rounded-lg ${repoDetails?.pc ? 'bg-blue-900/30 border-l-4 border-blue-500' : 'bg-gray-700/30 border-l-4 border-gray-600'}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded font-bold">LOCAL</span>
              {/* Dot = sync status, not dirty */}
              {repoDetails?.pc && <div className={`w-2.5 h-2.5 rounded-full ${syncDotColor}`} />}
            </div>
            {repoDetails?.pc ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Branch:</span>
                  <span className="text-white font-mono">{repoDetails.pc.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">HEAD:</span>
                  <span className={`font-mono ${matched ? 'text-green-400' : 'text-blue-400'}`}>
                    {repoDetails.pc.head?.slice(0, 7)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Working Tree:</span>
                  <span className={repoDetails.pc.dirty ? 'text-yellow-400' : 'text-green-400'}>
                    {repoDetails.pc.dirty ? 'Uncommitted changes' : 'Clean'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ahead/Behind:</span>
                  <span className="font-mono">
                    <span className={repoDetails.pc.ahead > 0 ? 'text-cyan-400' : 'text-gray-500'}>+{repoDetails.pc.ahead}</span>
                    {' / '}
                    <span className={repoDetails.pc.behind > 0 ? 'text-orange-400' : 'text-gray-500'}>-{repoDetails.pc.behind}</span>
                  </span>
                </div>
                {repoDetails.pc.last_commit_msg && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <span className="text-gray-400 text-xs">Last Commit:</span>
                    <div className="text-gray-300 text-xs mt-1 truncate">{repoDetails.pc.last_commit_msg}</div>
                    {repoDetails.pc.last_commit_time && (
                      <div className="text-gray-500 text-xs mt-0.5">{formatTime(repoDetails.pc.last_commit_time)}</div>
                    )}
                  </div>
                )}
              </div>
            ) : pcLastSeen ? (
              <div className="text-yellow-500">
                <div>LOCAL stale</div>
                <div className="text-xs text-gray-500 mt-1">Last seen: {formatTime(pcLastSeen)}</div>
              </div>
            ) : (
              <div className="text-gray-500">Not cloned locally</div>
            )}
          </div>

          {/* SERVER Status - RIGHT SIDE (deployed reflection) */}
          <div className={`p-4 rounded-lg ${repoDetails?.server ? 'bg-purple-900/30 border-l-4 border-purple-500' : 'bg-gray-700/30 border-l-4 border-gray-600'}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded font-bold">SERVER</span>
              {/* Dot = sync status, not dirty */}
              {repoDetails?.server && <div className={`w-2.5 h-2.5 rounded-full ${syncDotColor}`} />}
            </div>
            {repoDetails?.server ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Branch:</span>
                  <span className="text-white font-mono">{repoDetails.server.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">HEAD:</span>
                  <span className={`font-mono ${matched ? 'text-green-400' : 'text-orange-400'}`}>
                    {repoDetails.server.local_sha?.slice(0, 7)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Working Tree:</span>
                  <div className="text-right">
                    <span className={repoDetails.server.is_dirty ? 'text-yellow-400' : 'text-green-400'}>
                      {repoDetails.server.is_dirty ? 'Uncommitted changes' : 'Clean'}
                    </span>
                    {/* Explanation when server dirty but local clean */}
                    {repoDetails.server.is_dirty && !repoDetails?.pc?.dirty && matched && (
                      <div className="text-gray-500 text-xs mt-0.5">Server-only edits (config, build, etc.)</div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ahead/Behind:</span>
                  <span className="font-mono">
                    <span className={repoDetails.server.ahead > 0 ? 'text-cyan-400' : 'text-gray-500'}>+{repoDetails.server.ahead}</span>
                    {' / '}
                    <span className={repoDetails.server.behind > 0 ? 'text-orange-400' : 'text-gray-500'}>-{repoDetails.server.behind}</span>
                  </span>
                </div>
                {repoDetails.server.last_commit_msg && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <span className="text-gray-400 text-xs">Last Commit:</span>
                    <div className="text-gray-300 text-xs mt-1 truncate">{repoDetails.server.last_commit_msg}</div>
                  </div>
                )}
              </div>
            ) : serverLastSeen ? (
              <div className="text-yellow-500">
                <div>SERVER stale</div>
                <div className="text-xs text-gray-500 mt-1">Last seen: {formatTime(serverLastSeen)}</div>
              </div>
            ) : (
              <div className="text-gray-500">Not deployed on server</div>
            )}
          </div>
        </div>
      </div>


      {/* Git Commit Log - Real git history */}
      <div className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col mb-4 ${isModal ? 'max-h-[300px]' : ''}`}>
        <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-white">Git Commit Log</h2>
          <div className="flex items-center gap-3">
            {matched && (
              <span className="text-xs text-green-400">Server and Local on same commit</span>
            )}
            <span className="text-xs text-gray-500">{gitLog.length} commits</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {gitLogLoading ? (
            <div className="p-4 text-center text-gray-500">Loading git log...</div>
          ) : gitLog.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No git log available. Server path may not be configured.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-900/30 sticky top-0">
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 text-left w-20">SHA</th>
                  <th className="px-4 py-2 text-left w-32">Author</th>
                  <th className="px-4 py-2 text-left">Message</th>
                  <th className="px-4 py-2 text-right w-44">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {gitLog.map((commit, idx) => (
                  <tr key={commit.sha || idx} className="hover:bg-white/5">
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => fetchCommitDetails(commit.sha)}
                        className="font-mono text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                      >
                        {commit.sha_short}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-gray-400 truncate max-w-[120px]">{commit.author}</td>
                    <td className="px-4 py-2 text-gray-300 truncate max-w-md">{commit.message}</td>
                    <td className="px-4 py-2 text-right text-gray-500 text-xs">{formatTime(commit.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Snapshot History */}
      <div className={`flex-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col ${isModal ? 'max-h-[400px]' : ''}`}>
        <div className="px-4 py-3 bg-gray-900/50 border-b border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-white">Snapshot History</h2>
          <div className="flex items-center gap-3">
            {matched && (
              <span className="text-xs text-gray-500">Server is on same commit as LOCAL</span>
            )}
            <span className="text-xs text-gray-500">{history.length} entries</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No commit history recorded yet. History will appear as commits are tracked.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-900/30 sticky top-0">
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="px-4 py-2 text-left w-20">Source</th>
                  <th className="px-4 py-2 text-left w-24">SHA</th>
                  <th className="px-4 py-2 text-left w-24">Branch</th>
                  <th className="px-4 py-2 text-left">Commit Message</th>
                  <th className="px-4 py-2 text-center w-16">Status</th>
                  <th className="px-4 py-2 text-right w-44">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {history.map((entry, idx) => (
                  <tr key={entry.id || idx} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[10px] rounded font-bold ${entry.node === 'user-pc' ? 'bg-blue-500' : 'bg-purple-600'} text-white`}>
                        {entry.node === 'user-pc' ? 'LOCAL' : 'SERVER'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-400">
                      {(entry.new_head || entry.head)?.slice(0, 7)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{entry.branch}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-md truncate">
                      {entry.message || entry.last_commit_msg || (
                        <span className="text-gray-600 italic">No message</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {entry.dirty && <span className="text-yellow-400 text-xs">uncommitted</span>}
                        {entry.type === 'commit' && <span className="text-green-400 text-[10px]">commit</span>}
                        {entry.type === 'snapshot' && <span className="text-gray-500 text-[10px]">snapshot</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-gray-400 text-xs">{formatTime(entry.timestamp)}</div>
                      <div className="text-gray-600 text-[10px]">{formatRelativeTime(entry.timestamp)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      
      {/* Dirty Files Modal */}
      {showDirtyFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDirtyFiles(false)}
          />
          <div className="relative z-10 w-full max-w-xl bg-gray-900 rounded-xl border border-gray-700 shadow-2xl m-4 max-h-[70vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Uncommitted Changes</h3>
                <span className="text-yellow-400 text-sm">{dirtyFiles.length} files</span>
              </div>
              <button 
                onClick={() => setShowDirtyFiles(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {dirtyFiles.length === 0 ? (
                <div className="text-gray-400 text-center py-4">No uncommitted changes</div>
              ) : (
                <div className="space-y-1">
                  {dirtyFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-1 px-2 hover:bg-gray-800 rounded font-mono text-sm">
                      <span className={`w-6 text-center font-bold ${
                        f.type === 'modified' ? 'text-yellow-400' :
                        f.type === 'added' ? 'text-green-400' :
                        f.type === 'deleted' ? 'text-red-400' :
                        f.type === 'untracked' ? 'text-gray-400' :
                        'text-gray-500'
                      }`}>
                        {f.status || f.type[0].toUpperCase()}
                      </span>
                      <span className="text-gray-300 truncate">{f.file}</span>
                      <span className="text-gray-600 text-xs ml-auto">{f.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-3 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
              Run <code className="bg-gray-900 px-1 rounded">git status</code> on server for full details
            </div>
          </div>
        </div>
      )}

      {/* Commit Detail Modal */}
      {selectedCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedCommit(null)}
          />
          <div className="relative z-10 w-full max-w-2xl bg-gray-900 rounded-xl border border-gray-700 shadow-2xl m-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Commit Details</h3>
                <span className="text-cyan-400 font-mono text-sm">{selectedCommit.sha?.slice(0, 12)}</span>
              </div>
              <button 
                onClick={() => setSelectedCommit(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {commitLoading ? (
                <div className="text-gray-400">Loading commit details...</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-gray-500 text-xs uppercase mb-1">Subject</div>
                    <div className="text-white text-lg">{selectedCommit.subject}</div>
                  </div>
                  {selectedCommit.body && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">Body</div>
                      <pre className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-800 p-3 rounded">{selectedCommit.body}</pre>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">Author</div>
                      <div className="text-gray-300">{selectedCommit.author?.name}</div>
                      <div className="text-gray-500 text-xs">{selectedCommit.author?.email}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">Date</div>
                      <div className="text-gray-300">{selectedCommit.date ? formatTime(selectedCommit.date) : ''}</div>
                    </div>
                  </div>
                  {selectedCommit.stat && (
                    <div>
                      <div className="text-gray-500 text-xs uppercase mb-1">Changed Files</div>
                      <pre className="text-gray-400 text-xs font-mono bg-gray-800 p-3 rounded overflow-x-auto">{selectedCommit.stat}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
