'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams } from 'next/navigation';
import { PageTitleContext, PageActionsContext } from '@/app/layout';
import Link from 'next/link';
import GitRepoDetail from '@/components/git/GitRepoDetail';

interface RepoConfig {
  repo_slug: string;
  display_name?: string;
  server_path?: string;
  pc_path?: string;
  pc_root?: string;
  pc_relative_path?: string;
  github_url?: string;
  is_active: boolean;
  is_ai_team: boolean;
  auto_discovered: boolean;
  notes?: string;
  droplet_name?: string;
  pm2_name?: string;
  client_id?: string;
  project_id?: string;
  db_type?: string;
  db_target_id?: string;
  db_name?: string;
  db_schema?: string;
  db_last_ok_at?: string;
  db_last_err?: string;
  db_schema_hash?: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  projects: { id: string; name: string; slug: string }[];
}

interface DiscoveredPath {
  repo: string;
  path: string;
  node_id?: string;
}

interface DbTarget {
  id: string;
  name: string;
  type: string;
}

export default function RepoDetailPage() {
  const params = useParams();
  const repoName = decodeURIComponent(params.repo as string);
  
  const setPageTitle = useContext(PageTitleContext);
  const setPageActions = useContext(PageActionsContext);
  
  const [repoConfig, setRepoConfig] = useState<RepoConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RepoConfig>>({});
  const [saving, setSaving] = useState(false);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'git' | 'db'>('git');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [droplets, setDroplets] = useState<string[]>([]);
  const [discoveredPaths, setDiscoveredPaths] = useState<DiscoveredPath[]>([]);
  const [githubUrls, setGithubUrls] = useState<string[]>([]);
  const [pcPaths, setPcPaths] = useState<string[]>([]);
  const [dbTargets, setDbTargets] = useState<DbTarget[]>([]);

  const displayName = repoConfig?.display_name || repoName;
  
  const selectedClient = clients.find(c => c.id === editForm.client_id);
  const availableProjects = selectedClient?.projects || [];
  const filteredDbTargets = dbTargets.filter(t => !editForm.db_type || t.type === editForm.db_type);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const clientsRes = await fetch('/api/clients');
        const clientsData = await clientsRes.json();
        if (Array.isArray(clientsData)) {
          setClients(clientsData);
        }
        
        const driftRes = await fetch('/git-database/api/drift');
        const driftData = await driftRes.json();
        if (driftData.success) {
          const nodeIds = driftData.nodes?.map((n: any) => n.node_id) || [];
          setDroplets(['studio-dev', ...nodeIds.filter((n: string) => n !== 'studio-dev')]);
          
          const serverPaths: DiscoveredPath[] = [];
          for (const node of driftData.nodes || []) {
            for (const repo of node.repos || []) {
              if (repo.path) {
                serverPaths.push({ repo: repo.repo, path: repo.path, node_id: node.node_id });
              }
            }
          }
          if (driftData.pc?.repos) {
            for (const repo of driftData.pc.repos) {
              if (repo.path) {
                serverPaths.push({ repo: repo.repo, path: repo.path, node_id: 'user-pc' });
              }
            }
          }
          setDiscoveredPaths(serverPaths);
        }
        
        try {
          const ghRes = await fetch("/git-database/api/github-urls");
          const ghData = await ghRes.json();
          if (ghData.success && Array.isArray(ghData.urls)) {
            setGithubUrls(ghData.urls);
          }
        } catch (e) {
          console.error("Failed to fetch GitHub URLs:", e);
        }
        
        try {
          const pcRes = await fetch("/git-database/api/pc-paths");
          const pcData = await pcRes.json();
          if (pcData.success && Array.isArray(pcData.paths)) {
            setPcPaths(pcData.paths);
          }
        } catch (e) {
          console.error("Failed to fetch PC paths:", e);
        }

        setDbTargets([
          { id: 'supabase-nextbid-live', name: 'NextBid Live', type: 'supabase' },
          { id: 'supabase-nextbid-staging', name: 'NextBid Staging', type: 'supabase' },
          { id: 'droplet-9432-kodiack', name: 'Studio Dev (9432)', type: 'droplet' },
        ]);
      } catch (e) {
        console.error('Failed to fetch dropdown data:', e);
      }
    };
    fetchDropdownData();
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/git-database/api/registry/${encodeURIComponent(repoName)}`);
        const data = await res.json();
        if (data.success && data.repo) {
          setRepoConfig(data.repo);
          setEditForm(data.repo);
          setGithubUrl(data.repo.github_url);
        } else {
          setEditForm({
            repo_slug: repoName,
            display_name: repoName,
            is_active: true,
            is_ai_team: repoName.toLowerCase().startsWith('ai-'),
            db_schema: 'public',
          });
        }
      } catch (e) {
        console.error('Failed to fetch repo config:', e);
      }
    };
    fetchConfig();
  }, [repoName]);

  useEffect(() => {
    setPageTitle({
      title: `Git: ${displayName}`,
      description: 'Repository commit history and drift tracking',
    });
    
    setPageActions(
      <div className="flex items-center gap-2">
        {/* Two separate buttons for Git Tracker and Database */}
        <button
          onClick={() => setActiveView('git')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg border border-black ${
            activeView === 'git'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Git Tracker
        </button>
        <button
          onClick={() => setActiveView('db')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg border border-black ${
            activeView === 'db'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Database
        </button>
        
        <Link
          href="/git-database"
          className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 border border-black"
        >
          Back
        </Link>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg border border-black ${
            isEditing 
              ? 'bg-orange-600 text-white hover:bg-orange-500' 
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          {isEditing ? 'Cancel Edit' : 'Edit Config'}
        </button>
        {(repoConfig?.github_url || githubUrl) && (
          <a
            href={repoConfig?.github_url || githubUrl || ''}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-gray-800 text-white hover:bg-gray-700 border border-black"
          >
            GitHub
          </a>
        )}
      </div>
    );
    
    return () => setPageActions(null);
  }, [setPageTitle, setPageActions, repoName, repoConfig, isEditing, displayName, githubUrl, activeView]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = repoConfig ? 'PUT' : 'POST';
      const url = repoConfig 
        ? `/git-database/api/registry/${encodeURIComponent(repoName)}`
        : '/git-database/api/registry';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, repo_slug: repoName }),
      });
      
      const data = await res.json();
      if (data.success) {
        setRepoConfig(data.repo);
        setIsEditing(false);
      } else {
        alert('Save failed: ' + data.error);
      }
    } catch (e) {
      alert('Save error: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const hasDbConfig = !!(repoConfig?.db_type && repoConfig?.db_target_id && repoConfig?.db_name);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Edit Panel */}
      {isEditing && (
        <div className="bg-blue-900/30 border border-blue-500 rounded-xl p-4 m-4 mb-0 max-h-[60vh] overflow-y-auto">
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-lg font-bold text-white">Edit Repository Configuration</h2>
            <span className="text-sm text-gray-400">- Link paths, database, and project</span>
          </div>
          
          {/* Display Name */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Display Name</label>
            <input
              type="text"
              value={editForm.display_name || ''}
              onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              className="w-full max-w-md px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              placeholder="Human-friendly name"
            />
          </div>

          {/* Two Column Layout: Paths + Droplet (left) | Database (right) */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            {/* LEFT: Paths + Droplet */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-2">Source Paths</div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  GitHub URL <span className={`${editForm.github_url ? 'text-green-400' : 'text-yellow-400'}`}>*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.github_url || ''}
                    onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    placeholder="https://github.com/..."
                    list="github-suggestions"
                  />
                  {editForm.github_url && (
                    <button type="button" onClick={() => setEditForm({ ...editForm, github_url: '' })}
                      className="px-3 py-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors text-sm">✕</button>
                  )}
                </div>
                <datalist id="github-suggestions">
                  {githubUrls.map(url => <option key={url} value={url} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Server Path <span className={`${editForm.server_path ? 'text-green-400' : 'text-yellow-400'}`}>*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.server_path || ''}
                    onChange={(e) => setEditForm({ ...editForm, server_path: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                    placeholder="/var/www/Studio/..."
                    list="server-paths"
                  />
                  {editForm.server_path && (
                    <button type="button" onClick={() => setEditForm({ ...editForm, server_path: '' })}
                      className="px-3 py-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors text-sm">✕</button>
                  )}
                </div>
                <datalist id="server-paths">
                  {discoveredPaths.filter(p => p.node_id !== 'user-pc').map(p => (
                    <option key={p.path} value={p.path}>{p.repo} - {p.path}</option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Local Path <span className={`${editForm.pc_path ? 'text-green-400' : 'text-yellow-400'}`}>*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.pc_path || ''}
                    onChange={(e) => setEditForm({ ...editForm, pc_path: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm font-mono"
                    placeholder="C:\Projects\..."
                    list="pc-paths"
                  />
                  {editForm.pc_path && (
                    <button type="button" onClick={() => setEditForm({ ...editForm, pc_path: '' })}
                      className="px-3 py-2 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors text-sm">✕</button>
                  )}
                </div>
                <datalist id="pc-paths">
                  {pcPaths.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Linked Droplet</label>
                <select
                  value={editForm.droplet_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, droplet_name: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">-- Select Droplet --</option>
                  {droplets.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* RIGHT: Database Links */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-2">Database Links</div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  DB Type <span className={`${editForm.db_type ? 'text-green-400' : 'text-gray-500'}`}>*</span>
                </label>
                <select
                  value={editForm.db_type || ''}
                  onChange={(e) => setEditForm({ ...editForm, db_type: e.target.value || undefined, db_target_id: undefined })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">-- Select Type --</option>
                  <option value="supabase">Supabase</option>
                  <option value="droplet">Droplet Postgres</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  DB Target <span className={`${editForm.db_target_id ? 'text-green-400' : 'text-gray-500'}`}>*</span>
                </label>
                <select
                  value={editForm.db_target_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, db_target_id: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  disabled={!editForm.db_type}
                >
                  <option value="">-- Select Target --</option>
                  {filteredDbTargets.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  DB Name <span className={`${editForm.db_name ? 'text-green-400' : 'text-gray-500'}`}>*</span>
                </label>
                <input
                  type="text"
                  value={editForm.db_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, db_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  placeholder="database_name"
                  disabled={!editForm.db_type}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Schema (optional)</label>
                <input
                  type="text"
                  value={editForm.db_schema || 'public'}
                  onChange={(e) => setEditForm({ ...editForm, db_schema: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  placeholder="public"
                  disabled={!editForm.db_type}
                />
              </div>
            </div>
          </div>

          {/* Project Section */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-2">Project</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Client</label>
                <select
                  value={editForm.client_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, client_id: e.target.value || undefined, project_id: undefined })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="">-- Select Client --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Project</label>
                <select
                  value={editForm.project_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  disabled={!editForm.client_id}
                >
                  <option value="">-- Select Project --</option>
                  {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6 mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={editForm.is_ai_team || false}
                onChange={(e) => setEditForm({ ...editForm, is_ai_team: e.target.checked })}
                className="rounded bg-gray-700 border-gray-600"
              />
              AI Team
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={editForm.is_active !== false}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                className="rounded bg-gray-700 border-gray-600"
              />
              Active
            </label>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={editForm.notes || ''}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm h-20"
              placeholder="Description, purpose, or any notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content Area - Only bottom section changes */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'git' ? (
          <GitRepoDetail repoName={repoName} />
        ) : (
          <div className="p-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Database Schema</h3>
              
              {hasDbConfig ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 text-white">{repoConfig?.db_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Target:</span>
                      <span className="ml-2 text-white">{repoConfig?.db_target_id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Database:</span>
                      <span className="ml-2 text-white">{repoConfig?.db_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Schema:</span>
                      <span className="ml-2 text-white">{repoConfig?.db_schema || 'public'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 py-3 border-t border-gray-700">
                    {repoConfig?.db_last_ok_at ? (
                      <span className="text-green-400 text-sm">
                        Last sync: {new Date(repoConfig.db_last_ok_at).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-yellow-400 text-sm">Never synced</span>
                    )}
                    {repoConfig?.db_schema_hash && (
                      <span className="text-gray-500 text-sm font-mono">
                        Hash: {repoConfig.db_schema_hash.slice(0, 12)}...
                      </span>
                    )}
                    {repoConfig?.db_last_err && (
                      <span className="text-red-400 text-sm">Error: {repoConfig.db_last_err}</span>
                    )}
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-6 mt-4">
                    <div className="text-gray-400 text-center py-8">
                      <div className="text-lg mb-2">Schema tables will be displayed here once 9403 pulls the schema.</div>
                      <div className="text-sm text-gray-600">Tables, columns, constraints, indexes</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-lg mb-2">Database not configured</div>
                  <div className="text-gray-500 text-sm">
                    Click "Edit Config" to link this repo to a database target.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
