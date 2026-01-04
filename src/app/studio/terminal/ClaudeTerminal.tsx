'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Power, PowerOff, FolderOpen, Brain, Square } from 'lucide-react';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useUser } from '@/app/settings/UserContext';

import {
  type ChatLogMessage,
  type ConversationMessage,
  type ClaudeTerminalProps,
  DEV_DROPLET,
  BRIEFING_FALLBACK_MS,
  cleanAnsiCodes,
  sendChunkedMessage,
  sendMultipleEnters,
  sendEnter,
  useSusanBriefing,
  useChadTranscription,
} from './index';
import { buildBriefingScript } from '@/lib/buildBriefingScript';

export type { ChatLogMessage, ConversationMessage };

export function ClaudeTerminal({
  projectPath = '/var/www/Studio',
  wsUrl,
  port = 5410,
  projectId,
  projectSlug,
  userId,
  pcTag,
  projectName,
  devTeam,
  onMessage,
  sendRef,
  connectRef,
  onConversationMessage,
  onConnectionChange,
}: ClaudeTerminalProps) {
  const { user } = useUser();
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const contextSentRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [briefingSent, setBriefingSent] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    memoryStatus,
    susanContext,
    susanContextRef,
    fetchSusanContext,
    reset: resetSusan,
  } = useSusanBriefing(projectPath);

  // Chad port is terminal port + 1 (e.g., 5410 → 5411)
  const chadPort = port + 1;
  const {
    connectToChad,
    sendToChad,
    disconnect: disconnectChad,
  } = useChadTranscription(projectPath, user?.id, user?.name, chadPort);

  const briefingSentToClaudeRef = useRef<boolean>(false);
  const claudeCodeLoadedRef = useRef<boolean>(false);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendChunkedMessage(wsRef.current, message);
    }
  }, []);

  // Send interrupt signal (Ctrl+C) to stop current operation
  const sendInterrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Send Ctrl+C (ASCII 0x03) to interrupt the process
      wsRef.current.send(JSON.stringify({ type: 'input', data: '\x03' }));
      if (xtermRef.current) {
        xtermRef.current.writeln('\x1b[33m\n⏹ Interrupt sent (Ctrl+C)\x1b[0m');
      }
      console.log('[ClaudeTerminal] Interrupt signal sent');
    }
  }, []);

  // ESC key handler - sends interrupt to stop Claude
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && connected) {
        e.preventDefault();
        sendInterrupt();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [connected, sendInterrupt]);

  useEffect(() => {
    if (sendRef) {
      sendRef.current = connected ? sendMessage : null;
    }
  }, [sendRef, sendMessage, connected]);

  useEffect(() => {
    onConnectionChange?.(connected);
  }, [connected, onConnectionChange]);

  // Initialize xterm.js
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      const term = new Terminal({
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#58a6ff',
          cursorAccent: '#0d1117',
          black: '#0d1117',
          red: '#ff7b72',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#39c5cf',
          white: '#e6edf3',
          brightBlack: '#484f58',
          brightRed: '#ffa198',
          brightGreen: '#56d364',
          brightYellow: '#e3b341',
          brightBlue: '#79c0ff',
          brightMagenta: '#d2a8ff',
          brightCyan: '#56d4dd',
          brightWhite: '#ffffff',
        },
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 5000,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      if (terminalRef.current) {
        term.open(terminalRef.current);
        fitAddon.fit();

        term.writeln('\x1b[36m═══════════════════════════════════════════\x1b[0m');
        term.writeln(`\x1b[36m   🤖 AI Team Member Terminal (${port})       \x1b[0m`);
        term.writeln('\x1b[36m═══════════════════════════════════════════\x1b[0m');
        term.writeln('');
        term.writeln('\x1b[33mClick "Connect" to start the AI team member\x1b[0m');
        term.writeln('');

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
      }
    };

    initTerminal();

    const handleResize = () => {
      if (fitAddonRef.current) {
        setTimeout(() => fitAddonRef.current?.fit(), 100);
      }
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [port]);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Safety guard - never connect without full session context
    if (!projectId || !userId || !pcTag) {
      console.warn('[ClaudeTerminal] connect() blocked – missing context', {
        projectId,
        userId,
        pcTag,
      });
      return;
    }

    setConnecting(true);
    contextSentRef.current = false;

    const contextPromise = fetchSusanContext();

    // Build WebSocket URL with session context for transcript tracking
    let serverUrl = wsUrl || `ws://${DEV_DROPLET}:${port}?path=${encodeURIComponent(projectPath)}`;
    if (projectId) serverUrl += `&project_id=${encodeURIComponent(projectId)}`;
    if (projectSlug) serverUrl += `&project_slug=${encodeURIComponent(projectSlug)}`;
    if (userId) serverUrl += `&user_id=${encodeURIComponent(userId)}`;
    if (pcTag) serverUrl += `&pc_tag=${encodeURIComponent(pcTag)}`;
    console.log('[ClaudeTerminal] Connecting via WebSocket to:', serverUrl);

    const ws = new WebSocket(serverUrl);

    ws.onopen = async () => {
      console.log('[ClaudeTerminal] WebSocket connected');
      setConnected(true);
      setConnecting(false);

      connectToChad();

      if (xtermRef.current) {
        xtermRef.current.writeln('\x1b[32m[Connected]\x1b[0m');
        xtermRef.current.writeln('');
        xtermRef.current.writeln('\x1b[36m☕ Hold please... your AI team member will be right with you.\x1b[0m');
        xtermRef.current.writeln('\x1b[90m   Starting Claude Code...\x1b[0m');

        const context = await contextPromise;
        if (context) {
          xtermRef.current.writeln('\x1b[35m   📚 Susan is loading memory...\x1b[0m');
        }
        xtermRef.current.writeln('');
      }

      if (fitAddonRef.current && xtermRef.current) {
        ws.send(JSON.stringify({ type: 'resize', cols: xtermRef.current.cols, rows: xtermRef.current.rows }));
      }

      // Start Claude Code: type "claude", wait, press Enter, wait for load, then send briefing
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          // Step 1: Type "claude" (without Enter)
          ws.send(JSON.stringify({ type: 'input', data: 'claude' }));

          // Step 2: After 500ms, press Enter to execute
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'input', data: '\r' }));

              // Step 3: Wait for Claude to fully load, then send project briefing
              setTimeout(() => {
                if (!contextSentRef.current && ws.readyState === WebSocket.OPEN) {
                  contextSentRef.current = true;
                  briefingSentToClaudeRef.current = true;

                  console.log('[ClaudeTerminal] Sending project briefing to Claude');
                  if (xtermRef.current) {
                    xtermRef.current.writeln('\x1b[35m\n📚 Sending project briefing to Claude...\x1b[0m');
                  }

                  // Build the same briefing script used in the external overlay
                  const briefingScript = buildBriefingScript({
                    projectName: projectName || '(Unknown Project)',
                    projectId: projectId || '(No project id)',
                    projectSlug: projectSlug || undefined,
                    devTeam: devTeam || '(No team)',
                    basePort: port,
                    devSlot: devTeam ? devTeam.replace('dev', '') : '1',
                    pcTag: pcTag || '(No pcTag)',
                    userName: user?.name || '(Unknown user)',
                  });

                  sendChunkedMessage(ws, briefingScript, () => {
                    sendMultipleEnters(ws, () => {
                      // Briefing fully sent, unlock chat box
                      setBriefingSent(true);
                      if (xtermRef.current) {
                        xtermRef.current.writeln('\x1b[32m\n✅ Ready - chat box unlocked\x1b[0m');
                      }
                    });
                  });
                }
              }, BRIEFING_FALLBACK_MS);
            }
          }, 500);
        }
      }, 2000);

      setTimeout(() => inputRef.current?.focus(), 100);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && xtermRef.current) {
          xtermRef.current.write(msg.data);
          xtermRef.current.scrollToBottom();

          sendToChad(msg.data);

          const cleanData = cleanAnsiCodes(msg.data);

          // Detect when Claude Code TUI has loaded
          if (!claudeCodeLoadedRef.current) {
            const hasClaudeUI = cleanData.includes('Claude Code') ||
                               cleanData.includes('Opus') ||
                               cleanData.includes('What would you like') ||
                               cleanData.includes('How can I help') ||
                               cleanData.includes('❯');
            if (hasClaudeUI) {
              claudeCodeLoadedRef.current = true;
              console.log('[ClaudeTerminal] Claude Code TUI detected');
            }
          }

          // Note: Susan briefing is now sent via timer (10s after connect)
          // Detection removed for reliability
        } else if (msg.type === 'exit') {
          if (xtermRef.current) {
            xtermRef.current.writeln(`\x1b[33m[Process exited: ${msg.code}]\x1b[0m`);
          }
          setConnected(false);
        }
      } catch (e) {
        console.error('[ClaudeTerminal] Message parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('[ClaudeTerminal] WebSocket error:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln('\x1b[31m[Connection error]\x1b[0m');
      }
      setConnecting(false);
    };

    ws.onclose = () => {
      console.log('[ClaudeTerminal] WebSocket closed');
      setConnected(false);
      setConnecting(false);
      setBriefingSent(false);
      if (xtermRef.current) {
        xtermRef.current.writeln('\x1b[33m[Disconnected]\x1b[0m');
      }
    };

    wsRef.current = ws;
  }, [projectPath, wsUrl, port, projectId, projectSlug, userId, pcTag, fetchSusanContext, susanContextRef, connectToChad, sendToChad]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    disconnectChad();
    setConnected(false);
    setBriefingSent(false);
    resetSusan();
    briefingSentToClaudeRef.current = false;
    claudeCodeLoadedRef.current = false;
  }, [disconnectChad, resetSusan]);

  useEffect(() => {
    if (connectRef) {
      connectRef.current = connect;
    }
  }, [connectRef, connect]);

  // Auto-connect when required session context is ready
  useEffect(() => {
    if (connected || connecting || wsRef.current) return;

    // Require full Studio context before connecting
    if (!projectId || !userId || !pcTag) return;

    const timer = setTimeout(() => {
      connect();
    }, 500);

    return () => clearTimeout(timer);
  }, [connected, connecting, projectId, userId, pcTag, connect]);

  const sendInput = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (inputValue.trim()) {
        sendChunkedMessage(wsRef.current, inputValue);
      } else {
        sendEnter(wsRef.current);
      }
      setInputValue('');
    }
  }, [inputValue]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="text-sm font-medium text-white">AI Worker</span>
          <span className="text-xs text-orange-400/60">[:{port}]</span>
          <span className={`px-1.5 py-0.5 text-xs rounded ${
            connected ? 'bg-green-600/20 text-green-400' :
            connecting ? 'bg-yellow-600/20 text-yellow-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
          </span>
          {connected && (
            <span className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${
              memoryStatus === 'loaded' ? 'bg-purple-600/20 text-purple-400' :
              memoryStatus === 'loading' ? 'bg-yellow-600/20 text-yellow-400' :
              'bg-gray-700 text-gray-500'
            }`}>
              <Brain className="w-3 h-3" />
              {memoryStatus === 'loaded' ? 'Memory' : memoryStatus === 'loading' ? 'Loading...' : 'No Memory'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {connected ? (
            <>
              {/* Stop button - sends Ctrl+C interrupt */}
              <button
                onClick={sendInterrupt}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded"
                title="Stop current operation (ESC)"
              >
                <Square className="w-3 h-3" />
                Stop
              </button>
              <button
                onClick={disconnect}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded"
              >
                <PowerOff className="w-3 h-3" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded disabled:opacity-50"
            >
              <Power className="w-3 h-3" />
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Project path */}
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-500">
        <FolderOpen className="w-3 h-3" />
        <span className="truncate">{projectPath}</span>
      </div>

      {/* Terminal output */}
      <div
        ref={terminalRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-auto"
        style={{ padding: '8px' }}
      />

      {/* Chat Input Box - Orange themed, locked until briefing sent */}
      <div className="shrink-0 border-t-2 border-orange-600">
        <div className="px-2 py-1 bg-orange-600/20 flex items-center gap-2">
          <span className="text-orange-400 text-xs font-medium">Chat with Claude</span>
          {!connected && <span className="text-orange-400/50 text-xs">(connecting...)</span>}
          {connected && !briefingSent && <span className="text-yellow-400/70 text-xs">(loading Claude & briefing...)</span>}
          {connected && briefingSent && <span className="text-green-400/70 text-xs">(ready)</span>}
        </div>
        <div className="px-2 py-2 bg-gray-800">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (connected && briefingSent) sendInput();
              }
            }}
            placeholder={
              !connected ? "Connecting to Claude..." :
              !briefingSent ? "Please wait - loading Claude and sending briefing..." :
              "Type a message and press Enter... (Shift+Enter for new line)"
            }
            rows={4}
            disabled={!connected || !briefingSent}
            className="w-full bg-gray-900 border-2 border-orange-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}

export default ClaudeTerminal;
