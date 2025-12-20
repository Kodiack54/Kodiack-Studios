'use client';

import { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { usePipelineStatus } from './hooks/usePipelineStatus';
import type { BucketCounts, PipelineHealth } from './types';

export default function SessionHubPage() {
  const {
    chadStatus,
    jenStatus,
    susanStatus,
    buckets,
    previousBuckets,
    sessions,
    health,
    totalPending,
    bucketDelta,
    loading,
    triggerWorker,
    refreshAll,
  } = usePipelineStatus();

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-auto">
      {/* Header with overall health */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Session Hub</h1>
          <HealthBadge health={health.overall} />
        </div>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm rounded transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Pipeline Flow Visualization */}
      <div className="px-4 py-4 bg-gray-800/50 border-b border-gray-700 shrink-0">
        <div className="text-xs text-gray-500 mb-3">PIPELINE FLOW</div>
        <div className="flex items-center justify-between">
          {/* Chad - Capture */}
          <WorkerCard
            name="Chad"
            role="Capture"
            port={5401}
            status={chadStatus}
            health={health.chad}
            metric={chadStatus.sessionsCapured}
            metricLabel="sessions"
            color="blue"
            onTrigger={() => triggerWorker('chad')}
          />

          {/* Arrow with session count */}
          <FlowArrow
            count={chadStatus.queue}
            label="dumps"
            direction="right"
            active={chadStatus.queue > 0}
          />

          {/* Jen - Scrub & Flag */}
          <WorkerCard
            name="Jen"
            role="Scrub & Flag"
            port={5407}
            status={jenStatus}
            health={health.jen}
            metric={jenStatus.itemsFlagged}
            metricLabel="flagged"
            color="purple"
            onTrigger={() => triggerWorker('jen')}
          />

          {/* Arrow with flagged count */}
          <FlowArrow
            count={totalPending}
            label="pending"
            direction="right"
            active={totalPending > 0}
            trend={bucketDelta}
          />

          {/* Susan - Categorize */}
          <WorkerCard
            name="Susan"
            role="Categorize"
            port={5403}
            status={susanStatus}
            health={health.susan}
            metric={susanStatus.itemsCategorized}
            metricLabel="filed"
            color="green"
            onTrigger={() => triggerWorker('susan')}
          />
        </div>
      </div>

      {/* Bucket Counters - Real-time, ALL buckets from Jen */}
      <div className="px-4 py-4 border-b border-gray-700 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-500">FLAGGED BY JEN (waiting for Susan)</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Total:</span>
            <span className={`text-sm font-mono font-bold ${totalPending > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {totalPending}
            </span>
            {bucketDelta !== 0 && (
              <span className={`text-xs font-mono ${bucketDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ({bucketDelta > 0 ? '+' : ''}{bucketDelta})
              </span>
            )}
          </div>
        </div>
        {/* Dynamic bucket grid - shows ALL buckets */}
        {Object.keys(buckets).length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No buckets yet - waiting for Jen to flag items
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {Object.entries(buckets)
              .sort((a, b) => b[1] - a[1]) // Sort by count descending
              .map(([name, count]) => (
                <BucketCounter
                  key={name}
                  name={name}
                  count={count}
                  prev={previousBuckets[name] ?? 0}
                />
              ))}
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="text-xs text-gray-500 mb-3">RECENT SESSIONS ({sessions.length})</div>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">📭</div>
            <p>No sessions captured yet</p>
            <p className="text-xs mt-1">Chad dumps every 10 minutes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 20).map(session => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Health badge component
function HealthBadge({ health }: { health: PipelineHealth['overall'] }) {
  const config = {
    healthy: { bg: 'bg-green-600/20', text: 'text-green-400', icon: CheckCircle, label: 'Healthy' },
    degraded: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', icon: AlertTriangle, label: 'Degraded' },
    down: { bg: 'bg-red-600/20', text: 'text-red-400', icon: XCircle, label: 'Down' },
  };
  const c = config[health];
  const Icon = c.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${c.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${c.text}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
    </div>
  );
}

// Worker card component
interface WorkerCardProps {
  name: string;
  role: string;
  port: number;
  status: { isRunning: boolean; queue: number; processed: number; lastActivity: string | null; error: string | null };
  health: 'healthy' | 'stuck' | 'error' | 'idle';
  metric: number;
  metricLabel: string;
  color: 'blue' | 'purple' | 'green';
  onTrigger: () => void;
}

function WorkerCard({ name, role, port, status, health, metric, metricLabel, color, onTrigger }: WorkerCardProps) {
  const colors = {
    blue: { bg: 'bg-blue-900/40', border: 'border-blue-600', text: 'text-blue-400', dot: 'bg-blue-400' },
    purple: { bg: 'bg-purple-900/40', border: 'border-purple-600', text: 'text-purple-400', dot: 'bg-purple-400' },
    green: { bg: 'bg-green-900/40', border: 'border-green-600', text: 'text-green-400', dot: 'bg-green-400' },
  };
  const c = colors[color];

  const healthColors = {
    healthy: 'bg-green-400',
    stuck: 'bg-yellow-400',
    error: 'bg-red-400',
    idle: 'bg-gray-500',
  };

  return (
    <div className={`px-4 py-3 rounded-lg border ${c.bg} ${c.border} min-w-[140px]`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${healthColors[health]} ${status.isRunning ? 'animate-pulse' : ''}`} />
          <span className={`font-semibold ${c.text}`}>{name}</span>
        </div>
        <span className="text-[10px] text-gray-500">:{port}</span>
      </div>

      {/* Role */}
      <div className="text-xs text-gray-400 mb-2">{role}</div>

      {/* Main metric */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-white">{metric}</span>
        <span className="text-xs text-gray-500">{metricLabel}</span>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-gray-500">
          {status.lastActivity ? formatTimeAgo(status.lastActivity) : 'No activity'}
        </div>
        <button
          onClick={onTrigger}
          disabled={status.isRunning}
          className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded transition-colors"
        >
          {status.isRunning ? 'Running...' : 'Trigger'}
        </button>
      </div>

      {/* Error display */}
      {status.error && (
        <div className="mt-2 p-1.5 bg-red-900/30 border border-red-700 rounded text-[10px] text-red-400 truncate">
          {status.error}
        </div>
      )}
    </div>
  );
}

// Flow arrow component
interface FlowArrowProps {
  count: number;
  label: string;
  direction: 'right';
  active: boolean;
  trend?: number;
}

function FlowArrow({ count, label, active, trend }: FlowArrowProps) {
  return (
    <div className="flex flex-col items-center px-2">
      <div className="flex items-center gap-1">
        <div className={`w-6 h-0.5 ${active ? 'bg-yellow-500' : 'bg-gray-700'}`} />
        <div className={`px-2 py-1 rounded text-xs font-mono ${
          active ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-600' : 'bg-gray-800 text-gray-500 border border-gray-700'
        }`}>
          {count}
          {trend !== undefined && trend !== 0 && (
            <span className={`ml-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '↑' : '↓'}
            </span>
          )}
        </div>
        <div className={`w-6 h-0.5 ${active ? 'bg-yellow-500' : 'bg-gray-700'}`} />
        <span className={`${active ? 'text-yellow-500' : 'text-gray-600'}`}>→</span>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
    </div>
  );
}

// Bucket counter component - dynamic, shows name-count format
interface BucketCounterProps {
  name: string;
  count: number;
  prev: number;
}

function BucketCounter({ name, count, prev }: BucketCounterProps) {
  const delta = count - prev;

  // Assign colors based on count (higher = more prominent)
  const getBgClass = () => {
    if (count === 0) return 'bg-gray-800/50 border-gray-700';
    if (count >= 50) return 'bg-purple-900/30 border-purple-600/50';
    if (count >= 20) return 'bg-blue-900/30 border-blue-600/50';
    if (count >= 10) return 'bg-cyan-900/30 border-cyan-600/50';
    return 'bg-gray-800/80 border-gray-600/50';
  };

  return (
    <div className={`p-2 rounded border ${getBgClass()} hover:brightness-110 transition-all`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 truncate max-w-[80px]" title={name}>
          {name}
        </span>
        {delta !== 0 && (
          <span className={`text-[10px] font-mono ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      <div className={`text-xl font-bold ${count > 0 ? 'text-white' : 'text-gray-600'}`}>
        {count}
      </div>
    </div>
  );
}

// Session row component - shows user, time range, source
function SessionRow({ session }: { session: any }) {
  // Format time range
  const startTime = session.started_at ? formatTime(session.started_at) : '??:??';
  const endTime = session.ended_at ? formatTime(session.ended_at) : 'ongoing';
  const timeRange = `${startTime} - ${endTime}`;

  // Get status color and stage
  const getStage = () => {
    if (session.categorized_by_susan) return { label: 'Done', color: 'text-green-400', bg: 'bg-green-900/20' };
    if (session.scrubbed_by_jen) return { label: 'Susan', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
    if (session.captured_by_chad) return { label: 'Jen', color: 'text-purple-400', bg: 'bg-purple-900/20' };
    return { label: 'Chad', color: 'text-blue-400', bg: 'bg-blue-900/20' };
  };
  const stage = getStage();

  return (
    <div className={`p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors ${stage.bg}`}>
      {/* Top row: User and time range */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {session.user_name || session.user_id || 'Unknown User'}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${stage.color} bg-gray-800/50`}>
            → {stage.label}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          {timeRange}
        </span>
      </div>

      {/* Bottom row: Source and pipeline dots */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          from: <span className="text-gray-400">{session.source_name || session.source_type || 'Unknown'}</span>
        </span>
        <div className="flex items-center gap-1">
          <PipelineDot done={session.captured_by_chad} label="C" title="Chad captured" />
          <div className="w-2 h-px bg-gray-700" />
          <PipelineDot done={session.scrubbed_by_jen} label="J" title="Jen scrubbed" />
          <div className="w-2 h-px bg-gray-700" />
          <PipelineDot done={session.categorized_by_susan} label="S" title="Susan categorized" />
          {session.flags_found !== undefined && session.flags_found > 0 && (
            <span className="ml-1 text-[10px] text-purple-400">
              +{session.flags_found}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Format time as HH:MM AM/PM
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function PipelineDot({ done, label, title }: { done?: boolean; label: string; title: string }) {
  return (
    <div
      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
        done ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-500'
      }`}
      title={title}
    >
      {label}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
