'use client';

import { useState } from 'react';
import BottomNavigation from '@/components/BottomNavigation';
import EnhancedSubwayMap from '@/components/EnhancedSubwayMap';
import Legend from '@/components/Legend';
import { Station } from '@/lib/subwayMapData';

export default function MapPage() {
  const [selectedLine, setSelectedLine] = useState<string | undefined>('1');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            서울 지하철 노선도
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            노선을 선택하거나 역을 클릭하여 상세 정보를 확인하세요
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
          style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}
        >
          <EnhancedSubwayMap
            selectedLine={selectedLine}
            onStationSelect={(station) => {
              setSelectedStation(station);
            }}
            onLineChange={(line) => {
              setSelectedLine(line);
            }}
          />
        </div>

        {/* 사용 안내 */}
        <div className="mt-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 <strong>사용 팁:</strong> 노선 탭을 클릭하여 특정 노선만 보거나, 역을 클릭하여 혼잡도 정보를 확인할 수 있습니다. 
            PC에서는 마우스 휠로 확대/축소, 드래그로 이동할 수 있습니다. 모바일에서는 핀치 줌과 더블탭을 지원합니다.
          </p>
        </div>
      </main>

      <BottomNavigation />
      <Legend />
    </div>
  );
}

