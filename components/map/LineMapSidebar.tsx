'use client';

import { Station, LineId, ALL_LINE_IDS } from '@/lib/subwayMapData';
import LineSelectorTabs from './LineSelectorTabs';
import StationSearchInput from './StationSearchInput';
import StationList from './StationList';
import SelectedStationCard from './SelectedStationCard';

interface LineMapSidebarProps {
  selectedLine: LineId;
  stations: Station[];
  selectedStation: Station | null;
  searchQuery: string;
  onLineChange: (line: LineId) => void;
  onStationSelect: (station: Station) => void;
  onSearchChange: (query: string) => void;
}

export default function LineMapSidebar({
  selectedLine,
  stations,
  selectedStation,
  searchQuery,
  onLineChange,
  onStationSelect,
  onSearchChange,
}: LineMapSidebarProps) {
  // 검색어로 필터링된 역 목록
  const filteredStations = searchQuery
    ? stations.filter(s => s.name.includes(searchQuery))
    : stations;

  // 현재 선택된 노선/방향 요약
  const getLineDirectionText = () => {
    if (selectedLine === '2') {
      return '2호선 · 순환';
    }
    return `${selectedLine}호선`;
  };

  return (
    <aside className="w-full lg:w-[280px] xl:w-[320px] border-t lg:border-t-0 lg:border-r border-r border-border-subtle bg-[#020617] flex flex-col h-full order-2 lg:order-1 flex-shrink-0 max-h-[calc(100vh-64px)] lg:max-h-none">
      <div className="flex flex-col h-full min-h-0 overflow-y-auto">
        {/* 상단: 노선 선택 및 요약 */}
        <div className="px-4 pt-4 pb-4 border-b border-white/10 flex-shrink-0 overflow-visible">
          {/* 현재 선택된 노선/방향 요약 */}
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">현재 선택</div>
            <div className="text-sm font-medium text-white">{getLineDirectionText()}</div>
          </div>

          {/* 노선 선택 탭 */}
          <LineSelectorTabs
            selectedLine={selectedLine}
            onLineChange={onLineChange}
          />
        </div>

        {/* 역 검색 */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <StationSearchInput
            placeholder="역 이름으로 검색"
            onSearch={onSearchChange}
          />
        </div>

        {/* 역 리스트 - 스크롤 가능하도록 */}
        <div className="flex-1 min-h-0 px-4 py-4 pb-[72px] lg:pb-4">
          <StationList
            stations={filteredStations}
            selectedStationId={selectedStation?.id || null}
            onStationSelect={onStationSelect}
          />
        </div>

        {/* 선택된 역 상세 카드는 현재 사용하지 않으므로 렌더링하지 않는다. */}
        {false && selectedStation && (
          <div className="p-4 border-t border-white/10 flex-shrink-0 pb-[72px] lg:pb-4">
            <SelectedStationCard station={selectedStation} />
          </div>
        )}
      </div>
    </aside>
  );
}

