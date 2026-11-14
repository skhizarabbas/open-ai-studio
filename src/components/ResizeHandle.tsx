import React, { useEffect, useState } from 'react';

interface ResizeHandleProps {
  direction: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  direction,
  onResize,
  onDragStateChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    let lastPos = 0;
    let initialized = false;

    const handlePointerMove = (e: PointerEvent) => {
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY;
      if (!initialized) {
        lastPos = currentPos;
        initialized = true;
        return;
      }
      const delta = currentPos - lastPos;
      lastPos = currentPos;
      if (delta !== 0) {
        onResize(delta);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      onDragStateChange?.(false);
    };

    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [direction, isDragging, onDragStateChange, onResize]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    onDragStateChange?.(true);
  };

  if (direction === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={handlePointerDown}
        title="Drag to resize panel"
        className={`w-1.5 shrink-0 cursor-col-resize relative group flex items-center justify-center transition-colors ${
          isDragging ? 'bg-indigo-500' : 'bg-zinc-800/80 hover:bg-indigo-500/70'
        }`}
      >
        <div className="w-0.5 h-8 rounded-full bg-zinc-600 group-hover:bg-white transition-colors" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      onPointerDown={handlePointerDown}
      title="Drag to resize terminal"
      className={`h-1.5 shrink-0 cursor-row-resize relative group flex items-center justify-center transition-colors ${
        isDragging ? 'bg-indigo-500' : 'bg-zinc-800/80 hover:bg-indigo-500/70'
      }`}
    >
      <div className="h-0.5 w-8 rounded-full bg-zinc-600 group-hover:bg-white transition-colors" />
    </div>
  );
};