'use client';

import { useState, useEffect } from 'react';
import { getStationCongestion, calculateCongestionLevel } from '@/lib/api';
import { getLineColor } from '@/lib/utils';

interface Station {
  name: string;
  line: string;
  x: number;
  y: number;
}

const VISUAL_STATIONS: Station[] = [
  { name: '강남', line: '2', x: 50, y: 50 },
  { name: '홍대입구', line: '2', x: 20, y: 50 },
  { name: '명동', line: '4', x: 50, y: 80 },
  { name: '서울역', line: '1', x: 30, y: 30 },
  { name: '시청', line: '1', x: 40, y: 40 },
];

export default function CongestionVisualization() {
  const [congestionData, setCongestionData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCongestionData();
    const interval = setInterval(loadCongestionData, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const loadCongestionData = async () => {
    try {
      const promises = VISUAL_STATIONS.map(async (station) => {
        try {
          const data = await getStationCongestion(station.name, station.line);
          const passengerCount = data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
          return { stationId: `${station.name}_${station.line}`, passengerCount };
        } catch (error) {
          return { stationId: `${station.name}_${station.line}`, passengerCount: 500 };
        }
      });

      const results = await Promise.all(promises);
      const dataMap: Record<string, number> = {};
      results.forEach((result) => {
        dataMap[result.stationId] = result.passengerCount;
      });
      setCongestionData(dataMap);
      setLoading(false);
    } catch (error) {
      console.error('시각화 데이터 로드 실패:', error);
      setLoading(false);
    }
  };

  const getCongestionColor = (passengerCount: number): string => {
    const congestion = calculateCongestionLevel(passengerCount);
    return congestion.color;
  };

  const getCongestionIntensity = (passengerCount: number): number => {
    const ratio = passengerCount / 1000;
    return Math.min(100, Math.max(0, ratio * 100));
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        실시간 혼잡도 시각화
      </h3>
      <div className="relative h-64 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* 그라데이션 배경 */}
          <defs>
            {VISUAL_STATIONS.map((station) => {
              const stationId = `${station.name}_${station.line}`;
              const passengerCount = congestionData[stationId] || 500;
              const intensity = getCongestionIntensity(passengerCount);
              const color = getCongestionColor(passengerCount);
              
              return (
                <radialGradient key={stationId} id={`gradient-${stationId}`}>
                  <stop offset="0%" stopColor={color} stopOpacity={intensity / 100} />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
              );
            })}
          </defs>

          {/* 혼잡도 그라데이션 영역 */}
          {VISUAL_STATIONS.map((station) => {
            const stationId = `${station.name}_${station.line}`;
            const passengerCount = congestionData[stationId] || 500;
            const intensity = getCongestionIntensity(passengerCount);
            
            return (
              <circle
                key={`area-${stationId}`}
                cx={station.x}
                cy={station.y}
                r={intensity / 10}
                fill={`url(#gradient-${stationId})`}
                className="animate-pulse"
                style={{ animationDuration: `${2 + intensity / 50}s` }}
              />
            );
          })}

          {/* 역 표시 */}
          {VISUAL_STATIONS.map((station) => {
            const stationId = `${station.name}_${station.line}`;
            const passengerCount = congestionData[stationId] || 500;
            const color = getCongestionColor(passengerCount);
            
            return (
              <g key={stationId}>
                <circle
                  cx={station.x}
                  cy={station.y}
                  r="3"
                  fill={color}
                  stroke="white"
                  strokeWidth="1"
                  className="animate-pulse"
                />
                <text
                  x={station.x}
                  y={station.y - 5}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-gray-900 dark:fill-white"
                  style={{ fontSize: '2px' }}
                >
                  {station.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 범례 */}
        <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-800/90 rounded px-2 py-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-600 dark:text-gray-400">여유</span>
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-gray-600 dark:text-gray-400">보통</span>
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-gray-600 dark:text-gray-400">혼잡</span>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-gray-600 dark:text-gray-400">매우 혼잡</span>
          </div>
        </div>
      </div>
    </div>
  );
}


