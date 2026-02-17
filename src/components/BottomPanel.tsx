import { useState } from 'react';
import TerminalView from './TerminalView';

interface BottomPanelProps {
  height: number;
  projectId: string | null;
  onClose: () => void;
}

type PanelTab = 'terminal' | 'output';

export default function BottomPanel({ height, projectId, onClose }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('terminal');

  return (
    <div
      style={{ height, flexShrink: 0 }}
      className="bg-codex-sidebar border-t border-codex-border flex flex-col"
    >
      <div className="h-8 flex items-center px-3 border-b border-codex-border gap-1 flex-shrink-0">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeTab === 'terminal'
              ? 'text-codex-text-primary bg-codex-surface'
              : 'text-codex-text-muted hover:text-codex-text-secondary'
          }`}
        >
          Terminal
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeTab === 'output'
              ? 'text-codex-text-primary bg-codex-surface'
              : 'text-codex-text-muted hover:text-codex-text-secondary'
          }`}
        >
          Output
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-0.5 text-codex-text-muted hover:text-codex-text-primary transition-colors"
          title="Close panel (\u2318`)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' ? (
          <TerminalView projectId={projectId} />
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <span className="text-xs text-codex-text-muted">No output to display</span>
          </div>
        )}
      </div>
    </div>
  );
}
