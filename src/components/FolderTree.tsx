import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TreeNode } from '../lib/types';
import { DraggableTreeItem, DragOverlayItem } from './TreeItem';

interface FolderTreeProps {
  nodes: TreeNode[];
  selectedId: string | null;
  onSelect: (node: TreeNode) => void;
  onRename: (nodeId: string, nodeType: TreeNode['type'], newName: string) => void;
  onDelete: (node: TreeNode) => void;
  onToggleFavorite: (node: TreeNode) => void;
  onMoveToFolder: (node: TreeNode) => void;
  onSetColor: (node: TreeNode) => void;
  onDrop: (draggedId: string, draggedType: TreeNode['type'], targetFolderId: string | null) => void;
  projectId: string;
}

function flattenTree(nodes: TreeNode[], expandedIds: Set<string>): TreeNode[] {
  const flat: TreeNode[] = [];
  const walk = (items: TreeNode[]) => {
    for (const node of items) {
      flat.push(node);
      if (node.type === 'folder' && expandedIds.has(node.id) && node.children) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return flat;
}

function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function getNodeDepth(nodes: TreeNode[], id: string, depth: number = 0): number {
  for (const n of nodes) {
    if (n.id === id) return depth;
    if (n.children) {
      const found = getNodeDepth(n.children, id, depth + 1);
      if (found >= 0) return found;
    }
  }
  return -1;
}

export default function FolderTree({
  nodes,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  onToggleFavorite,
  onMoveToFolder,
  onSetColor,
  onDrop,
  projectId,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`tree-expanded-${projectId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const [activeNode, setActiveNode] = useState<TreeNode | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(`tree-expanded-${projectId}`, JSON.stringify([...expandedIds]));
  }, [expandedIds, projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleRename = useCallback((nodeId: string, newName: string) => {
    const node = findNode(nodes, nodeId);
    if (node) onRename(nodeId, node.type, newName);
  }, [nodes, onRename]);

  const flatNodes = useMemo(() => flattenTree(nodes, expandedIds), [nodes, expandedIds]);
  const flatIds = useMemo(() => flatNodes.map(n => n.id), [flatNodes]);

  const handleDragStart = (event: DragStartEvent) => {
    const node = findNode(nodes, event.active.id as string);
    setActiveNode(node);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    if (!overId) {
      setOverFolderId(null);
      return;
    }
    const overNode = findNode(nodes, overId);
    if (overNode?.type === 'folder' && overId !== activeNode?.id) {
      setOverFolderId(overId);
    } else {
      setOverFolderId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNode(null);
    setOverFolderId(null);

    if (!over || active.id === over.id) return;

    const draggedNode = findNode(nodes, active.id as string);
    const overNode = findNode(nodes, over.id as string);
    if (!draggedNode || !overNode) return;

    if (overNode.type === 'folder') {
      onDrop(draggedNode.id, draggedNode.type, overNode.id);
    } else if (overNode.parent_id) {
      onDrop(draggedNode.id, draggedNode.type, overNode.parent_id);
    } else {
      onDrop(draggedNode.id, draggedNode.type, null);
    }
  };

  const handleDragCancel = () => {
    setActiveNode(null);
    setOverFolderId(null);
  };

  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-codex-text-muted">No documents yet</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
        <div className="py-1">
          {flatNodes.map(node => {
            const depth = getNodeDepth(nodes, node.id);
            return (
              <DraggableTreeItem
                key={node.id}
                node={node}
                depth={depth}
                isSelected={selectedId === node.id}
                isExpanded={expandedIds.has(node.id)}
                isDropTarget={overFolderId === node.id}
                onSelect={onSelect}
                onToggle={handleToggle}
                onRename={handleRename}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                onMoveToFolder={onMoveToFolder}
                onSetColor={onSetColor}
              />
            );
          })}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeNode ? <DragOverlayItem node={activeNode} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
