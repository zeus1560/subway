'use client';

import { ZoomIn, ZoomOut } from 'lucide-react';

interface MapZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function MapZoomControls({ onZoomIn, onZoomOut }: MapZoomControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
      <button
        onClick={onZoomIn}
        className="w-10 h-10 rounded-full bg-[#020617]/80 backdrop-blur-sm text-white flex items-center justify-center shadow-lg hover:bg-[#020617] transition-colors active:scale-95"
        aria-label="확대"
      >
        <ZoomIn className="w-5 h-5" />
      </button>
      <button
        onClick={onZoomOut}
        className="w-10 h-10 rounded-full bg-[#020617]/80 backdrop-blur-sm text-white flex items-center justify-center shadow-lg hover:bg-[#020617] transition-colors active:scale-95"
        aria-label="축소"
      >
        <ZoomOut className="w-5 h-5" />
      </button>
    </div>
  );
}

