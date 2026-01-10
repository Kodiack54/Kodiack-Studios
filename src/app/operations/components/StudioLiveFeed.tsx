'use client';

import { useState, useEffect, useRef } from 'react';
import { getPipelineServices, getAITeamServices, StudioService } from '../config';

type TabGroup = 'pipeline' | 'ai_team';

interface FeedEvent {
  id: string;
  serviceId: string;
  eventType: string;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface StudioLiveFeedProps {
  selectedServiceId?: string | null;
  onServiceSelect?: (serviceId: string) => void;
}

// Map event types to display badges
const eventTypeBadges: Record<string, string> = {
  context_flip: 'bg-purple-500/20 text-purple-400',
  context_heartbeat: 'bg-blue-500/20 text-blue-400',
  pc_heartbeat: 'bg-blue-500/20 text-blue-400',
  pc_sender_heartbeat: 'bg-blue-500/20 text-blue-400',
  external_claude_heartbeat: 'bg-blue-500/20 text-blue-400',
  terminal_heartbeat: 'bg-blue-500/20 text-blue-400',
  router_heartbeat: 'bg-blue-500/20 text-blue-400',
  dashboard_process_heartbeat: 'bg-blue-500/20 text-blue-400',
  pc_transcript_sent: 'bg-green-500/20 text-green-400',
  terminal_transcript_sent: 'bg-green-500/20 text-green-400',
  pc_dump_sent: 'bg-green-500/20 text-green-400',
  terminal_dump_sent: 'bg-green-500/20 text-green-400',
  transcript_received: 'bg-yellow-500/20 text-yellow-400',
  // AI Team events
  chad_tick: 'bg-blue-500/20 text-blue-400',
  chad_checkpoint: 'bg-green-500/20 text-green-400',
  chad_excursion_suppressed: 'bg-yellow-500/20 text-yellow-400',
  chad_error: 'bg-red-500/20 text-red-400',
  // Future AI team members (susan, jen, etc.) will use same colors
  susan_tick: 'bg-blue-500/20 text-blue-400',
  susan_checkpoint: 'bg-green-500/20 text-green-400',
  jen_tick: 'bg-blue-500/20 text-blue-400',
  jen_checkpoint: 'bg-green-500/20 text-green-400',
  // 94xx Drift Tracking family
  pc_git_status: 'bg-green-500/20 text-green-400',
  pc_git_commit: 'bg-green-500/20 text-green-400',
  git_status: 'bg-green-500/20 text-green-400',
  node_sensor_tick: 'bg-blue-500/20 text-blue-400',
  node_sensor_error: 'bg-red-500/20 text-red-400',
  git_origin_tick: 'bg-blue-500/20 text-blue-400',
  git_origin_error: 'bg-red-500/20 text-red-400',
  schema_status: 'bg-green-500/20 text-green-400',
  schema_tracker_tick: 'bg-blue-500/20 text-blue-400',
  schema_error: 'bg-red-500/20 text-red-400',
  sync_check: 'bg-purple-500/20 text-purple-400',
  sync_in_sync: 'bg-green-500/20 text-green-400',
  sync_drift_detected: 'bg-orange-500/20 text-orange-400',
};

export default function StudioLiveFeed({
  selectedServiceId,
  onServiceSelect,
}: StudioLiveFeedProps) {
  const [activeGroup, setActiveGroup] = useState<TabGroup>('pipeline');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);

  const pipelineServices = getPipelineServices();
  const aiTeamServices = getAITeamServices();

  // Get current services based on active group
  const currentServices = activeGroup === 'pipeline' ? pipelineServices : aiTeamServices;

  // Filter events based on active group and filter
  const filteredEvents = events.filter(event => {
    const serviceIds = currentServices.map(s => s.id);
    if (!serviceIds.includes(event.serviceId)) return false;
    if (activeFilter === 'all') return true;
    return event.serviceId === activeFilter;
  });

  // Fetch real events from API
  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (lastFetchRef.current) {
        params.set('since', lastFetchRef.current);
      }
      params.set('limit', '100');

      const res = await fetch(`/api/operations/feed?${params}`);
      const data = await res.json();

