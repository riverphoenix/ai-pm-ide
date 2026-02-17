import { useMemo } from 'react';

interface DiffViewerProps {
  diff: string;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
}

export default function DiffViewer({ diff }: DiffViewerProps) {
  const lines = useMemo<DiffLine[]>(() => {
    if (!diff) return [];
    return diff.split('\n').map(line => {
      if (line.startsWith('+')) return { type: 'add', content: line.slice(1) };
      if (line.startsWith('-')) return { type: 'remove', content: line.slice(1) };
      if (line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index')) return { type: 'header', content: line };
      return { type: 'context', content: line.startsWith(' ') ? line.slice(1) : line };
    });
  }, [diff]);

  if (!diff || lines.length === 0) {
    return <p className="text-xs text-codex-text-muted">No changes in this commit.</p>;
  }

  return (
    <div className="font-mono text-[11px] leading-relaxed">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`px-2 py-0.5 whitespace-pre-wrap break-all ${
            line.type === 'add'
              ? 'bg-green-500/10 text-green-400'
              : line.type === 'remove'
              ? 'bg-red-500/10 text-red-400'
              : line.type === 'header'
              ? 'text-codex-text-muted bg-codex-surface/40 mt-1 mb-0.5'
              : 'text-codex-text-secondary'
          }`}
        >
          <span className="select-none opacity-50 mr-2">
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
          </span>
          {line.content}
        </div>
      ))}
    </div>
  );
}
