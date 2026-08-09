'use client';

import { useState, useMemo } from 'react';
import { Station, LineId, getStationsByLine } from '@/lib/subwayMapData';
import LineMapSidebar from './LineMapSidebar';
import LineMapCanvas from './LineMapCanvas';
import MapZoomControls from './MapZoomControls';

interface LineMapLayoutProps {
  initialLine?: LineId;
  initialStation?: Station | null;
}

export default function LineMapLayout({ initialLine = '1', initialStation = null }: LineMapLayoutProps) {
  const [selectedLine, setSelectedLine] = useState<LineId>(initialLine);
  const [selectedStation, setSelectedStation] = useState<Station | null>(initialStation);
  const [searchQuery, setSearchQuery] = useState('');

  // 현재 선택된 노선의 역 목록
  const stations = useMemo(() => {
    return getStationsByLine(selectedLine);
  }, [selectedLine]);

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
  };

  const handleLineChange = (line: LineId) => {
    setSelectedLine(line);
  };

  const handleZoomIn = () => {
    // 줌 인 로직은 LineMapCanvas 내부에서 처리
    // 여기서는 이벤트만 전달
  };

  const handleZoomOut = () => {
    // 줌 아웃 로직은 LineMapCanvas 내부에서 처리
    // 여기서는 이벤트만 전달
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#020617]">
      {/* 노선도 영역 (모바일에서는 위, 데스크톱에서는 오른쪽) */}
      <main className="flex-1 order-1 lg:order-2 flex flex-col min-h-0">
        {/* 상단 헤더 */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <h1 className="text-sm font-medium text-white">
            노선도
          </h1>
          <div className="text-xs text-gray-400">
            {selectedLine}호선
          </div>
        </div>

        {/* 지도 영역: 화면 크기에 맞게 표시 */}
        <div className="flex-1 relative min-h-[300px] overflow-hidden">
        <LineMapCanvas
          selectedLine={selectedLine}
        />
          
          {/* 줌 컨트롤 - 버튼은 클릭 가능하도록 유지 */}
          <MapZoomControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />
        </div>
      </main>

      {/* 좌측 패널 (모바일에서는 아래, 데스크톱에서는 왼쪽) */}
      <LineMapSidebar
        selectedLine={selectedLine}
        stations={stations}
        selectedStation={selectedStation}
        searchQuery={searchQuery}
        onLineChange={handleLineChange}
        onStationSelect={handleStationSelect}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
}

