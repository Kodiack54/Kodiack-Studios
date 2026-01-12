'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Clock, MessageSquare, FileText, ChevronDown, ChevronRight, BarChart3, FolderTree, Layers, AlertTriangle } from 'lucide-react';

interface Worklog {
  id: string;
  project_id: string;
  project_slug: string;
  lane: string;
  pc_tag: string;
  window_start: string;
  window_end: string;
  message_count: number;
  bytes_raw: number;
  bytes_clean: number;
  raw_text?: string;
  clean_text_worklog?: string;
  created_at: string;
  cleaned_at?: string;
  content_status?: string; // from debug view: ok, small, empty
}

interface RollupStats {
  totalBlocks: number;
  totalMessages: number;
  totalBytes: number;
  lastActivity: string | null;
  byLane: Record<string, { count: number; messages: number; bytes: number }>;
  byProject: Record<string, { slug: string; count: number; messages: number; lastActivity: string | null }>;
}

interface CombinedBlock {
  key: string;
  project_id: string;
  project_slug: string;
  lane: string;
  window_start: string;
  window_end: string;
  pc_tags: string[];
  segments: Worklog[];
  total_chars: number;
  total_messages: number;
}

interface WorklogsTabProps {
  projectPath: string;
  projectId: string;
  projectName: string;
  isParent?: boolean;
  childProjectIds?: string[];
}

// PC tag ordering: terminal-5400 first, then alphabetical
const PC_TAG_ORDER = ['terminal-5400', 'michael-premtech'];

function sortPcTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const aIdx = PC_TAG_ORDER.indexOf(a);
    const bIdx = PC_TAG_ORDER.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Generate the last 8 3-hour windows (24 hours)
function generateCoverageWindows(): { start: Date; end: Date; label: string }[] {
  const windows: { start: Date; end: Date; label: string }[] = [];
  const now = new Date();

  // Round down to nearest 3-hour window
  const currentHour = now.getUTCHours();
  const windowHour = Math.floor(currentHour / 3) * 3;
  const currentWindow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), windowHour, 0, 0, 0));

  for (let i = 7; i >= 0; i--) {
    const start = new Date(currentWindow.getTime() - (i * 3 * 60 * 60 * 1000));
    const end = new Date(start.getTime() + (3 * 60 * 60 * 1000));
    const label = `${start.getUTCHours().toString().padStart(2, '0')}:00`;
    windows.push({ start, end, label });
  }

  return windows;
}

