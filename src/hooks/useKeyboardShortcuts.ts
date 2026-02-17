import { useEffect, useCallback } from 'react';
import { SHORTCUTS, matchesShortcut } from '../lib/shortcuts';

export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    for (const shortcut of SHORTCUTS) {
      if (matchesShortcut(e, shortcut) && handlers[shortcut.id]) {
        e.preventDefault();
        e.stopPropagation();
        handlers[shortcut.id]();
        return;
      }
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);
}
