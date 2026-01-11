'use client';

import { useState, useEffect } from 'react';

interface ActionEntry {
  action_code: string;
  verb: string | null;
  label: string | null;
  description: string | null;
  first_seen_at: string;
  last_seen_at: string;
  seen_count: number;
  is_tracked: boolean;
  show_in_feed: boolean;
  last_seen_agent: string | null;
  last_seen_node_id: string | null;
  last_seen_who_id: string | null;
  last_seen_who_label: string | null;
  sample_payload: Record<string, unknown> | null;
  message_template: string | null;
}

interface VerbEntry {
  verb: string;
  color: string;
  severity: number;
  description: string | null;
  sort_order: number;
}

interface WhoEntry {
  who_id: string;
  who_label: string;
  port: number | null;
  who_type: string;
  is_primary: boolean;
  is_monitored: boolean;
  family_key: string | null;
  agent?: string; // agent name mapping
}

interface HeartbeatRegistryModalProps {
  onClose: () => void;
}

// Color options for verb badges
const COLOR_OPTIONS = [
  { name: 'blue', class: 'bg-blue-500', text: 'text-blue-100' },
  { name: 'green', class: 'bg-green-500', text: 'text-green-100' },
  { name: 'red', class: 'bg-red-500', text: 'text-red-100' },
  { name: 'yellow', class: 'bg-yellow-500', text: 'text-yellow-900' },
  { name: 'purple', class: 'bg-purple-500', text: 'text-purple-100' },
  { name: 'orange', class: 'bg-orange-500', text: 'text-orange-100' },
  { name: 'gray', class: 'bg-gray-500', text: 'text-gray-100' },
  { name: 'cyan', class: 'bg-cyan-500', text: 'text-cyan-100' },
];

// Agent to WHO label mapping (fallback if who_registry doesn't have it)
const AGENT_WHO_MAP: Record<string, string> = {
  chad: '[CHAD]',
  susan: '[SUSAN]',
  jen: '[JEN]',
  pipeline: '[Pipeline]',
  dashboard: '[Dashboard]',
  ops: '[Ops]',
  terminal: '[Terminal]',
  router: '[Router]',
  sensor: '[Sensor]',
  'external-claude': '[External Claude]',
};

// Extract token value from sample_payload with fallbacks
function extractToken(payload: Record<string, unknown> | null, key: string): string {
  if (!payload) return 'unknown';

  // Direct field lookup
  const directKeys: Record<string, string[]> = {
    project: ['project', 'project_slug', 'project_name', 'project_id'],
    mode: ['mode'],
    pc: ['pc_tag', 'pc_tag_norm'],
    node: ['node_id'],
    repo: ['repo_slug', 'repo'],
    target: ['target'],
    file: ['file', 'file_path'],
    count: ['count', 'item_count'],
    source: ['source'],
    who: ['who_label', 'who_id'],
  };

  const keysToCheck = directKeys[key] || [key];

  // Check direct fields first
  for (const k of keysToCheck) {
    if (payload[k] !== undefined && payload[k] !== null) {
      return String(payload[k]);
    }
  }

  // Check nested metadata
  const metadata = payload.metadata as Record<string, unknown> | undefined;
  if (metadata) {
    for (const k of keysToCheck) {
      if (metadata[k] !== undefined && metadata[k] !== null) {
        return String(metadata[k]);
      }
    }
  }

  return 'unknown';
}

// Render a message template with token substitution
function renderTemplate(template: string, payload: Record<string, unknown> | null): string {
  if (!template) return '';

  return template.replace(/\{(\w+)\}/g, (match, token) => {
    const value = extractToken(payload, token);
    return value !== 'unknown' ? value : match; // Keep {token} if not found
  });
}