export default function WorklogsTab({ projectPath, projectId, projectName, isParent, childProjectIds }: WorklogsTabProps) {
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [rollup, setRollup] = useState<RollupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [combinedView, setCombinedView] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);

  useEffect(() => {
    fetchWorklogs();
  }, [projectId, isParent, childProjectIds]);

  async function fetchWorklogs() {
    setLoading(true);
    try {
      // For parent projects, fetch worklogs from all children
      let url: string;
      if (isParent && childProjectIds && childProjectIds.length > 0) {
        url = `/project-management/api/worklogs?project_ids=${childProjectIds.join(',')}&limit=100&include_rollup=true`;
      } else {
        url = `/project-management/api/worklogs?project_id=${projectId}&limit=50&include_rollup=true`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setWorklogs(data.worklogs);
        setRollup(data.rollup);
      }
    } catch (error) {
      console.error('Error fetching worklogs:', error);
    } finally {
      setLoading(false);
    }
  }

  // Format date in UTC
  const formatDateUTC = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC'
    }) + ' UTC';
  };

  // Format time range in UTC
  const formatTimeRangeUTC = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + (3 * 60 * 60 * 1000));
    const startTime = `${start.getUTCHours().toString().padStart(2, '0')}:00`;
    const endTime = `${end.getUTCHours().toString().padStart(2, '0')}:00`;
    return `${startTime}-${endTime} UTC`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLaneColor = (lane: string) => {
    switch (lane) {
      case 'worklog': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'planning': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'forge': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'support': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getContentStatusColor = (status?: string) => {
    switch (status) {
      case 'ok': return 'bg-green-500';
      case 'small': return 'bg-yellow-500';
      case 'empty': return 'bg-orange-500';
      default: return 'bg-gray-600';
    }
  };

  // Coverage strip data
  const coverageWindows = useMemo(() => generateCoverageWindows(), []);

  const coverageStatus = useMemo(() => {
    const status: Record<string, { status: string; count: number }> = {};
    const activeLane = selectedLane || 'worklog';

    coverageWindows.forEach(w => {
      const windowKey = w.start.toISOString();
      const blocksInWindow = worklogs.filter(wl => {
        const wlStart = new Date(wl.window_start);
        return wlStart.getTime() === w.start.getTime() && wl.lane === activeLane;
      });

      if (blocksInWindow.length === 0) {
        status[windowKey] = { status: 'missing', count: 0 };
      } else {
        // Use the best status from blocks in window
        const hasOk = blocksInWindow.some(b => b.content_status === 'ok' || (b.bytes_clean && b.bytes_clean > 1000));
        const hasSmall = blocksInWindow.some(b => b.content_status === 'small' || (b.bytes_clean && b.bytes_clean > 0 && b.bytes_clean <= 1000));
        if (hasOk) {
          status[windowKey] = { status: 'ok', count: blocksInWindow.length };
        } else if (hasSmall) {
          status[windowKey] = { status: 'small', count: blocksInWindow.length };
        } else {
          status[windowKey] = { status: 'empty', count: blocksInWindow.length };
        }
      }
    });

    return status;
  }, [worklogs, coverageWindows, selectedLane]);

  // Combine blocks by (project_id, lane, window_start)
  const combinedBlocks = useMemo((): CombinedBlock[] => {
    if (!combinedView) return [];

    const blockMap = new Map<string, CombinedBlock>();

    worklogs.forEach(wl => {
      const key = `${wl.project_id}|${wl.lane}|${wl.window_start}`;
      if (!blockMap.has(key)) {
        blockMap.set(key, {
          key,
          project_id: wl.project_id,
          project_slug: wl.project_slug,
          lane: wl.lane,
          window_start: wl.window_start,
          window_end: wl.window_end,
          pc_tags: [],
          segments: [],
          total_chars: 0,
          total_messages: 0,
        });
      }
      const block = blockMap.get(key)!;
      if (!block.pc_tags.includes(wl.pc_tag)) {
        block.pc_tags.push(wl.pc_tag);
      }
      block.segments.push(wl);
      block.total_chars += wl.bytes_clean || 0;
      block.total_messages += wl.message_count || 0;
    });

    // Sort segments within each block by pc_tag order
    blockMap.forEach(block => {
      block.pc_tags = sortPcTags(block.pc_tags);
      block.segments.sort((a, b) => {
        const aIdx = PC_TAG_ORDER.indexOf(a.pc_tag);
        const bIdx = PC_TAG_ORDER.indexOf(b.pc_tag);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.pc_tag.localeCompare(b.pc_tag);
      });
    });

    return Array.from(blockMap.values()).sort((a, b) =>
      new Date(b.window_start).getTime() - new Date(a.window_start).getTime()
    );
  }, [worklogs, combinedView]);

  // Filter worklogs/blocks
  const filteredWorklogs = useMemo(() => {
    let filtered = worklogs;
    if (selectedLane) {
      filtered = filtered.filter(w => w.lane === selectedLane);
    }
    if (selectedWindow) {
      filtered = filtered.filter(w => w.window_start === selectedWindow);
    }
    return filtered;
  }, [worklogs, selectedLane, selectedWindow]);

  const filteredCombinedBlocks = useMemo(() => {
    let filtered = combinedBlocks;
    if (selectedLane) {
      filtered = filtered.filter(b => b.lane === selectedLane);
    }
    if (selectedWindow) {
      filtered = filtered.filter(b => b.window_start === selectedWindow);
    }
    return filtered;
  }, [combinedBlocks, selectedLane, selectedWindow]);

  // Find missing windows for the selected lane
  const missingWindows = useMemo(() => {
    const activeLane = selectedLane || 'worklog';
    return coverageWindows.filter(w => {
      const windowKey = w.start.toISOString();
      return coverageStatus[windowKey]?.status === 'missing';
    });
  }, [coverageWindows, coverageStatus, selectedLane]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-2xl">⏳</div>
        <span className="ml-2 text-gray-400">Loading worklogs...</span>
      </div>
    );
  }

  if (worklogs.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Worklogs Yet</h3>
        <p className="text-gray-400">
          {isParent
            ? 'Worklogs from child projects will appear here as transcripts are processed.'
            : 'Worklogs will appear here as transcripts are processed into 3-hour blocks.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            {isParent ? 'Worklogs (Aggregated from Children)' : 'Worklogs'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {worklogs.length} worklog block{worklogs.length !== 1 ? 's' : ''} from transcript processing
            {rollup?.lastActivity && (
              <span> · Last activity: {formatDateUTC(rollup.lastActivity)}</span>
            )}
          </p>
        </div>

        {/* Combined View Toggle */}
        <button
          onClick={() => setCombinedView(!combinedView)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            combinedView
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          Combined View
        </button>
      </div>

      {/* Coverage Strip */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase font-semibold">Last 24 Hours Coverage</span>
          {selectedWindow && (
            <button
              onClick={() => setSelectedWindow(null)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {coverageWindows.map((w, idx) => {
            const windowKey = w.start.toISOString();
            const status = coverageStatus[windowKey];
            const isSelected = selectedWindow === windowKey;

            let bgColor = 'bg-gray-600';
            if (status?.status === 'ok') bgColor = 'bg-green-500';
            else if (status?.status === 'small') bgColor = 'bg-yellow-500';
            else if (status?.status === 'empty') bgColor = 'bg-orange-500';
            else if (status?.status === 'missing') bgColor = 'bg-gray-700';

            return (
              <button
                key={idx}
                onClick={() => setSelectedWindow(isSelected ? null : windowKey)}
                className={`flex-1 rounded transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-gray-800' : ''
                }`}
                title={`${w.label} - ${status?.status || 'unknown'} (${status?.count || 0} blocks)`}
              >
                <div className={`h-6 ${bgColor} rounded-t ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`} />
                <div className="text-[10px] text-gray-400 mt-1 text-center">{w.label}</div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded" /> OK</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded" /> Small</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded" /> Empty</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-700 rounded" /> Missing</span>
        </div>
      </div>

      {/* Rollup Stats Panel */}
      {rollup && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">
              {isParent ? 'Child Projects Summary' : 'Activity Summary'}
            </h3>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{rollup.totalBlocks}</p>
              <p className="text-xs text-gray-400">Total Blocks</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{rollup.totalMessages.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Messages</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{formatBytes(rollup.totalBytes)}</p>
              <p className="text-xs text-gray-400">Content Size</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{Object.keys(rollup.byProject).length}</p>
              <p className="text-xs text-gray-400">{isParent ? 'Active Children' : 'Projects'}</p>
            </div>
          </div>

          {/* Lane Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedLane(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !selectedLane
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All ({rollup.totalBlocks})
            </button>
            {Object.entries(rollup.byLane).map(([lane, stats]) => (
              <button
                key={lane}
                onClick={() => setSelectedLane(selectedLane === lane ? null : lane)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  selectedLane === lane
                    ? getLaneColor(lane)
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-transparent'
                }`}
              >
                {lane} ({stats.count})
              </button>
            ))}
          </div>

          {/* Child Projects Breakdown - Only for parent */}
          {isParent && Object.keys(rollup.byProject).length > 0 && (
            <div className="border-t border-gray-700 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <FolderTree className="w-4 h-4 text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-400 uppercase">By Child Project</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(rollup.byProject).map(([id, stats]) => (
                  <div key={id} className="bg-gray-900/50 rounded p-2 flex items-center justify-between">
                    <span className="text-sm text-white truncate">{stats.slug}</span>
                    <span className="text-xs text-gray-400">{stats.count} blocks</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Missing Coverage Warnings */}
      {missingWindows.length > 0 && (
        <div className="space-y-1 mb-4">
          {missingWindows.map((w, idx) => (
            <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">
                No worklog captured for {formatTimeRangeUTC(w.start.toISOString())}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs ${getLaneColor(selectedLane || 'worklog')}`}>
                {selectedLane || 'worklog'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Worklog List */}
      <div className="space-y-3">
        {combinedView ? (
          // Combined View - Merged blocks
          filteredCombinedBlocks.map((block) => (
            <div
              key={block.key}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Header Row */}
              <button
                onClick={() => setExpandedId(expandedId === block.key ? null : block.key)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {expandedId === block.key ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}

                  {/* Time Window */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-white font-medium">{formatTimeRangeUTC(block.window_start)}</span>
                  </div>

                  {/* Lane Badge */}
                  <span className={`px-2 py-0.5 rounded text-xs border ${getLaneColor(block.lane)}`}>
                    {block.lane}
                  </span>

                  {/* PC Tag Badges */}
                  <div className="flex gap-1">
                    {block.pc_tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Project Slug - show for parent rollups */}
                  {isParent && (
                    <span className="text-blue-400 text-sm">{block.project_slug}</span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Layers className="w-4 h-4" />
                    <span>{block.segments.length} seg</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>{block.total_messages}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <FileText className="w-4 h-4" />
                    <span>{formatBytes(block.total_chars)}</span>
                  </div>
                </div>
              </button>

              {/* Expanded Content - Concatenated segments */}
              {expandedId === block.key && (
                <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/50">
                  <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono space-y-4">
                    {block.segments.map((seg, idx) => (
                      <div key={seg.id}>
                        {block.segments.length > 1 && (
                          <div className="text-xs text-gray-500 mb-1 pb-1 border-b border-gray-700">
                            --- {seg.pc_tag} ---
                          </div>
                        )}
                        {seg.clean_text_worklog ? (
                          <>
                            {seg.clean_text_worklog.substring(0, 3000)}
                            {seg.clean_text_worklog.length > 3000 && (
                              <span className="text-gray-500">... (truncated)</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500 italic">No content</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          // Standard View - Individual blocks grouped by pc_tag
          filteredWorklogs.map((worklog) => (
            <div
              key={worklog.id}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Header Row */}
              <button
                onClick={() => setExpandedId(expandedId === worklog.id ? null : worklog.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {expandedId === worklog.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}

                  {/* Time Window */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-white font-medium">{formatTimeRangeUTC(worklog.window_start)}</span>
                  </div>

                  {/* Lane Badge */}
                  <span className={`px-2 py-0.5 rounded text-xs border ${getLaneColor(worklog.lane)}`}>
                    {worklog.lane}
                  </span>

                  {/* Project Slug - show for parent rollups */}
                  {isParent && (
                    <span className="text-blue-400 text-sm">{worklog.project_slug}</span>
                  )}

                  {/* PC Tag */}
                  <span className="text-gray-500 text-sm">{worklog.pc_tag}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <MessageSquare className="w-4 h-4" />
                    <span>{worklog.message_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <FileText className="w-4 h-4" />
                    <span>{formatBytes(worklog.bytes_clean || 0)}</span>
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedId === worklog.id && worklog.clean_text_worklog && (
                <div className="px-4 py-3 border-t border-gray-700 bg-gray-900/50">
                  <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                    {worklog.clean_text_worklog.substring(0, 5000)}
                    {worklog.clean_text_worklog.length > 5000 && (
                      <span className="text-gray-500">... (truncated)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
