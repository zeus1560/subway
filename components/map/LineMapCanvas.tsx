'use client';

import { useRef } from 'react';
import { Station, LineId } from '@/lib/subwayMapData';
import EnhancedSubwayMap from '@/components/EnhancedSubwayMap';

interface LineMapCanvasProps {
  selectedLine: LineId;
  selectedStation: Station | null;
  onStationSelect: (station: Station) => void;
  onLineChange: (line: LineId) => void;
}

export default function LineMapCanvas({
  selectedLine,
  selectedStation,
  onStationSelect,
  onLineChange,
}: LineMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#020617] pointer-events-auto flex items-center justify-center">
      <EnhancedSubwayMap
        selectedLine={selectedLine}
        onStationSelect={onStationSelect}
        onLineChange={(line: string) => onLineChange(line as LineId)}
      />
    </div>
  );
}

