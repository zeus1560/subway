'use client';

import { useRef } from 'react';
import { LineId } from '@/lib/subwayMapData';
import CleanSubwayMap from '@/components/CleanSubwayMap';

interface LineMapCanvasProps {
  selectedLine: LineId;
}

export default function LineMapCanvas({
  selectedLine,
}: LineMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#020617] pointer-events-auto flex items-center justify-center">
      <CleanSubwayMap
        selectedLine={selectedLine}
      />
    </div>
  );
}

