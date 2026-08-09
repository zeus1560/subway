'use client';

import { Station } from '@/lib/subwayMapData';
import { getLineColor } from '@/lib/utils';

interface SelectedStationCardProps {
  station: Station | null;
}

export default function SelectedStationCard({ station }: SelectedStationCardProps) {
  if (!station) return null;

  const primaryLineColor = getLineColor(station.lines[0] || '1');

  return (
    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: primaryLineColor }}
        >
          {station.lines[0] || '?'}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{station.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {station.lines.map(l => `${l}호선`).join(', ')}
            {station.isTransfer && ' · 환승역'}
          </p>
        </div>
      </div>
    </div>
  );
}

