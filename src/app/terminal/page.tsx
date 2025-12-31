'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Activity, Cpu, MessageSquare, Clock, Zap, RefreshCw, Terminal as TerminalIcon, Power, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface TerminalMessage {
  id: string;
  timestamp: string;
  type: 'claude' | 'system' | 'user' | 'error' | 'tool';
  content: string;
  role?: string;
}

interface ServerStatus {
  online: boolean;
  uptime?: string;
  pid?: number;
  memory?: string;
  restarts?: number;
}

const STORAGE_KEY = 'terminal-messages';
const STORAGE_COUNT_KEY = 'terminal-message-count';

export default function TerminalPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [server5400Status, setServer5400Status] = useState<ServerStatus>({ online: false });
  const [messages, setMessages] = useState<TerminalMessage[]>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });
  const [messageCount, setMessageCount] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_COUNT_KEY);
        return saved ? parseInt(saved, 10) : 0;
      } catch { return 0; }
    }
    return 0;
  });
  const [isRestarting, setIsRestarting] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add message to feed
  const addMessage = useCallback((type: TerminalMessage['type'], content: string, role?: string) => {
    const newMessage: TerminalMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      type,
      content,
      role
    };
    setMessages(prev => [newMessage, ...prev].slice(0, 500)); // Keep last 500
    setMessageCount(prev => prev + 1);
  }, []);

  // Check server status via API
  const checkServerStatus = useCallback(async () => {
    try {
      const res = await fetch('/terminal/api/status');
      const data = await res.json();
      setServer5400Status({
        online: data.online || false,
        uptime: data.uptime,
        pid: data.pid,
        memory: data.memory,
        restarts: data.restarts
      });
      return data.online;
    } catch {
      setServer5400Status({ online: false });
      return false;
    }
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus('connecting');

    try {
      // Connect to terminal-server-5400 as monitor to receive broadcasts
      const ws = new WebSocket('ws://161.35.229.220:5400?mode=monitor');
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        setIsConnected(true);
        addMessage('system', 'Connected to terminal-server-5400');

        // Send identify message
        ws.send(JSON.stringify({
          type: 'identify',
          clientType: 'dashboard',
          name: 'Terminal Monitor'
        }));

        // Start heartbeat ping every 25 seconds to keep connection alive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle monitor mode message types from terminal server
          if (data.type === 'monitor_connected') {
            addMessage('system', `Monitor connected - ${data.activeSessions} active sessions`);
          } else if (data.type === 'monitor_output') {
            // Main output broadcast from sessions - strip ANSI codes
            const content = (data.data || '').replace(/\x1b\[[0-9;]*m/g, '').trim();
            if (!content) return;
            // Detect message type from content
            if (content.includes('External Claude') || content.includes('🤖')) {
              addMessage('claude', content);
            } else if (content.includes('User') || content.includes('👤') || content.includes('input]')) {
              addMessage('user', content);
            } else {
              addMessage('system', content);
            }
          } else if (data.type === 'session_started') {
            addMessage('system', `Session started: ${data.mode} mode - ${data.activeSessions} active`);
          } else if (data.type === 'session_ended') {
            addMessage('system', `Session ended - ${data.activeSessions} remaining`);
          } else if (data.type === 'output' || data.type === 'message') {
            const content = data.content || data.text || data.data || JSON.stringify(data);
            addMessage('claude', content);
          } else if (data.type === 'tool_use' || data.type === 'tool') {
            addMessage('tool', `Tool: ${data.name || 'unknown'} - ${data.status || ''}`);
          } else if (data.type === 'error') {
            addMessage('error', data.message || data.error || 'Unknown error');
          } else if (data.content || data.text || data.data) {
            addMessage('system', data.content || data.text || data.data);
          }
        } catch {
          // Raw text message
          if (event.data && typeof event.data === 'string' && event.data.length > 0) {
            addMessage('system', event.data);
          }
        }
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        setIsConnected(false);
        addMessage('error', 'Disconnected from terminal server');

        // Clear heartbeat ping
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Auto-reconnect after 5 seconds
        if (reconnectRef.current) clearTimeout(reconnectRef.current);
        reconnectRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };

      ws.onerror = () => {
        setWsStatus('disconnected');
        addMessage('error', 'WebSocket connection error');
      };

    } catch (err) {
      setWsStatus('disconnected');
      addMessage('error', `Failed to connect: ${(err as Error).message}`);
    }
  }, [addMessage]);

  // Restart terminal-server-5400
  const restartServer5400 = async () => {
    if (isRestarting) return;

    setIsRestarting(true);
    addMessage('system', 'Restarting terminal-server-5400...');

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const res = await fetch('/terminal/api/restart', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        addMessage('system', `Server restarted successfully. PID: ${data.pid || 'pending'}`);
        // Wait then reconnect
        setTimeout(() => {
          checkServerStatus();
          connectWebSocket();
          setIsRestarting(false);
        }, 3000);
      } else {
        addMessage('error', `Restart failed: ${data.error || 'Unknown error'}`);
        setIsRestarting(false);
      }
    } catch (err) {
      addMessage('error', `Restart request failed: ${(err as Error).message}`);
      setIsRestarting(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    // Check server status
    checkServerStatus();

    // Connect to WebSocket
    connectWebSocket();

    // Poll server status every 30 seconds
    statusIntervalRef.current = setInterval(checkServerStatus, 30000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      localStorage.setItem(STORAGE_COUNT_KEY, messageCount.toString());
    } catch { /* localStorage full or unavailable */ }
  }, [messages, messageCount]);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = 0;
    }
  }, [messages]);

  const getMessageIcon = (type: TerminalMessage['type']) => {
    switch (type) {
      case 'claude': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'user': return <Cpu className="w-4 h-4 text-green-400" />;
      case 'tool': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'system': return <TerminalIcon className="w-4 h-4 text-gray-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMessageColor = (type: TerminalMessage['type']) => {
    switch (type) {
      case 'claude': return 'text-blue-300';
      case 'user': return 'text-green-300';
      case 'tool': return 'text-yellow-300';
      case 'error': return 'text-red-400';
      case 'system': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isConnected ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            <TerminalIcon className={`w-8 h-8 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Claude Terminal Feed</h1>
            <p className="text-gray-400 text-sm">Live output from terminal-server-5400</p>
          </div>
        </div>

        {/* Connection Status & Controls */}
        <div className="flex items-center gap-3">
          {/* WebSocket Status */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            wsStatus === 'connected' ? 'bg-emerald-500/20 border border-emerald-500/30' :
            wsStatus === 'connecting' ? 'bg-yellow-500/20 border border-yellow-500/30' :
            'bg-red-500/20 border border-red-500/30'
          }`}>
            {wsStatus === 'connected' ? <Wifi className="w-4 h-4 text-emerald-400" /> :
             wsStatus === 'connecting' ? <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" /> :
             <WifiOff className="w-4 h-4 text-red-400" />}
            <span className={
              wsStatus === 'connected' ? 'text-emerald-400' :
              wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
            }>
              {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>

          <button
            onClick={connectWebSocket}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Reconnect"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={restartServer5400}
            disabled={isRestarting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isRestarting
                ? 'bg-orange-600/50 text-orange-300 cursor-wait'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            <Power className={`w-4 h-4 ${isRestarting ? 'animate-spin' : ''}`} />
            {isRestarting ? 'Restarting...' : 'Restart 5400'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Server Status */}
        <div className={`bg-gray-800 rounded-xl p-4 border ${server5400Status.online ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
          <div className="flex items-center justify-between mb-3">
            <Power className={`w-6 h-6 ${server5400Status.online ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-xs text-gray-500">5400</span>
          </div>
          <div className={`text-xl font-bold mb-1 ${server5400Status.online ? 'text-emerald-400' : 'text-red-400'}`}>
            {server5400Status.online ? 'Online' : 'Offline'}
          </div>
          <div className="text-xs text-gray-400">
            {server5400Status.online ? `PID: ${server5400Status.pid || '--'}` : 'Not running'}
          </div>
        </div>

        {/* WebSocket */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            {isConnected ? <Wifi className="w-6 h-6 text-emerald-400" /> : <WifiOff className="w-6 h-6 text-gray-600" />}
            <span className="text-xs text-gray-500">WEBSOCKET</span>
          </div>
          <div className={`text-xl font-bold mb-1 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="text-sm text-gray-400">:5400</div>
        </div>

        {/* Uptime */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-6 h-6 text-blue-400" />
            <span className="text-xs text-gray-500">UPTIME</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {server5400Status.uptime || '--'}
          </div>
          <div className="text-sm text-gray-400">server time</div>
        </div>

        {/* Messages */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            <span className="text-xs text-gray-500">MESSAGES</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{messageCount}</div>
          <div className="text-sm text-gray-400">received</div>
        </div>

        {/* Memory */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <Cpu className="w-6 h-6 text-cyan-400" />
            <span className="text-xs text-gray-500">MEMORY</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {server5400Status.memory || '--'}
          </div>
          <div className="text-sm text-gray-400">usage</div>
        </div>
      </div>

      {/* Terminal Feed */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Activity className={`w-5 h-5 ${isConnected ? 'text-emerald-400' : 'text-gray-500'}`} />
            <h2 className="font-semibold text-white">Live Terminal Output</h2>
            {isConnected && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{messages.length} messages</span>
            <button
              onClick={() => {
                setMessages([]);
                setMessageCount(0);
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(STORAGE_COUNT_KEY);
              }}
              className="text-xs text-gray-500 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>

        <div
          ref={messagesRef}
          className="h-[600px] overflow-y-auto p-4 space-y-1 font-mono text-sm bg-gray-950"
        >
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TerminalIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Waiting for terminal output...</p>
              <p className="text-xs mt-2">Messages from Claude will appear here</p>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className="flex items-start gap-2 py-1 hover:bg-gray-900/50 px-2 rounded"
              >
                <span className="text-gray-600 text-xs flex-shrink-0 w-20">
                  {formatTime(msg.timestamp)}
                </span>
                <div className="flex-shrink-0 mt-0.5">{getMessageIcon(msg.type)}</div>
                <pre className={`flex-1 whitespace-pre-wrap break-all ${getMessageColor(msg.type)}`}>
                  {msg.content}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
