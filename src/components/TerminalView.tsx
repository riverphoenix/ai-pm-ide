import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { terminalAPI } from '../lib/ipc';
import { CommandHistoryEntry } from '../lib/types';

interface TerminalViewProps {
  projectId: string | null;
  onError?: (error: string) => void;
}

function shortenPath(path: string): string {
  const home = path.match(/^\/Users\/[^/]+/)?.[0] || '';
  if (home && path.startsWith(home)) {
    return '~' + path.slice(home.length);
  }
  return path;
}

export default function TerminalView({ projectId, onError }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cwdRef = useRef('~');
  const usernameRef = useRef('user');
  const hostnameRef = useRef('pm-ide');
  const inputBufferRef = useRef('');
  const isRunningRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const [ready, setReady] = useState(false);

  const getDirName = useCallback((path: string): string => {
    if (path === '~') return '~';
    const parts = path.split('/');
    return parts[parts.length - 1] || '~';
  }, []);

  const writePrompt = useCallback(() => {
    const term = xtermRef.current;
    if (!term) return;
    const dir = getDirName(cwdRef.current);
    term.write(`\r\n\x1b[1;32m${usernameRef.current}@${hostnameRef.current}\x1b[0m \x1b[1;34m${dir}\x1b[0m \x1b[0m% `);
  }, [getDirName]);

  useEffect(() => {
    if (!terminalRef.current || !projectId) return;

    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#aeafad',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        selectionForeground: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    setTimeout(() => {
      fitAddon.fit();
    }, 50);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Get system info and initialize
    const initTerminal = async () => {
      try {
        const info = await terminalAPI.execute(projectId, 'echo "$USER@$(hostname -s)"');
        if (info.output) {
          const parts = info.output.trim().split('@');
          if (parts.length === 2) {
            usernameRef.current = parts[0];
            hostnameRef.current = parts[1];
          }
        }
      } catch {}

      try {
        const dir = await terminalAPI.getCwd(projectId);
        cwdRef.current = shortenPath(dir);
      } catch {}

      writePrompt();
      setReady(true);
    };

    initTerminal();

    // Load history
    terminalAPI.getHistory(projectId, 50).then((history: CommandHistoryEntry[]) => {
      historyRef.current = history.map(h => h.command);
    }).catch(() => {});

    // Handle resize
    const handleResize = () => {
      setTimeout(() => fitAddon.fit(), 50);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => fitAddon.fit(), 50);
    });
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    // Handle key input
    term.onKey(({ key, domEvent }) => {
      if (isRunningRef.current) return;

      const ev = domEvent;

      if (ev.key === 'Enter') {
        const cmd = inputBufferRef.current.trim();
        if (!cmd) {
          writePrompt();
          return;
        }
        executeCmd(cmd);
      } else if (ev.key === 'Backspace') {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (ev.key === 'Tab') {
        ev.preventDefault();
        handleTab();
      } else if (ev.key === 'ArrowUp') {
        navigateHistory(1);
      } else if (ev.key === 'ArrowDown') {
        navigateHistory(-1);
      } else if (ev.ctrlKey && ev.key === 'l') {
        term.clear();
        inputBufferRef.current = '';
        writePrompt();
      } else if (ev.ctrlKey && ev.key === 'c') {
        if (inputBufferRef.current) {
          term.write('^C');
          inputBufferRef.current = '';
          writePrompt();
        }
      } else if (ev.ctrlKey && ev.key === 'u') {
        clearCurrentLine();
      } else if (key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        inputBufferRef.current += key;
        term.write(key);
      }
    });

    // Handle paste
    term.onData((data) => {
      if (isRunningRef.current) return;
      // Only handle paste (multi-char input not from onKey)
      if (data.length > 1 && !data.startsWith('\x1b')) {
        inputBufferRef.current += data;
        term.write(data);
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [projectId]);

  // Re-fit when parent resizes
  useEffect(() => {
    if (fitAddonRef.current && ready) {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    }
  }, [ready]);

  const clearCurrentLine = useCallback(() => {
    const term = xtermRef.current;
    if (!term) return;
    const len = inputBufferRef.current.length;
    if (len > 0) {
      term.write('\b \b'.repeat(len));
      inputBufferRef.current = '';
    }
  }, []);

  const navigateHistory = useCallback((direction: number) => {
    const term = xtermRef.current;
    if (!term || historyRef.current.length === 0) return;

    const currentLen = inputBufferRef.current.length;
    if (currentLen > 0) {
      term.write('\b \b'.repeat(currentLen));
    }

    if (direction > 0) {
      // Up
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current++;
      }
    } else {
      // Down
      if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
      } else {
        historyIndexRef.current = -1;
        inputBufferRef.current = '';
        return;
      }
    }

    const cmd = historyRef.current[historyRef.current.length - 1 - historyIndexRef.current] || '';
    inputBufferRef.current = cmd;
    term.write(cmd);
  }, []);

  const handleTab = useCallback(async () => {
    if (!projectId) return;
    const tokens = inputBufferRef.current.split(/\s+/);
    const lastToken = tokens[tokens.length - 1] || '';

    try {
      const completions = await terminalAPI.completePath(projectId, lastToken);
      if (completions.length === 0) return;

      const term = xtermRef.current;
      if (!term) return;

      if (completions.length === 1) {
        const suffix = completions[0].slice(lastToken.length);
        inputBufferRef.current += suffix;
        term.write(suffix);
      } else {
        const commonPrefix = completions.reduce((acc, s) => {
          let i = 0;
          while (i < acc.length && i < s.length && acc[i] === s[i]) i++;
          return acc.slice(0, i);
        });
        const suffix = commonPrefix.slice(lastToken.length);
        if (suffix) {
          inputBufferRef.current += suffix;
          term.write(suffix);
        }

        term.writeln('');

        const termCols = term.cols || 80;
        const maxLen = Math.max(...completions.map(c => c.length));
        const colWidth = maxLen + 2;
        const numCols = Math.max(1, Math.floor(termCols / colWidth));
        const numRows = Math.ceil(completions.length / numCols);

        for (let row = 0; row < numRows; row++) {
          let line = '';
          for (let col = 0; col < numCols; col++) {
            const idx = col * numRows + row;
            if (idx < completions.length) {
              const name = completions[idx];
              const isDir = name.endsWith('/');
              const colored = isDir ? `\x1b[34;1m${name}\x1b[0m` : `\x1b[36m${name}\x1b[0m`;
              const padding = ' '.repeat(Math.max(1, colWidth - name.length));
              line += colored + padding;
            }
          }
          term.writeln(line);
        }

        const dir = getDirName(cwdRef.current);
        term.write(`\x1b[1;32m${usernameRef.current}@${hostnameRef.current}\x1b[0m \x1b[1;34m${dir}\x1b[0m \x1b[0m% ${inputBufferRef.current}`);
      }
    } catch {
      // ignore
    }
  }, [projectId]);

  const executeCmd = useCallback(async (cmd: string) => {
    if (!projectId) return;
    const term = xtermRef.current;
    if (!term) return;

    if (cmd === 'clear') {
      term.clear();
      inputBufferRef.current = '';
      writePrompt();
      return;
    }

    isRunningRef.current = true;
    inputBufferRef.current = '';
    historyIndexRef.current = -1;
    historyRef.current = [...historyRef.current, cmd];

    term.writeln('');

    try {
      const result = await terminalAPI.execute(projectId, cmd);
      cwdRef.current = shortenPath(result.cwd);

      if (result.output) {
        // Write output line by line
        const lines = result.output.split('\n');
        for (const line of lines) {
          if (result.exit_code !== 0) {
            term.writeln(`\x1b[31m${line}\x1b[0m`);
          } else {
            term.writeln(line);
          }
        }
      }

      if (result.exit_code !== 0 && result.exit_code !== 130) {
        term.writeln(`\x1b[90mexit ${result.exit_code}\x1b[0m`);
      }

      if (result.exit_code !== 0 && onError) {
        onError(`[${new Date().toLocaleTimeString()}] Command failed (exit ${result.exit_code}): ${cmd}\n${result.output.slice(0, 500)}`);
      }
    } catch (err) {
      term.writeln(`\x1b[31mError: ${err}\x1b[0m`);
      if (onError) {
        onError(`[${new Date().toLocaleTimeString()}] Error: ${err}`);
      }
    } finally {
      isRunningRef.current = false;
      writePrompt();
    }
  }, [projectId, onError, writePrompt]);

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#1e1e1e' }}>
        <span className="text-xs" style={{ color: '#484f58' }}>Select a project to use the terminal</span>
      </div>
    );
  }

  return (
    <div
      ref={terminalRef}
      className="h-full w-full"
      style={{ backgroundColor: '#1e1e1e', padding: '4px' }}
    />
  );
}
