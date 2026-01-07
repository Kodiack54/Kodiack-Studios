'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Power, PowerOff, FolderOpen, Brain, Square } from 'lucide-react';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useUser } from '@/app/settings/UserContext';
import { useDeveloper, type TerminalOutputMessage } from '@/app/contexts/DeveloperContext';

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
// Note: buildBriefingScript removed - server-side packet generator used instead

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

  // Use shared WebSocket from DeveloperContext for session persistence
  const {
    terminalConnected,
    terminalOutputBuffer,
    connectTerminal,
    disconnectTerminal,
    sendToTerminal,
    onTerminalMessage,
    clearOutputBuffer,
    connectionStatus,
  } = useDeveloper();

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const contextSentRef = useRef(false);

  const [connecting, setConnecting] = useState(false);
  const [briefingSent, setBriefingSent] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Track if we've restored the buffer (only do once per mount)
  const bufferRestoredRef = useRef(false);
  // Track if startup sequence has been initiated this session
  const startupInitiatedRef = useRef(false);

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
  const unlockFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessage = useCallback((message: string) => {
    if (terminalConnected) {
      // Send in chunks to avoid overwhelming the terminal
      const chunkSize = 500;
      for (let i = 0; i < message.length; i += chunkSize) {
        const chunk = message.slice(i, i + chunkSize);
        sendToTerminal(chunk);
      }
      sendToTerminal('\r');
    }
  }, [terminalConnected, sendToTerminal]);

  // Send interrupt signal (Ctrl+C) to stop current operation
  const sendInterrupt = useCallback(() => {
    if (terminalConnected) {
      // Send Ctrl+C (ASCII 0x03) to interrupt the process
      sendToTerminal('\x03');
      if (xtermRef.current) {
        xtermRef.current.writeln('\x1b[33m\n⏹ Interrupt sent (Ctrl+C)\x1b[0m');
      }
      console.log('[ClaudeTerminal] Interrupt signal sent');
    }
  }, [terminalConnected, sendToTerminal]);

  // ESC key handler - sends interrupt to stop Claude
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && terminalConnected) {
        e.preventDefault();
        sendInterrupt();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [terminalConnected, sendInterrupt]);

  useEffect(() => {
    if (sendRef) {
      sendRef.current = terminalConnected ? sendMessage : null;
    }
  }, [sendRef, sendMessage, terminalConnected]);

  useEffect(() => {
    onConnectionChange?.(terminalConnected);
  }, [terminalConnected, onConnectionChange]);

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

  // Subscribe to terminal messages from DeveloperContext
  useEffect(() => {
    const unsubscribe = onTerminalMessage((msg: TerminalOutputMessage) => {
      if (msg.type === 'output' && msg.data && xtermRef.current) {
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

        // Early unlock when Claude starts responding to /startproject
        if (!briefingSentToClaudeRef.current && claudeCodeLoadedRef.current && contextSentRef.current) {
          const hasBriefingOutput = cleanData.includes('PROJECT BRIEFING') ||
                                    cleanData.includes('Ready to work') ||
                                    cleanData.includes('Project Snapshot') ||
                                    cleanData.includes('briefingPacket');
          if (hasBriefingOutput) {
            briefingSentToClaudeRef.current = true;
            if (unlockFallbackRef.current) {
              clearTimeout(unlockFallbackRef.current);
              unlockFallbackRef.current = null;
            }
            setBriefingSent(true);
            console.log('[ClaudeTerminal] Briefing output detected - chat unlocked');
            if (xtermRef.current) {
              xtermRef.current.writeln('\x1b[32m\n✅ Ready - chat box unlocked\x1b[0m');
            }
          }
        }
      } else if (msg.type === 'exit') {
        if (xtermRef.current) {
          xtermRef.current.writeln(`\x1b[33m[Process exited: ${msg.code}]\x1b[0m`);
        }
      }
    });

    return unsubscribe;
  }, [onTerminalMessage, sendToChad]);

  // Restore buffer when navigating back to terminal (if already connected)
  useEffect(() => {
    if (xtermRef.current && terminalConnected && terminalOutputBuffer.length > 0 && !bufferRestoredRef.current) {
      console.log('[ClaudeTerminal] Restoring terminal buffer:', terminalOutputBuffer.length, 'messages');
      // Clear terminal and restore buffer
      xtermRef.current.clear();
      xtermRef.current.writeln('\x1b[36m═══════════════════════════════════════════\x1b[0m');
      xtermRef.current.writeln(`\x1b[36m   🤖 AI Team Member Terminal (${port})       \x1b[0m`);
      xtermRef.current.writeln('\x1b[36m═══════════════════════════════════════════\x1b[0m');
      xtermRef.current.writeln('\x1b[32m[Session Restored]\x1b[0m');
      xtermRef.current.writeln('');

      terminalOutputBuffer.forEach(msg => {
        if (msg.type === 'output' && msg.data) {
          xtermRef.current?.write(msg.data);
        }
      });
      xtermRef.current.scrollToBottom();
      bufferRestoredRef.current = true;

      // If reconnecting, mark briefing as already sent (Claude is already running)
      briefingSentToClaudeRef.current = true;
      claudeCodeLoadedRef.current = true;
      setBriefingSent(true);
    }
  }, [terminalConnected, terminalOutputBuffer, port]);

  // Run startup sequence when connection is established (fresh connect only)
  const runStartupSequence = useCallback(async () => {
    if (!terminalConnected || startupInitiatedRef.current) return;
    startupInitiatedRef.current = true;

    console.log('[ClaudeTerminal] Running startup sequence');
    setConnecting(false);

    connectToChad();

    if (xtermRef.current) {
      xtermRef.current.writeln('\x1b[32m[Connected]\x1b[0m');
      xtermRef.current.writeln('');
      xtermRef.current.writeln('\x1b[36m☕ Hold please... your AI team member will be right with you.\x1b[0m');
      xtermRef.current.writeln('\x1b[90m   Starting Claude Code...\x1b[0m');

      const context = await fetchSusanContext();
      if (context) {
        xtermRef.current.writeln('\x1b[35m   📚 Loading project context...\x1b[0m');
      }
      xtermRef.current.writeln('');
    }

    // Start Claude Code: type "claude", wait, press Enter, wait for load, then send briefing
    setTimeout(() => {
      if (terminalConnected) {
        // Step 1: Type "claude" (without Enter)
        sendToTerminal('claude');

        // Step 2: After 500ms, press Enter to execute
        setTimeout(() => {
          if (terminalConnected) {
            sendToTerminal('\r');

            // Step 3: Wait for Claude to fully load, then send /startproject
            setTimeout(() => {
              if (!contextSentRef.current && terminalConnected) {
                contextSentRef.current = true;

                console.log('[ClaudeTerminal] Sending /startproject skill command');

                // Send /startproject command with projectId
                sendToTerminal(`/startproject ${projectId || ''}\r`);

                // Send extra Enter after 900ms to ensure command executes
                setTimeout(() => {
                  if (terminalConnected) {
                    sendToTerminal('\r');
                  }
                }, 900);

                // Unlock only after output arrives OR 12s fallback timeout
                unlockFallbackRef.current = setTimeout(() => {
                  if (!briefingSentToClaudeRef.current) {
                    briefingSentToClaudeRef.current = true;
                    setBriefingSent(true);
                    if (xtermRef.current) {
                      xtermRef.current.writeln('\x1b[32m\n✅ Ready - chat box unlocked\x1b[0m');
                    }
                  }
                }, 12000);
              }
            }, BRIEFING_FALLBACK_MS);
          }
        }, 500);
      }
    }, 2000);

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [terminalConnected, projectId, fetchSusanContext, connectToChad, sendToTerminal]);

  const connect = useCallback(async () => {
    if (terminalConnected) return;

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
    startupInitiatedRef.current = false;
    bufferRestoredRef.current = false;

    // Connect via shared WebSocket in DeveloperContext
    connectTerminal();
  }, [terminalConnected, projectId, userId, pcTag, connectTerminal]);

  // Detect when connection is established and run startup
  useEffect(() => {
    if (terminalConnected && connecting && !startupInitiatedRef.current) {
      runStartupSequence();
    }
  }, [terminalConnected, connecting, runStartupSequence]);

  const disconnect = useCallback(() => {
    // Disconnect via shared WebSocket in DeveloperContext
    disconnectTerminal();
    disconnectChad();
    setBriefingSent(false);
    resetSusan();
    briefingSentToClaudeRef.current = false;
    claudeCodeLoadedRef.current = false;
    startupInitiatedRef.current = false;
    bufferRestoredRef.current = false;
    if (unlockFallbackRef.current) {
      clearTimeout(unlockFallbackRef.current);
      unlockFallbackRef.current = null;
    }
    if (xtermRef.current) {
      xtermRef.current.writeln('\x1b[33m[Disconnected]\x1b[0m');
    }
  }, [disconnectTerminal, disconnectChad, resetSusan]);

  useEffect(() => {
    if (connectRef) {
      connectRef.current = connect;
    }
  }, [connectRef, connect]);

  // NOTE: Auto-connect removed - user must click Connect button after completing
  // the connection sequence (select team → pick project → connect)

  const sendInput = useCallback(() => {
    if (terminalConnected) {
      if (inputValue.trim()) {
        // Send in chunks to avoid overwhelming the terminal
        const chunkSize = 500;
        for (let i = 0; i < inputValue.length; i += chunkSize) {
          const chunk = inputValue.slice(i, i + chunkSize);
          sendToTerminal(chunk);
        }
        sendToTerminal('\r');
      } else {
        sendToTerminal('\r');
      }
      setInputValue('');
    }
  }, [terminalConnected, inputValue, sendToTerminal]);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="text-sm font-medium text-white">AI Worker</span>
          <span className="text-xs text-orange-400/60">[:{port}]</span>
          <span className={`px-1.5 py-0.5 text-xs rounded ${
            terminalConnected ? 'bg-green-600/20 text-green-400' :
            connecting ? 'bg-yellow-600/20 text-yellow-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            {terminalConnected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
          </span>
          {terminalConnected && (
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
          {terminalConnected ? (
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
          {!terminalConnected && <span className="text-orange-400/50 text-xs">(connecting...)</span>}
          {terminalConnected && !briefingSent && <span className="text-yellow-400/70 text-xs">(loading Claude & briefing...)</span>}
          {terminalConnected && briefingSent && <span className="text-green-400/70 text-xs">(ready)</span>}
        </div>
        <div className="px-2 py-2 bg-gray-800">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (terminalConnected && briefingSent) sendInput();
              }
            }}
            placeholder={
              !terminalConnected ? "Connecting to Claude..." :
              !briefingSent ? "Please wait - loading Claude and sending briefing..." :
              "Type a message and press Enter... (Shift+Enter for new line)"
            }
            rows={4}
            disabled={!terminalConnected || !briefingSent}
            className="w-full bg-gray-900 border-2 border-orange-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}

export default ClaudeTerminal;
