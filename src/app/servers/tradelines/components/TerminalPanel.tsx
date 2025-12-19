'use client';

import { useState, useRef, useEffect } from 'react';

interface TerminalPanelProps {
  tradeline: string;
  port: number;
}

interface CommandHistory {
  command: string;
  output: string;
  timestamp: Date;
  isError?: boolean;
}

export default function TerminalPanel({ tradeline, port }: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [commandIndex, setCommandIndex] = useState(-1);
  const [previousCommands, setPreviousCommands] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Welcome message
  useEffect(() => {
    setHistory([{
      command: '',
      output: `Connected to ${tradeline} (port ${port})
Type 'help' for available commands.
─────────────────────────────────────`,
      timestamp: new Date(),
    }]);
  }, [tradeline, port]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input on click
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const addOutput = (command: string, output: string, isError = false) => {
    setHistory(prev => [...prev, {
      command,
      output,
      timestamp: new Date(),
      isError,
    }]);
  };

  const executeCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    const originalCmd = cmd.trim();

    if (!trimmedCmd) return;

    // Add to command history
    setPreviousCommands(prev => [...prev.filter(c => c !== trimmedCmd), trimmedCmd].slice(-50));
    setCommandIndex(-1);

    // Built-in commands that don't need API calls
    if (trimmedCmd === 'help') {
      addOutput(originalCmd, `Available commands:
  status     - Get server status from API
  logs       - Fetch recent logs
  restart    - Restart server (requires --confirm)
  stop       - Stop server (requires --confirm)
  start      - Start server
  clear      - Clear terminal
  health     - Check server health

Raw SSH commands (executed on engine server):
  pm2 list              - List all PM2 processes
  pm2 show <name>       - Show process details
  pm2 restart <name>    - Restart specific process
  pm2 logs <name>       - Stream process logs
  tail -n 50 <file>     - Read last 50 lines of file
  ls, pwd, uptime       - System commands`);
      return;
    }

    if (trimmedCmd === 'clear') {
      setHistory([]);
      return;
    }

    // API commands
    setIsExecuting(true);

    try {
      if (trimmedCmd === 'status') {
        const res = await fetch(`/api/tradelines/status/${tradeline}`);
        const data = await res.json();
        if (data.success !== false) {
          const procs = data.processes?.map((p: any) =>
            `  ${p.name}: ${p.status} (CPU: ${p.cpu?.toFixed(1)}%, Mem: ${Math.round((p.memory || 0) / 1024 / 1024)}MB)`
          ).join('\n') || '';
          addOutput(originalCmd, `Server Status: ${tradeline}
────────────────────────
Status: ${data.status || 'unknown'}
Port: ${port}
${procs ? `Processes:\n${procs}` : ''}`);
        } else {
          addOutput(originalCmd, data.error || 'Failed to get status', true);
        }
      }
      else if (trimmedCmd === 'logs') {
        const res = await fetch(`/api/tradelines/logs/${tradeline}?lines=20`);
        const data = await res.json();
        if (data.success && data.logs) {
          addOutput(originalCmd, `Recent Logs:\n────────────────────────\n${data.logs}`);
        } else {
          addOutput(originalCmd, data.error || 'Failed to fetch logs', true);
        }
      }
      else if (trimmedCmd === 'health') {
        const res = await fetch(`/api/servers/health?projectId=tradelines&slotId=${tradeline}`);
        const data = await res.json();
        addOutput(originalCmd, `Health Check:\n────────────────────────\n${JSON.stringify(data, null, 2)}`);
      }
      else if (trimmedCmd === 'restart --confirm') {
        const res = await fetch(`/api/tradelines/restart/${tradeline}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          addOutput(originalCmd, `✓ Restart command sent to ${tradeline}`);
        } else {
          addOutput(originalCmd, data.error || 'Restart failed', true);
        }
      }
      else if (trimmedCmd === 'restart') {
        addOutput(originalCmd, `⚠️  This will restart ${tradeline}.
Type 'restart --confirm' to proceed.`);
      }
      else if (trimmedCmd === 'stop --confirm') {
        const res = await fetch(`/api/tradelines/stop/${tradeline}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          addOutput(originalCmd, `✓ Stop command sent to ${tradeline}`);
        } else {
          addOutput(originalCmd, data.error || 'Stop failed', true);
        }
      }
      else if (trimmedCmd === 'stop') {
        addOutput(originalCmd, `⚠️  This will stop ${tradeline}.
Type 'stop --confirm' to proceed.`);
      }
      else if (trimmedCmd === 'start') {
        const res = await fetch(`/api/tradelines/start/${tradeline}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          addOutput(originalCmd, `✓ Start command sent to ${tradeline}`);
        } else {
          addOutput(originalCmd, data.error || 'Start failed', true);
        }
      }
      else {
        // Try to execute as raw SSH command on the engine server
        const execRes = await fetch(`/api/tradelines/exec/${tradeline}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: originalCmd })
        });
        const execData = await execRes.json();

        if (execData.success) {
          const output = execData.stdout || execData.stderr || 'Command executed (no output)';
          addOutput(originalCmd, output, !!execData.stderr && !execData.stdout);
        } else {
          addOutput(originalCmd, execData.error || 'Command failed', true);
        }
      }
    } catch (e) {
      addOutput(originalCmd, `Error: ${(e as Error).message}`, true);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (previousCommands.length > 0) {
        const newIndex = commandIndex < previousCommands.length - 1 ? commandIndex + 1 : commandIndex;
        setCommandIndex(newIndex);
        setInput(previousCommands[previousCommands.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandIndex > 0) {
        const newIndex = commandIndex - 1;
        setCommandIndex(newIndex);
        setInput(previousCommands[previousCommands.length - 1 - newIndex] || '');
      } else {
        setCommandIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const commands = [
        'status', 'logs', 'health', 'restart', 'stop', 'start', 'clear', 'help',
        'pm2 list', 'pm2 status', 'pm2 show', 'pm2 restart', 'pm2 logs', 'pm2 stop',
        'tail', 'ls', 'pwd', 'uptime', 'df -h', 'free -h'
      ];
      const matches = commands.filter(c => c.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      } else if (matches.length > 1 && matches.length <= 5) {
        // Show possible completions
        addOutput(input, `Completions: ${matches.join(', ')}`);
      }
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-gray-900 font-mono text-sm cursor-text"
      onClick={handleContainerClick}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 ml-2">{tradeline}@nextbid:~</span>
        </div>
        <span className="text-xs text-gray-600">port {port}</span>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {history.map((entry, i) => (
          <div key={i}>
            {entry.command && (
              <div className="flex items-center gap-2">
                <span className="text-green-400">$</span>
                <span className="text-white">{entry.command}</span>
              </div>
            )}
            <pre className={`whitespace-pre-wrap text-xs leading-relaxed ${entry.isError ? 'text-red-400' : 'text-gray-400'}`}>
              {entry.output}
            </pre>
          </div>
        ))}

        {/* Input Line */}
        <div className="flex items-center gap-2">
          <span className="text-green-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white outline-none"
            placeholder=""
            autoFocus
            disabled={isExecuting}
          />
          {isExecuting ? (
            <span className="text-yellow-400 animate-pulse">...</span>
          ) : (
            <span className="text-gray-600 animate-pulse">|</span>
          )}
        </div>
      </div>
    </div>
  );
}
