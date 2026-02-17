import { useState, useRef, useEffect, useCallback } from 'react';
import { terminalAPI } from '../lib/ipc';
import { CommandHistoryEntry } from '../lib/types';

interface TerminalEntry {
  command: string;
  output: string;
  exitCode: number;
  timestamp: number;
}

interface TerminalViewProps {
  projectId: string | null;
}

export default function TerminalView({ projectId }: TerminalViewProps) {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId) return;
    terminalAPI.getHistory(projectId, 20).then((history: CommandHistoryEntry[]) => {
      const loaded = history.map(h => ({
        command: h.command,
        output: h.output,
        exitCode: h.exit_code,
        timestamp: h.created_at,
      }));
      setEntries(loaded);
      setCommandHistory(history.map(h => h.command));
    }).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [entries, isRunning]);

  const executeCommand = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd || !projectId || isRunning) return;

    setInput('');
    setIsRunning(true);
    setHistoryIndex(-1);
    setCommandHistory(prev => [...prev, cmd]);

    try {
      const result = await terminalAPI.execute(projectId, cmd);
      setEntries(prev => [...prev, {
        command: cmd,
        output: result.output,
        exitCode: result.exit_code,
        timestamp: Date.now() / 1000,
      }]);
    } catch (err) {
      setEntries(prev => [...prev, {
        command: cmd,
        output: `Error: ${err}`,
        exitCode: -1,
        timestamp: Date.now() / 1000,
      }]);
    } finally {
      setIsRunning(false);
      inputRef.current?.focus();
    }
  }, [input, projectId, isRunning]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setEntries([]);
    }
  };

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-codex-text-muted">Select a project to use the terminal</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full font-mono text-xs" onClick={() => inputRef.current?.focus()}>
      <div ref={outputRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {entries.map((entry, i) => (
          <div key={i}>
            <div className="flex items-center gap-1.5 text-codex-text-secondary">
              <span className="text-codex-accent">$</span>
              <span>{entry.command}</span>
            </div>
            {entry.output && (
              <pre className={`whitespace-pre-wrap mt-0.5 pl-4 ${
                entry.exitCode !== 0 ? 'text-red-400' : 'text-codex-text-muted'
              }`}>{entry.output}</pre>
            )}
            {entry.exitCode !== 0 && (
              <div className="text-red-400/60 text-[10px] pl-4 mt-0.5">
                exit code: {entry.exitCode}
              </div>
            )}
          </div>
        ))}
        {isRunning && (
          <div className="flex items-center gap-1.5 text-codex-text-muted animate-pulse">
            <span className="text-codex-accent">$</span>
            <span>Running...</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-codex-border bg-codex-bg/50">
        <span className="text-codex-accent flex-shrink-0">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? 'Running...' : 'Type a command...'}
          disabled={isRunning}
          className="flex-1 bg-transparent text-codex-text-primary placeholder-codex-text-dimmed outline-none"
          autoFocus
        />
      </div>
    </div>
  );
}
