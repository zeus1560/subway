'use client';

import { useRouter } from 'next/navigation';
import { MapPin, Route, Star } from 'lucide-react';
import { getLineColor } from '@/lib/utils';

interface FavoriteStation {
  stationName: string;
  lineNum?: string;
}

interface FavoriteRoute {
  start: string;
  end: string;
  useCount?: number;
}

interface FrequentStationsProps {
  favoriteStations: FavoriteStation[];
  favoriteRoutes: FavoriteRoute[];
  onRouteClick?: (start: string, end: string) => void;
}

export default function FrequentStations({
  favoriteStations,
  favoriteRoutes,
  onRouteClick,
}: FrequentStationsProps) {
  const router = useRouter();

  const handleStationClick = (station: FavoriteStation) => {
    router.push(`/stations/${station.stationName}_${station.lineNum || '1'}`);
  };

  const handleRouteClick = (route: FavoriteRoute) => {
    if (onRouteClick) {
      onRouteClick(route.start, route.end);
    }
  };

  if (favoriteStations.length === 0 && favoriteRoutes.length === 0) {
    return null;
  }

  return (
    <section className="w-full mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-[20px] h-[20px] text-[#2979FF]" />
        <h2 className="text-lg font-semibold text-[#111827]">자주 찾는 역 / 경로</h2>
      </div>

      {/* 자주 찾는 역 - 슬림 리스트 */}
      {favoriteStations.length > 0 && (
        <div className="bg-white rounded-[14px] mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#8A90A2]">즐겨찾는 역</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {favoriteStations.slice(0, 5).map((station, idx) => (
              <button
                key={idx}
                onClick={() => handleStationClick(station)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getLineColor(station.lineNum || '1') }}
                >
                  {station.lineNum || '1'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-[#111827]">
                    {station.stationName}
                  </div>
                </div>
                <MapPin className="w-[20px] h-[20px] text-[#8A90A2] flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 자주 찾는 경로 - 슬림 리스트 */}
      {favoriteRoutes.length > 0 && (
        <div className="bg-white rounded-[14px]">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#8A90A2]">자주 찾는 경로</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {favoriteRoutes.slice(0, 5).map((route, idx) => (
              <button
                key={idx}
                onClick={() => handleRouteClick(route)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <Route className="w-[20px] h-[20px] text-[#2979FF] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-[#111827]">
                    {route.start} → {route.end}
                  </div>
                  {route.useCount && route.useCount > 1 && (
                    <div className="text-xs text-[#8A90A2] mt-0.5">
                      {route.useCount}회 이용
                    </div>
                  )}
                </div>
                <div className="text-sm text-[#8A90A2] flex-shrink-0">→</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

