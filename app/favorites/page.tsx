'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Trash2, Plus } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import CongestionCard from '@/components/CongestionCard';
import { getFavoriteStations, removeFavoriteStation } from '@/lib/storage';
import { getStationCongestion, predictCongestion } from '@/lib/api';

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [stationData, setStationData] = useState<Record<string, any>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const favs = getFavoriteStations();
    setFavorites(favs);

    const dataPromises = favs.map(async (fav: any) => {
      try {
        const data = await getStationCongestion(fav.stationName, fav.lineNum);
        return { ...fav, data };
      } catch (error) {
        return { ...fav, data: null };
      }
    });

    const results = await Promise.all(dataPromises);
    const dataMap: Record<string, any> = {};
    results.forEach((result) => {
      if (result.data) {
        dataMap[`${result.stationName}_${result.lineNum}`] = result.data;
      }
    });
    setStationData(dataMap);
  };

  const handleRemove = async (stationName: string, lineNum: string) => {
    await removeFavoriteStation({ stationName, lineNum });
    loadFavorites();
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">즐겨찾기</h1>
            <button
              onClick={() => router.push('/stations')}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-6">즐겨찾기 역이 없습니다.</p>
            <button
              onClick={() => router.push('/stations')}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              역 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((fav: any, index: number) => {
              const data = stationData[`${fav.stationName}_${fav.lineNum}`];
              const passengerCount = data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
              const predictedData = predictCongestion(
                { passengerCount },
                [{ passengerCount: passengerCount * 0.9 }]
              );

              return (
                <div key={index} className="relative">
                  <CongestionCard
                    station={fav.stationName}
                    line={fav.lineNum}
                    passengerCount={passengerCount}
                    predictedCount={predictedData.predictedPassengerCount}
                    showPrediction={true}
                    stationId={`${fav.stationName}_${fav.lineNum}`}
                  />
                  <button
                    onClick={() => handleRemove(fav.stationName, fav.lineNum)}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}


