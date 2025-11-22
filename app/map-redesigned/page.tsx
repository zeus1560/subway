'use client';

import RedesignedSubwayMap from '@/components/RedesignedSubwayMap';
import { useState } from 'react';

export default function MapRedesignedPage() {
  const [selectedLine, setSelectedLine] = useState<string | undefined>('1');
  const [selectedStation, setSelectedStation] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            리디자인된 인터랙티브 노선도
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            노선 탭을 선택하여 특정 노선을 강조하거나, 역을 클릭하여 상세 정보를 확인하세요.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden" style={{ height: '80vh', minHeight: '600px' }}>
          <RedesignedSubwayMap
            selectedLine={selectedLine}
            onStationSelect={(station) => {
              setSelectedStation(station);
              console.log('선택된 역:', station);
            }}
            onLineChange={(line) => {
              setSelectedLine(line);
              console.log('선택된 노선:', line);
            }}
          />
        </div>

        {selectedStation && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              선택된 역 정보
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedStation.name} ({selectedStation.lineNum}호선)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

