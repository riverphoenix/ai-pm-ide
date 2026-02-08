import { useEffect, useRef } from 'react';

interface ResizableDividerProps {
  onResize: (deltaX: number) => void;
  orientation?: 'vertical' | 'horizontal';
}

export default function ResizableDivider({
  onResize,
  orientation = 'vertical',
}: ResizableDividerProps) {
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`group relative bg-slate-700/0 hover:bg-indigo-500/20 transition-colors ${
        orientation === 'vertical'
          ? 'w-1 cursor-col-resize'
          : 'h-1 cursor-row-resize'
      }`}
    >
      {/* Visual indicator on hover */}
      <div
        className={`absolute bg-indigo-500/0 group-hover:bg-indigo-500 transition-colors ${
          orientation === 'vertical'
            ? 'left-0 top-0 bottom-0 w-0.5 group-hover:w-1'
            : 'top-0 left-0 right-0 h-0.5 group-hover:h-1'
        }`}
      />
    </div>
  );
}
