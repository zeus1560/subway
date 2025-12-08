'use client';

import { Station } from '@/lib/subwayMapData';
import { getLineColor } from '@/lib/utils';

interface StationListItemProps {
  station: Station;
  isSelected: boolean;
  onClick: () => void;
}

function StationListItem({ station, isSelected, onClick }: StationListItemProps) {
  const lineColor = getLineColor(station.lines[0] || '1');

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left
        ${isSelected 
          ? 'bg-white/10 text-white' 
          : 'text-gray-300 hover:bg-white/5 hover:text-white'
        }
      `}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: lineColor }}
      />
      <span className={`text-sm ${isSelected ? 'font-semibold' : 'font-normal'}`}>
        {station.name}
      </span>
    </button>
  );
}

interface StationListProps {
  stations: Station[];
  selectedStationId: string | null;
  onStationSelect: (station: Station) => void;
}

export default function StationList({ stations, selectedStationId, onStationSelect }: StationListProps) {
  return (
    <div className="space-y-1">
      {stations.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          역이 없습니다
        </div>
      ) : (
        stations.map((station) => (
          <StationListItem
            key={station.id}
            station={station}
            isSelected={station.id === selectedStationId}
            onClick={() => onStationSelect(station)}
          />
        ))
      )}
    </div>
  );
}

