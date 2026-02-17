interface TopActionBarProps {
  onOpenFile?: () => void;
  onCommit?: () => void;
  onToggleTerminal?: () => void;
  onToggleIDE?: () => void;
  projectName?: string;
  currentModel?: string;
  terminalActive?: boolean;
}

export default function TopActionBar({
  onOpenFile,
  onCommit,
  onToggleTerminal,
  onToggleIDE,
  projectName,
  currentModel = 'GPT-5',
  terminalActive = false,
}: TopActionBarProps) {
  return (
    <div className="h-10 bg-codex-sidebar border-b border-codex-border flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Project Context */}
      <div className="flex items-center gap-2">
        {projectName && (
          <span className="text-codex-text-primary text-sm font-normal">{projectName}</span>
        )}
      </div>

      {/* Center: Action Buttons (Icons only) */}
      <div className="flex items-center gap-1">
        {/* Open File */}
        <button
          onClick={onOpenFile}
          className="p-1.5 text-codex-text-secondary hover:text-codex-text-primary hover:bg-codex-surface rounded transition-colors duration-200"
          title="Open"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>

        {/* Commit (Git) */}
        <button
          onClick={onCommit}
          className="p-1.5 text-codex-text-dimmed hover:text-codex-text-secondary hover:bg-codex-surface rounded transition-colors duration-200"
          title="Commit"
          disabled
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>

        {/* Terminal Toggle */}
        <button
          onClick={onToggleTerminal}
          className={`p-1.5 rounded transition-colors duration-200 ${
            terminalActive
              ? 'text-codex-accent bg-codex-surface'
              : 'text-codex-text-secondary hover:text-codex-text-primary hover:bg-codex-surface'
          }`}
          title={`Terminal (\u2318\`)`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* IDE Mode Toggle */}
        <button
          onClick={onToggleIDE}
          className="p-1.5 text-codex-text-dimmed hover:text-codex-text-secondary hover:bg-codex-surface rounded transition-colors duration-200"
          title="IDE Mode"
          disabled
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </button>
      </div>

      {/* Right: Status Indicators */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          <span className="text-xs text-codex-text-dimmed">
            {currentModel === 'gpt-5' ? 'GPT-5' :
             currentModel === 'gpt-5-mini' ? 'GPT-5-mini' :
             currentModel === 'gpt-5-nano' ? 'GPT-5-nano' : currentModel}
          </span>
        </div>
      </div>
    </div>
  );
}
