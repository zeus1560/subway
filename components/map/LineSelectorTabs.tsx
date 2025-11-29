'use client';

import React, { useRef } from 'react';
import { LineId } from '@/lib/subwayMapData';
import { getLineColor, cn } from '@/lib/utils';

const LINE_TABS = [
  { id: '1', label: '1호선' },
  { id: '2', label: '2호선' },
  { id: '3', label: '3호선' },
  { id: '4', label: '4호선' },
  { id: '5', label: '5호선' },
  { id: '6', label: '6호선' },
  { id: '7', label: '7호선' },
  { id: '8', label: '8호선' },
  { id: '9', label: '9호선' },
];

interface LineSelectorTabsProps {
  selectedLine: LineId;
  onLineChange: (line: LineId) => void;
}

export default function LineSelectorTabs({ selectedLine, onLineChange }: LineSelectorTabsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    isDragging.current = true;
    startX.current = e.clientX;
    startScrollLeft.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    const dx = e.clientX - startX.current;
    containerRef.current.scrollLeft = startScrollLeft.current - dx;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="mt-2 w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
    >
      <div className="inline-flex gap-2 py-1">
        {LINE_TABS.map((line) => {
          const isSelected = line.id === selectedLine;
          const lineColor = getLineColor(line.id);
          
          return (
            <button
              key={line.id}
              type="button"
              onClick={() => onLineChange(line.id as LineId)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full border border-white/20 text-sm whitespace-nowrap font-medium transition-all',
                isSelected
                  ? 'bg-brand-primary text-white border-transparent shadow-md'
                  : 'bg-transparent text-gray-300 hover:bg-white/20 hover:text-white'
              )}
              style={isSelected ? { backgroundColor: lineColor } : {}}
            >
              {line.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

