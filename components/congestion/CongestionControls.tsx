'use client';

import { MapPin, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { getLineColor } from '@/lib/utils';

export type Direction = 'up' | 'down';

interface RecommendedStation {
  name: string;
  lineNum: string;
  reason: string;
}

interface CongestionControlsProps {
  selectedLine: string;
  lines: string[];
  baseStation: string | null;
  stations: Array<{ name: string; lineNum: string }>;
  direction: Direction;
  recommendedStations?: RecommendedStation[];
  onChangeLine: (line: string) => void;
  onChangeBaseStation: (station: { name: string; lineNum: string }) => void;
  onChangeDirection: (direction: Direction) => void;
}

export default function CongestionControls({
  selectedLine,
  lines,
  baseStation,
  stations,
  direction,
  recommendedStations = [],
  onChangeLine,
  onChangeBaseStation,
  onChangeDirection,
}: CongestionControlsProps) {
  return (
    <section className="w-full mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-[16px] p-6 border border-gray-200 dark:border-gray-700">
        {/* 노선 선택 탭 */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {lines.map((line) => (
              <button
                key={line}
                onClick={() => onChangeLine(line)}
                className={`px-3 py-1.5 rounded-[14px] whitespace-nowrap text-sm font-medium transition-colors flex-shrink-0 ${
                  selectedLine === line
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                style={
                  selectedLine === line
                    ? { backgroundColor: getLineColor(line) }
                    : {}
                }
              >
                {line}호선
              </button>
            ))}
          </div>
        </div>

        {/* 기준역 선택 및 방향 토글 */}
        <div className="space-y-4">
          {/* 기준역 선택 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-[20px] h-[20px] text-[#2979FF]" />
              <span className="text-sm font-semibold text-[#111827] dark:text-white">기준역 선택</span>
            </div>
            
            {/* 추천 역 (즐겨찾기/자주 이용 역) */}
            {recommendedStations.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {recommendedStations.map((station) => (
                  <button
                    key={`${station.name}_${station.lineNum}`}
                    onClick={() => onChangeBaseStation({ name: station.name, lineNum: station.lineNum })}
                    className={`px-3 py-1.5 rounded-[14px] text-xs font-medium transition-all ${
                      baseStation === station.name
                        ? 'bg-[#2979FF] text-white shadow-md'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>{station.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* 전체 역 목록 드롭다운 */}
            <select
              value={baseStation ? `${baseStation}_${selectedLine}` : ''}
              onChange={(e) => {
                const [name, lineNum] = e.target.value.split('_');
                if (name && lineNum) {
                  onChangeBaseStation({ name, lineNum });
                }
              }}
              className="w-full px-4 py-3 rounded-[14px] border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-[#111827] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2979FF]"
            >
              <option value="">역을 선택하세요</option>
              {stations
                .filter((station, index, self) => 
                  index === self.findIndex(s => s.name === station.name)
                )
                .map((station) => (
                  <option key={`${station.name}_${station.lineNum}`} value={`${station.name}_${station.lineNum}`}>
                    {station.name}
                  </option>
                ))}
            </select>
          </div>

          {/* 상/하행 토글 */}
          <div className="flex gap-2">
            <button
              onClick={() => onChangeDirection('up')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] font-medium transition-colors ${
                direction === 'up'
                  ? 'bg-[#2979FF] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
              상행
            </button>
            <button
              onClick={() => onChangeDirection('down')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] font-medium transition-colors ${
                direction === 'down'
                  ? 'bg-[#2979FF] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              하행
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