      if (data.success && data.events.length > 0) {
        setEvents(prev => {
          // Merge new events, avoiding duplicates
          // API returns ASC (oldest first), so just append
          const existingIds = new Set(prev.map(e => e.id));
          const newEvents = data.events.filter((e: FeedEvent) => !existingIds.has(e.id));
          const merged = [...prev, ...newEvents];
          // Keep only last 200 events
          return merged.slice(-200);
        });

        // Update last fetch time to most recent event (last in ASC order)
        const lastEvent = data.events[data.events.length - 1];
        if (lastEvent) {
          lastFetchRef.current = lastEvent.timestamp;
        }
        setError(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchEvents();

    if (paused) return;

    const interval = setInterval(fetchEvents, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [paused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEvents, paused]);

  // Sync selected service to filter
  useEffect(() => {
    if (selectedServiceId) {
      const isPipeline = pipelineServices.some(s => s.id === selectedServiceId);
      const isAI = aiTeamServices.some(s => s.id === selectedServiceId);
      if (isPipeline) {
        setActiveGroup('pipeline');
        setActiveFilter(selectedServiceId);
      } else if (isAI) {
        setActiveGroup('ai_team');
        setActiveFilter(selectedServiceId);
      }
    }
  }, [selectedServiceId]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventBadge = (eventType: string) => {
    return eventTypeBadges[eventType] || 'bg-gray-500/20 text-gray-400';
  };

  // AI Ops description resolver
  // AI Ops description resolver - reads from metadata, no hardcoding
  // Priority: 1) message, 2) target, 3) fallback
  const describeAIOpsEvent = (eventType: string, meta?: Record<string, unknown>): string | null => {
    // Check for explicit message override first
    const message = meta?.message as string | undefined;
    if (message) return message;

    if (eventType.endsWith('_tick')) {
      const target = meta?.target as string | undefined;
      if (!target) return 'Looking for items';
      return `Looking for ${target.replace(/_/g, ' ')}`;
    }
    if (eventType.endsWith('_checkpoint')) {
      return 'Timestamp saved — this is where I left off';
    }
    if (eventType.endsWith('_excursion_suppressed')) {
      return 'Flip less than 2 minutes — mode/project excursion suppressed';
    }
    if (eventType.endsWith('_error')) {
      const msg = (meta?.error || meta?.reason) as string | undefined;
      return msg ? `Failed to execute: ${msg}` : 'Failed to execute task';
    }
    return null;
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      context_flip: 'FLIP',
      context_heartbeat: 'BEAT',
      pc_heartbeat: 'BEAT',
      pc_sender_heartbeat: 'BEAT',
      external_claude_heartbeat: 'BEAT',
      terminal_heartbeat: 'BEAT',
      router_heartbeat: 'BEAT',
      dashboard_process_heartbeat: 'BEAT',
      pc_transcript_sent: 'SENT',
      terminal_transcript_sent: 'SENT',
      pc_dump_sent: 'SENT',
      terminal_dump_sent: 'SENT',
      transcript_received: 'RECV',
      // AI Team labels
      chad_tick: 'LOOK',
      chad_checkpoint: 'STMP',
      chad_excursion_suppressed: 'EXCP',
      chad_error: 'FAIL',
      susan_tick: 'LOOK',
      susan_checkpoint: 'STMP',
      jen_tick: 'LOOK',
      jen_checkpoint: 'STMP',
      // 94xx Drift Tracking family
      pc_git_status: 'GITS',
      pc_git_commit: 'GITS',
      git_status: 'GITS',
      node_sensor_tick: 'LOOK',
      node_sensor_error: 'FAIL',
      git_origin_tick: 'LOOK',
      git_origin_error: 'FAIL',
      schema_status: 'DATA',
      schema_tracker_tick: 'LOOK',
      schema_error: 'FAIL',
      sync_check: 'SYNC',
      sync_in_sync: 'SYNC',
      sync_drift_detected: 'SYNC',
    };
    return labels[eventType] || eventType.toUpperCase();
  };

  return (
    <div className="h-full flex flex-col bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header with Tab Groups */}
      <div className="border-b border-gray-700">
        {/* Group Tabs */}
        <div className="flex items-center gap-2 px-3 pt-2">
          <button
            onClick={() => {
              setActiveGroup('pipeline');
              setActiveFilter('all');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              activeGroup === 'pipeline'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => {
              setActiveGroup('ai_team');
              setActiveFilter('all');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              activeGroup === 'ai_team'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            AI Team
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setPaused(!paused)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              paused
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            }`}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>

        {/* Service Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-1 text-[10px] rounded whitespace-nowrap transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-500/30 text-blue-300'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            All {activeGroup === 'pipeline' ? 'Pipeline' : 'AI'}
          </button>
          {currentServices.map(service => (
            <button
              key={service.id}
              onClick={() => {
                setActiveFilter(service.id);
                onServiceSelect?.(service.id);
              }}
              className={`px-2 py-1 text-[10px] rounded whitespace-nowrap transition-colors ${
                activeFilter === service.id
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {service.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1"
      >
        {error && (
          <div className="text-red-400 text-center py-2 bg-red-500/10 rounded">
            Error: {error}
          </div>
        )}
        {loading && events.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Loading events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {paused ? 'Feed paused' : 'No events yet - waiting for activity...'}
          </div>
        ) : (
          filteredEvents.map(event => {
            const service = [...pipelineServices, ...aiTeamServices].find(
              s => s.id === event.serviceId
            );
            return (
              <div
                key={event.id}
                className="flex items-start gap-2 py-0.5 hover:bg-gray-700/50 px-1 rounded cursor-pointer"
                onClick={() => onServiceSelect?.(event.serviceId)}
              >
                <span className="text-gray-600 flex-shrink-0">
                  {formatTime(event.timestamp)}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase flex-shrink-0 ${getEventBadge(event.eventType)}`}
                >
                  {getEventLabel(event.eventType)}
                </span>
                <span className="text-cyan-400 flex-shrink-0">
                  [{service?.label || event.serviceId}]
                </span>
                <span className="text-gray-300">{event.message}</span>
                {describeAIOpsEvent(event.eventType, event.details) && (
                  <span className="text-gray-500 text-[10px] ml-2">
                    {describeAIOpsEvent(event.eventType, event.details)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-700 text-[10px] text-gray-500">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              paused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'
            }`}
          />
          <span>{paused ? 'Paused' : 'Live'}</span>
        </div>
        <span>{filteredEvents.length} events</span>
      </div>
    </div>
  );
}
