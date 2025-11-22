'use client';

import { useState, useEffect } from 'react';
import { MapPin, Train } from 'lucide-react';
import { getStationCongestion, calculateCongestionLevel } from '@/lib/api';
import { getLineColor } from '@/lib/utils';

interface Station {
  name: string;
  line: string;
  x: number;
  y: number;
}

interface InteractiveMapProps {
  selectedLine?: string;
  onStationClick?: (station: Station) => void;
}

// 노선도 데이터 (SVG 좌표)
const STATION_MAP: Record<string, Station[]> = {
  '1': [
    { name: '서울역', line: '1', x: 100, y: 100 },
    { name: '시청', line: '1', x: 100, y: 150 },
    { name: '종로3가', line: '1', x: 100, y: 200 },
    { name: '종로5가', line: '1', x: 100, y: 250 },
    { name: '동대문', line: '1', x: 100, y: 300 },
  ],
  '2': [
    { name: '홍대입구', line: '2', x: 50, y: 200 },
    { name: '을지로입구', line: '2', x: 150, y: 200 },
    { name: '을지로3가', line: '2', x: 200, y: 200 },
    { name: '을지로4가', line: '2', x: 250, y: 200 },
    { name: '강남', line: '2', x: 300, y: 200 },
    { name: '역삼', line: '2', x: 300, y: 250 },
    { name: '선릉', line: '2', x: 300, y: 300 },
    { name: '사당', line: '2', x: 200, y: 300 },
  ],
  '3': [
    { name: '고속터미널', line: '3', x: 250, y: 100 },
    { name: '교대', line: '3', x: 250, y: 150 },
    { name: '약수', line: '3', x: 250, y: 200 },
    { name: '충무로', line: '3', x: 200, y: 200 },
    { name: '종로3가', line: '3', x: 100, y: 200 },
  ],
  '4': [
    { name: '명동', line: '4', x: 150, y: 150 },
    { name: '회현', line: '4', x: 100, y: 150 },
    { name: '동대문', line: '4', x: 100, y: 300 },
    { name: '동대문역사문화공원', line: '4', x: 150, y: 250 },
    { name: '사당', line: '4', x: 200, y: 300 },
  ],
  '5': [
    { name: '을지로4가', line: '5', x: 250, y: 200 },
    { name: '동대문역사문화공원', line: '5', x: 150, y: 250 },
    { name: '왕십리', line: '5', x: 200, y: 250 },
  ],
  '6': [
    { name: '이태원', line: '6', x: 300, y: 150 },
    { name: '약수', line: '6', x: 250, y: 200 },
    { name: '불광', line: '6', x: 50, y: 100 },
    { name: '연신내', line: '6', x: 50, y: 150 },
  ],
  '7': [
    { name: '건대입구', line: '7', x: 200, y: 100 },
    { name: '고속터미널', line: '7', x: 250, y: 100 },
  ],
  '8': [
    { name: '잠실', line: '8', x: 350, y: 200 },
  ],
  '9': [
    { name: '고속터미널', line: '9', x: 250, y: 100 },
  ],
};

export default function InteractiveMap({ selectedLine, onStationClick }: InteractiveMapProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [congestionData, setCongestionData] = useState<Record<string, any>>({});
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);

  useEffect(() => {
    const lines = selectedLine ? [selectedLine] : Object.keys(STATION_MAP);
    const allStations: Station[] = [];
    
    lines.forEach((line) => {
      if (STATION_MAP[line]) {
        allStations.push(...STATION_MAP[line]);
      }
    });

    setStations(allStations);
    loadCongestionData(allStations);
  }, [selectedLine]);

  const loadCongestionData = async (stationList: Station[]) => {
    try {
      const promises = stationList.map(async (station) => {
        try {
          const data = await getStationCongestion(station.name, station.line);
          const passengerCount = data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
          return { stationId: `${station.name}_${station.line}`, passengerCount };
        } catch (error) {
          console.error(`역 ${station.name} 데이터 로드 실패:`, error);
          return { stationId: `${station.name}_${station.line}`, passengerCount: 500 };
        }
      });

      const results = await Promise.all(promises);
      const dataMap: Record<string, any> = {};
      results.forEach((result) => {
        dataMap[result.stationId] = result.passengerCount;
      });
      setCongestionData(dataMap);
    } catch (error) {
      console.error('혼잡도 데이터 로드 오류:', error);
    }
  };

  const getCongestionColor = (station: Station): string => {
    const stationId = `${station.name}_${station.line}`;
    const passengerCount = congestionData[stationId] || 500;
    const congestion = calculateCongestionLevel(passengerCount);
    return congestion.color;
  };

  return (
    <div className="w-full h-full relative bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden min-h-[600px]">
      <svg viewBox="0 0 400 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* 노선 그리기 */}
        {Object.entries(STATION_MAP).map(([line, lineStations]) => {
          if (selectedLine && line !== selectedLine) return null;
          
          return lineStations.map((station, index) => {
            if (index === 0) return null;
            const prevStation = lineStations[index - 1];
            return (
              <line
                key={`line-${line}-${index}`}
                x1={prevStation.x}
                y1={prevStation.y}
                x2={station.x}
                y2={station.y}
                stroke={getLineColor(line)}
                strokeWidth="4"
                opacity="0.5"
              />
            );
          });
        })}

        {/* 역 표시 */}
        {stations.map((station) => {
          const color = getCongestionColor(station);
          const isHovered = hoveredStation === `${station.name}_${station.line}`;

          return (
            <g key={`${station.name}_${station.line}`}>
              <circle
                cx={station.x}
                cy={station.y}
                r={isHovered ? 12 : 10}
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer transition-all"
                onClick={() => onStationClick?.(station)}
                onMouseEnter={() => setHoveredStation(`${station.name}_${station.line}`)}
                onMouseLeave={() => setHoveredStation(null)}
              />
              {isHovered && (
                <g>
                  <rect
                    x={station.x - 30}
                    y={station.y - 30}
                    width="60"
                    height="20"
                    fill="white"
                    fillOpacity="0.9"
                    rx="4"
                    stroke="gray"
                    strokeWidth="1"
                  />
                  <text
                    x={station.x}
                    y={station.y - 15}
                    textAnchor="middle"
                    className="text-xs font-semibold"
                    fill="#1f2937"
                    style={{ fontSize: '10px' }}
                  >
                    {station.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">혼잡도</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">여유</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">보통</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">혼잡</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">매우 혼잡</span>
          </div>
        </div>
      </div>
    </div>
  );
}