export default function HeartbeatRegistryModal({ onClose }: HeartbeatRegistryModalProps) {
  const [activeTab, setActiveTab] = useState<'actions' | 'verbs'>('actions');
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [verbs, setVerbs] = useState<VerbEntry[]>([]);
  const [programs, setPrograms] = useState<WhoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Program filter for actions tab
  const [programFilter, setProgramFilter] = useState<string>('all');

  // Expanded action for inline editing
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  // Expanded verb for editing
  const [expandedVerb, setExpandedVerb] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [actionsRes, verbsRes, whoRes] = await Promise.all([
          fetch('/api/operations/actions'),
          fetch('/api/operations/verbs'),
          fetch('/api/operations/who?primary=1'),
        ]);

        const actionsData = await actionsRes.json();
        const verbsData = await verbsRes.json();
        const whoData = await whoRes.json();

        if (actionsData.success) {
          setActions(actionsData.actions || []);
        }
        if (verbsData) {
          const verbList = Object.entries(verbsData.verbsByCode || {}).map(
            ([code, info]: [string, any]) => ({
              verb: code,
              color: info.color || 'gray',
              severity: info.severity || 0,
              description: info.description || null,
              sort_order: info.sort_order || 0,
            })
          );
          setVerbs(verbList);
        }
        if (whoData.success) {
          setPrograms(whoData.programs || []);
        }
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update action - does NOT close expanded row
  const updateAction = async (
    actionCode: string,
    updates: Partial<Pick<ActionEntry, 'verb' | 'is_tracked' | 'show_in_feed' | 'description' | 'message_template'>>
  ) => {
    setSaving(actionCode);
    try {
      const res = await fetch(`/api/operations/actions/${encodeURIComponent(actionCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setActions((prev) =>
          prev.map((a) =>
            a.action_code === actionCode ? { ...a, ...data.action } : a
          )
        );
        // DO NOT collapse after save - user wants to keep editing
      } else {
        setError(data.error || 'Update failed');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  // Update verb
  const updateVerb = async (
    verbCode: string,
    updates: Partial<Pick<VerbEntry, 'color' | 'description'>>
  ) => {
    setSaving(verbCode);
    try {
      const res = await fetch(`/api/operations/verbs/${encodeURIComponent(verbCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setVerbs((prev) =>
          prev.map((v) =>
            v.verb === verbCode ? { ...v, ...updates } : v
          )
        );
      } else {
        setError(data.error || 'Update failed');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  // Get WHO label for an action
  const getWhoLabel = (action: ActionEntry): string => {
    // Priority: explicit who_label > who_registry lookup > agent mapping > agent name
    if (action.last_seen_who_label) {
      return action.last_seen_who_label;
    }

    // Try to find in programs by who_id
    if (action.last_seen_who_id) {
      const prog = programs.find(p => p.who_id === action.last_seen_who_id);
      if (prog) return prog.who_label;
    }

    // Try agent mapping
    if (action.last_seen_agent) {
      const agentKey = action.last_seen_agent.toLowerCase().split('-')[0];
      if (AGENT_WHO_MAP[agentKey]) {
        return AGENT_WHO_MAP[agentKey];
      }
      // Capitalize agent name as fallback
      return `[${action.last_seen_agent.charAt(0).toUpperCase() + action.last_seen_agent.slice(1)}]`;
    }

    return '[Unknown]';
  };

  // Count untracked actions
  const untrackedCount = actions.filter((a) => !a.is_tracked).length;

  // Filter actions by program - match on who_id OR agent name
  const filterByProgram = (actionList: ActionEntry[]) => {
    if (programFilter === 'all') return actionList;

    // Find the selected program to get both who_id and possible agent names
    const selectedProg = programs.find(p => p.who_id === programFilter);

    return actionList.filter((a) => {
      // Direct who_id match
      if (a.last_seen_who_id === programFilter) return true;

      // Agent name match (derive agent from who_id pattern)
      if (selectedProg && a.last_seen_agent) {
        // who_id like "chad-5401" should match agent "chad"
        const whoAgent = programFilter.split('-')[0].toLowerCase();
        const actionAgent = a.last_seen_agent.toLowerCase();
        if (actionAgent === whoAgent || actionAgent.startsWith(whoAgent)) {
          return true;
        }
      }

      return false;
    });
  };

  // Split actions into untracked and tracked (after filtering)
  const filteredActions = filterByProgram(actions);
  const untrackedActions = filteredActions.filter((a) => !a.is_tracked);
  const trackedActions = filteredActions.filter((a) => a.is_tracked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-[1100px] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Heartbeat Registry</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs + Program Filter */}
        <div className="flex items-center justify-between px-6 pt-4 border-b border-gray-700/50">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'actions'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Actions
              {untrackedCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                  {untrackedCount} new
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('verbs')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'verbs'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Verbs
            </button>
          </div>

          {/* Program Filter - only show on Actions tab */}
          {activeTab === 'actions' && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs text-gray-500">Program:</span>
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Programs</option>
                {programs.map((p) => (
                  <option key={p.who_id} value={p.who_id}>
                    {p.who_label} {p.port ? `(:${p.port})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">Error: {error}</div>
          ) : activeTab === 'actions' ? (
            <div className="space-y-6">
              {/* Untracked Section */}
              {untrackedActions.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase text-yellow-400 font-medium mb-2">
                    New / Untracked ({untrackedActions.length})
                  </h3>
                  <div className="space-y-1">
                    {untrackedActions.map((action) => (
                      <ActionRow
                        key={action.action_code}
                        action={action}
                        verbs={verbs}
                        saving={saving === action.action_code}
                        expanded={expandedAction === action.action_code}
                        onToggleExpand={() => setExpandedAction(
                          expandedAction === action.action_code ? null : action.action_code
                        )}
                        onUpdate={(updates) => updateAction(action.action_code, updates)}
                        formatRelativeTime={formatRelativeTime}
                        getWhoLabel={getWhoLabel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tracked Section */}
              {trackedActions.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase text-gray-500 font-medium mb-2">
                    Tracked ({trackedActions.length})
                  </h3>
                  <div className="space-y-1">
                    {trackedActions.map((action) => (
                      <ActionRow
                        key={action.action_code}
                        action={action}
                        verbs={verbs}
                        saving={saving === action.action_code}
                        expanded={expandedAction === action.action_code}
                        onToggleExpand={() => setExpandedAction(
                          expandedAction === action.action_code ? null : action.action_code
                        )}
                        onUpdate={(updates) => updateAction(action.action_code, updates)}
                        formatRelativeTime={formatRelativeTime}
                        getWhoLabel={getWhoLabel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredActions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  {programFilter !== 'all'
                    ? 'No actions from this program'
                    : 'No action codes registered yet'}
                </div>
              )}
            </div>
          ) : (
            /* Verbs Tab - EDITABLE */
            <div className="space-y-1">
              {verbs.map((verb) => (
                <VerbRow
                  key={verb.verb}
                  verb={verb}
                  saving={saving === verb.verb}
                  expanded={expandedVerb === verb.verb}
                  onToggleExpand={() => setExpandedVerb(
                    expandedVerb === verb.verb ? null : verb.verb
                  )}
                  onUpdate={(updates) => updateVerb(verb.verb, updates)}
                />
              ))}
              {verbs.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No verbs defined
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>
            {filteredActions.length} actions{programFilter !== 'all' ? ' (filtered)' : ''}, {verbs.length} verbs, {programs.length} programs
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Action Row Component - COLLAPSED shows [VERB] [WHO] <rendered message>
function ActionRow({
  action,
  verbs,
  saving,
  expanded,
  onToggleExpand,
  onUpdate,
  formatRelativeTime,
  getWhoLabel,
}: {
  action: ActionEntry;
  verbs: VerbEntry[];
  saving: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Pick<ActionEntry, 'verb' | 'is_tracked' | 'show_in_feed' | 'description' | 'message_template'>>) => void;
  formatRelativeTime: (ts: string) => string;
  getWhoLabel: (action: ActionEntry) => string;
}) {
  const [localDescription, setLocalDescription] = useState(action.description || '');
  const [localTemplate, setLocalTemplate] = useState(action.message_template || '');

  // Reset local state when action changes
  useEffect(() => {
    setLocalDescription(action.description || '');
    setLocalTemplate(action.message_template || '');
  }, [action.description, action.message_template]);

  const selectedVerb = verbs.find((v) => v.verb === action.verb);
  const colorOption = selectedVerb ? COLOR_OPTIONS.find((c) => c.name === selectedVerb.color) : null;
  const verbBgClass = colorOption?.class || 'bg-gray-600';
  const verbTextClass = colorOption?.text || 'text-gray-100';

  // Get WHO label
  const whoLabel = getWhoLabel(action);

  // Render the message for collapsed view
  const getRenderedMessage = (): string => {
    if (action.message_template) {
      return renderTemplate(action.message_template, action.sample_payload);
    }
    if (action.description) {
      return action.description;
    }
    return `${action.last_seen_agent || 'unknown'}:${action.action_code}`;
  };

  return (
    <div className={`rounded bg-gray-800/50 ${saving ? 'opacity-50' : ''}`}>
      {/* Main Collapsed Row - [VERB] [WHO] message ... action_code last seen */}
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-800 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Expand indicator */}
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Track Toggle */}
        <label className="flex items-center gap-1 cursor-pointer flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={action.is_tracked}
            onChange={(e) => onUpdate({ is_tracked: e.target.checked })}
            disabled={saving}
            className="w-3.5 h-3.5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-[10px] text-gray-500">Trk</span>
        </label>

        {/* Show Toggle */}
        <label className="flex items-center gap-1 cursor-pointer flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={action.show_in_feed}
            onChange={(e) => onUpdate({ show_in_feed: e.target.checked })}
            disabled={saving || !action.is_tracked}
            className="w-3.5 h-3.5 rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500 disabled:opacity-40"
          />
          <span className={`text-[10px] ${action.is_tracked ? 'text-gray-500' : 'text-gray-600'}`}>
            Shw
          </span>
        </label>

        {/* Verb badge (if mapped) */}
        {action.verb ? (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${verbBgClass} ${verbTextClass}`}>
            {action.verb}
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700 text-gray-400 flex-shrink-0">
            ----
          </span>
        )}

        {/* WHO Label - BLUE - this is the program identity */}
        <span className="text-xs font-semibold text-blue-400 flex-shrink-0">
          {whoLabel}
        </span>

        {/* Rendered message - THIS IS THE MAIN CONTENT */}
        <span className="text-xs text-gray-300 truncate flex-1 min-w-0">
          {getRenderedMessage()}
        </span>

        {/* Small metadata on right */}
        <div className="flex items-center gap-3 text-[10px] text-gray-600 flex-shrink-0">
          <span className="font-mono text-gray-500">{action.action_code}</span>
          <span>last: {formatRelativeTime(action.last_seen_at)}</span>
          <span>seen: {action.seen_count.toLocaleString()}</span>
        </div>
      </div>

      {/* Expanded Editor Panel */}
      {expanded && (
        <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-800/30 space-y-3">
          {/* Verb Mapping Row */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-28">Verb Mapping:</span>
            <select
              value={action.verb || ''}
              onChange={(e) => onUpdate({ verb: e.target.value || null })}
              disabled={saving}
              className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">unmapped</option>
              {verbs.map((v) => {
                const vColor = COLOR_OPTIONS.find(c => c.name === v.color);
                return (
                  <option key={v.verb} value={v.verb}>
                    {v.verb} ({v.color}) - {v.description || 'No description'}
                  </option>
                );
              })}
            </select>
            {selectedVerb && (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${verbBgClass}`} />
                <span className="text-xs text-gray-400">{selectedVerb.color}</span>
              </div>
            )}
          </div>

          {/* Program + Action Code (read-only) */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-28">Identity:</span>
            <span className="text-xs text-blue-400 font-medium">{whoLabel}</span>
            <span className="text-xs text-gray-500">→</span>
            <span className="text-xs font-mono text-cyan-400">{action.action_code}</span>
            {action.last_seen_agent && (
              <span className="text-xs text-gray-600">(agent: {action.last_seen_agent})</span>
            )}
          </div>

          {/* Description Row */}
          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 w-28 pt-1">Description:</span>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                placeholder="What does this action mean?"
                disabled={saving}
                className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              {localDescription !== (action.description || '') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ description: localDescription || null });
                  }}
                  disabled={saving}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
                >
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Message Template Row */}
          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 w-28 pt-1">Template:</span>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={localTemplate}
                onChange={(e) => setLocalTemplate(e.target.value)}
                placeholder="e.g., Searching for {target} in {project}"
                disabled={saving}
                className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                onClick={(e) => e.stopPropagation()}
              />
              {localTemplate !== (action.message_template || '') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ message_template: localTemplate || null });
                  }}
                  disabled={saving}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
                >
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Token hints */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-28">Tokens:</span>
            <span className="text-[10px] text-gray-600 font-mono">
              {'{project}'} {'{mode}'} {'{pc}'} {'{node}'} {'{target}'} {'{repo}'} {'{file}'} {'{count}'} {'{source}'}
            </span>
          </div>

          {/* Live Preview Row */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-700/50">
            <span className="text-xs text-gray-500 w-28">Preview:</span>
            <div className="flex items-center gap-2 text-xs">
              {action.verb ? (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${verbBgClass} ${verbTextClass}`}>
                  {action.verb}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700 text-gray-400">
                  ----
                </span>
              )}
              <span className="text-blue-400 font-semibold">{whoLabel}</span>
              <span className="text-gray-300">
                {localTemplate
                  ? renderTemplate(localTemplate, action.sample_payload)
                  : localDescription || `${action.last_seen_agent || 'unknown'}:${action.action_code}`
                }
              </span>
            </div>
          </div>

          {/* Sample Payload (collapsed) */}
          {action.sample_payload && (
            <details className="text-xs">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-400">
                Sample Payload (for token values)
              </summary>
              <pre className="mt-2 p-2 bg-gray-900 rounded text-gray-400 overflow-x-auto text-[10px]">
                {JSON.stringify(action.sample_payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// Verb Row Component - NOW EDITABLE
function VerbRow({
  verb,
  saving,
  expanded,
  onToggleExpand,
  onUpdate,
}: {
  verb: VerbEntry;
  saving: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Pick<VerbEntry, 'color' | 'description'>>) => void;
}) {
  const [localColor, setLocalColor] = useState(verb.color);
  const [localDescription, setLocalDescription] = useState(verb.description || '');

  // Reset local state when verb changes
  useEffect(() => {
    setLocalColor(verb.color);
    setLocalDescription(verb.description || '');
  }, [verb.color, verb.description]);

  const colorOption = COLOR_OPTIONS.find((c) => c.name === verb.color);
  const colorClass = colorOption?.class || 'bg-gray-500';
  const textClass = colorOption?.text || 'text-gray-100';

  return (
    <div className={`rounded bg-gray-800/50 ${saving ? 'opacity-50' : ''}`}>
      {/* Collapsed Row */}
      <div
        className="flex items-center gap-3 py-2 px-3 hover:bg-gray-800 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Expand indicator */}
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        {/* Color chip */}
        <div className={`w-4 h-4 rounded ${colorClass}`} />

        {/* Verb badge preview */}
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${colorClass} ${textClass}`}>
          {verb.verb}
        </span>

        {/* Description */}
        <span className="text-sm text-gray-400 flex-1">
          {verb.description || 'No description'}
        </span>

        {/* Edit indicator */}
        <span className="text-xs text-gray-600">click to edit</span>
      </div>

      {/* Expanded Editor */}
      {expanded && (
        <div className="px-4 py-3 border-t border-gray-700/50 bg-gray-800/30 space-y-3">
          {/* Color Picker */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-24">Color:</span>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalColor(c.name);
                  }}
                  className={`w-6 h-6 rounded ${c.class} ${
                    localColor === c.name ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''
                  }`}
                  title={c.name}
                />
              ))}
            </div>
            {localColor !== verb.color && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ color: localColor });
                }}
                disabled={saving}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Save Color
              </button>
            )}
          </div>

          {/* Description */}
          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 w-24 pt-1">Description:</span>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                placeholder="What does this verb represent?"
                disabled={saving}
                className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              {localDescription !== (verb.description || '') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({ description: localDescription || null });
                  }}
                  disabled={saving}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
                >
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-700/50">
            <span className="text-xs text-gray-500 w-24">Preview:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
              COLOR_OPTIONS.find(c => c.name === localColor)?.class || 'bg-gray-500'
            } ${
              COLOR_OPTIONS.find(c => c.name === localColor)?.text || 'text-gray-100'
            }`}>
              {verb.verb}
            </span>
            <span className="text-xs text-gray-400">{localDescription || 'No description'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
