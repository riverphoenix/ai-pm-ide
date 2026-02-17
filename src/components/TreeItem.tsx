import { useState, forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TreeNode } from '../lib/types';

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  isDragOverlay?: boolean;
  isDropTarget?: boolean;
  onSelect: (node: TreeNode) => void;
  onToggle: (nodeId: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (node: TreeNode) => void;
  onToggleFavorite: (node: TreeNode) => void;
  onMoveToFolder: (node: TreeNode) => void;
  onSetColor?: (node: TreeNode) => void;
}

const TYPE_ICONS: Record<string, string> = {
  folder: '📁',
  folder_open: '📂',
  pdf: '📄',
  url: '🔗',
  google_doc: '📝',
  text: '📝',
  framework_output: '⚡',
};

export const FOLDER_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

function TreeItemContent({
  node,
  depth,
  isSelected,
  isExpanded,
  isDragOverlay,
  isDropTarget,
  onSelect,
  onToggle,
  onRename,
  onDelete,
  onToggleFavorite,
  onMoveToFolder,
  onSetColor,
  style,
  dragAttributes,
  dragListeners,
  setNodeRef,
}: TreeItemProps & {
  style?: React.CSSProperties;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
  setNodeRef?: (node: HTMLElement | null) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [showActions, setShowActions] = useState(false);

  const isFolder = node.type === 'folder';
  const childCount = node.children?.length || 0;

  const getIcon = () => {
    if (isFolder) return isExpanded ? TYPE_ICONS.folder_open : TYPE_ICONS.folder;
    if (node.type === 'framework_output') return TYPE_ICONS.framework_output;
    return TYPE_ICONS[node.doc_type || 'text'] || TYPE_ICONS.text;
  };

  const handleClick = () => {
    if (isFolder) {
      onToggle(node.id);
    }
    onSelect(node);
  };

  const handleDoubleClick = () => {
    setIsRenaming(true);
    setRenameValue(node.name);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      onRename(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setRenameValue(node.name);
      setIsRenaming(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded transition-colors ${
        isDragOverlay
          ? 'bg-codex-surface border border-codex-accent shadow-lg opacity-90'
          : isDropTarget
            ? 'bg-codex-accent/20 border border-codex-accent/40 border-dashed'
            : isSelected
              ? 'bg-codex-accent/15 text-codex-text-primary'
              : 'text-codex-text-secondary hover:bg-codex-surface-hover hover:text-codex-text-primary'
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px`, ...style }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      {...dragAttributes}
      {...dragListeners}
    >
      {isFolder && (
        <span className="text-[10px] text-codex-text-muted w-3 flex-shrink-0">
          {isExpanded ? '▾' : '▸'}
        </span>
      )}

      {!isFolder && <span className="w-3 flex-shrink-0" />}

      {isFolder && node.color && FOLDER_COLORS[node.color] && (
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${FOLDER_COLORS[node.color]}`} />
      )}

      <span className="text-sm flex-shrink-0">{getIcon()}</span>

      {isRenaming ? (
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          autoFocus
          className="flex-1 bg-codex-surface border border-codex-accent rounded px-1 py-0.5 text-xs text-codex-text-primary outline-none min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-xs truncate flex-1 min-w-0">{node.name}</span>
      )}

      {node.is_favorite && (
        <span className="text-[10px] text-yellow-400 flex-shrink-0">★</span>
      )}

      {isFolder && childCount > 0 && !isRenaming && (
        <span className="text-[10px] text-codex-text-muted flex-shrink-0">{childCount}</span>
      )}

      {showActions && !isRenaming && !isDragOverlay && (
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(node); }}
            className="p-0.5 text-[10px] text-codex-text-muted hover:text-yellow-400 transition-colors"
            title={node.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {node.is_favorite ? '★' : '☆'}
          </button>
          {isFolder && onSetColor && (
            <button
              onClick={(e) => { e.stopPropagation(); onSetColor(node); }}
              className="p-0.5 text-[10px] text-codex-text-muted hover:text-codex-text-primary transition-colors"
              title="Set color"
            >
              ●
            </button>
          )}
          {!isFolder && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveToFolder(node); }}
              className="p-0.5 text-[10px] text-codex-text-muted hover:text-codex-text-primary transition-colors"
              title="Move to folder"
            >
              ↗
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="p-0.5 text-[10px] text-codex-text-muted hover:text-red-400 transition-colors"
            title="Delete"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export function DraggableTreeItem(props: TreeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.node.id,
    data: { node: props.node },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <TreeItemContent
      {...props}
      style={style}
      setNodeRef={setNodeRef}
      dragAttributes={attributes as unknown as Record<string, unknown>}
      dragListeners={listeners as unknown as Record<string, unknown>}
    />
  );
}

export const DragOverlayItem = forwardRef<HTMLDivElement, { node: TreeNode }>(
  ({ node }, _ref) => (
    <TreeItemContent
      node={node}
      depth={0}
      isSelected={false}
      isExpanded={false}
      isDragOverlay={true}
      onSelect={() => {}}
      onToggle={() => {}}
      onRename={() => {}}
      onDelete={() => {}}
      onToggleFavorite={() => {}}
      onMoveToFolder={() => {}}
    />
  )
);

export default function TreeItem(props: TreeItemProps) {
  return <TreeItemContent {...props} />;
}
