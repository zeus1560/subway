'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, X } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { getLineColor } from '@/lib/utils';
import { saveFavoriteStation, getFavoriteStations } from '@/lib/storage';
import { getStationCongestion, calculateCongestionLevel } from '@/lib/api';
import { saveSearchHistory } from '@/lib/personalizationService';

const STATIONS = [
  { name: '강남', lines: ['2', '신분당'] },
  { name: '홍대입구', lines: ['2', '6', '경의중앙', '공항철도'] },
  { name: '명동', lines: ['4'] },
  { name: '동대문', lines: ['1', '4'] },
  { name: '이태원', lines: ['6'] },
  { name: '잠실', lines: ['2', '8'] },
  { name: '신촌', lines: ['2'] },
  { name: '을지로입구', lines: ['2', '5'] },
  { name: '을지로3가', lines: ['2', '3'] },
  { name: '을지로4가', lines: ['2', '5'] },
  { name: '종로3가', lines: ['1', '3', '5'] },
  { name: '종로5가', lines: ['1'] },
  { name: '시청', lines: ['1', '2'] },
  { name: '서울역', lines: ['1', '4', '경의중앙', '공항철도'] },
  { name: '회현', lines: ['4'] },
  { name: '충무로', lines: ['3', '4'] },
  { name: '동대문역사문화공원', lines: ['2', '4', '5'] },
  { name: '왕십리', lines: ['2', '5', '경의중앙', '분당'] },
  { name: '건대입구', lines: ['2', '7'] },
  { name: '성수', lines: ['2'] },
  { name: '삼성', lines: ['2'] },
  { name: '선릉', lines: ['2', '분당'] },
  { name: '역삼', lines: ['2'] },
  { name: '교대', lines: ['2', '3'] },
  { name: '사당', lines: ['2', '4'] },
  { name: '방배', lines: ['2'] },
  { name: '서초', lines: ['2'] },
  { name: '잠원', lines: ['3'] },
  { name: '고속터미널', lines: ['3', '7', '9'] },
  { name: '옥수', lines: ['3'] },
  { name: '압구정', lines: ['3'] },
  { name: '신사', lines: ['3'] },
  { name: '약수', lines: ['3', '6'] },
  { name: '동대입구', lines: ['3'] },
  { name: '충무로', lines: ['3', '4'] },
  { name: '을지로3가', lines: ['2', '3'] },
  { name: '종로3가', lines: ['1', '3', '5'] },
  { name: '안국', lines: ['3'] },
  { name: '경복궁', lines: ['3'] },
  { name: '독립문', lines: ['3'] },
  { name: '홍제', lines: ['3'] },
  { name: '무악재', lines: ['3'] },
  { name: '불광', lines: ['3', '6'] },
  { name: '연신내', lines: ['3', '6'] },
  { name: '구파발', lines: ['3'] },
  { name: '지축', lines: ['3'] },
  { name: '삼송', lines: ['3'] },
  { name: '원흥', lines: ['3'] },
  { name: '원당', lines: ['3'] },
  { name: '화정', lines: ['3'] },
  { name: '대곡', lines: ['3', '경의중앙'] },
  { name: '백석', lines: ['3'] },
  { name: '마두', lines: ['3'] },
  { name: '정발산', lines: ['3'] },
  { name: '주엽', lines: ['3'] },
  { name: '대화', lines: ['3'] },
];

export default function StationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const favs = getFavoriteStations();
    setFavorites(favs);
  };

  const filteredStations = STATIONS.filter((station) =>
    station.name.includes(searchQuery)
  );

  const handleStationClick = (stationName: string, lineNum: string) => {
    saveSearchHistory(stationName, lineNum);
    router.push(`/stations/${encodeURIComponent(`${stationName}_${lineNum}`)}`);
  };

  const toggleFavorite = async (stationName: string, lineNum: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFavorite = favorites.some(
      (fav) => fav.stationName === stationName && fav.lineNum === lineNum
    );

    if (isFavorite) {
      // 즐겨찾기에서 제거는 favorites 페이지에서 처리
      return;
    } else {
      await saveFavoriteStation({ stationName, lineNum });
      loadFavorites();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">역 검색</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="역 이름을 입력하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {filteredStations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStations.map((station, index) =>
              station.lines.map((line) => {
                const isFavorite = favorites.some(
                  (fav) => fav.stationName === station.name && fav.lineNum === line
                );
                return (
                  <div
                    key={`${station.name}_${line}_${index}`}
                    onClick={() => handleStationClick(station.name, line)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="px-3 py-1 rounded text-sm font-semibold text-white"
                          style={{ backgroundColor: getLineColor(line) }}
                        >
                          {line}호선
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {station.name}
                        </h3>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(station.name, line, e)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isFavorite
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-400'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}

