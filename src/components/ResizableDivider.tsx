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
      className="group"
      style={{
        // Flexbox sizing
        flex: '0 0 auto',
        alignSelf: 'stretch',

        // Dimensions
        width: orientation === 'vertical' ? '8px' : 'auto',
        height: orientation === 'horizontal' ? '8px' : 'auto',

        // Visual
        backgroundColor: 'transparent',
        cursor: orientation === 'vertical' ? 'col-resize' : 'row-resize',
        position: 'relative'
      }}
    >
      {/* Subtle visual indicator - shows on hover */}
      <div
        className="absolute inset-0 bg-slate-700/0 group-hover:bg-indigo-500/30 transition-colors"
      />
    </div>
  );
}
