'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Clock, TrendingUp, TrendingDown, Train, ArrowRight } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import TrainCarVisualization from '@/components/TrainCarVisualization';
import { getLineColor } from '@/lib/utils';
import { getStationCongestion, calculateCongestionLevel, predictCongestion } from '@/lib/api';
import { saveFavoriteStation, getFavoriteStations, removeFavoriteStation } from '@/lib/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = decodeURIComponent(params.id as string);
  const [stationName, lineNum] = stationId.split('_');
  
  const [congestionData, setCongestionData] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [showTrainCarView, setShowTrainCarView] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
    checkFavorite();
    
    // 실시간 데이터 자동 갱신 (30초마다)
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]);

  const loadData = async () => {
    try {
      // 첫 로드가 아닐 때는 로딩 표시하지 않음 (백그라운드 갱신)
      if (!congestionData) {
        setLoading(true);
      }
      const data = await getStationCongestion(stationName, lineNum);
      setCongestionData(data);
    } catch (error) {
      console.error('혼잡도 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = () => {
    const favorites = getFavoriteStations();
    const favorite = favorites.find(
      (fav) => fav.stationName === stationName && fav.lineNum === lineNum
    );
    setIsFavorite(!!favorite);
  };

  const toggleFavorite = async () => {
    if (isFavorite) {
      await removeFavoriteStation({ stationName, lineNum });
    } else {
      await saveFavoriteStation({ stationName, lineNum });
    }
    setIsFavorite(!isFavorite);
  };

  if (!mounted) {
    return null;
  }

  const passengerCount = congestionData?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
  const isRealtime = congestionData?.CardSubwayStatsNew?.row?.[0]?.REALTIME || false;
  const updateTime = congestionData?.CardSubwayStatsNew?.row?.[0]?.UPDATE_TIME;
  const congestion = calculateCongestionLevel(passengerCount);
  
  // 예측 데이터 생성
  const predictedData = predictCongestion(
    { passengerCount },
    [{ passengerCount: passengerCount * 0.9 }]
  );
  const predictedCongestion = calculateCongestionLevel(predictedData.predictedPassengerCount);

  // 시간대별 데이터 (예시)
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}시`,
    passengers: Math.floor(passengerCount * (0.5 + Math.sin((i - 6) * Math.PI / 12) * 0.5)),
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{stationName}</h1>
                <span
                  className="px-2 py-1 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: getLineColor(lineNum) }}
                >
                  {lineNum}호선
                </span>
              </div>
            </div>
            <button
              onClick={toggleFavorite}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <Star
                className={`w-6 h-6 ${
                  isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 현재 혼잡도 카드 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">현재 혼잡도</h2>
                  {isRealtime && (
                    <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold">
                      실시간
                    </span>
                  )}
                </div>
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              {updateTime && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  마지막 업데이트: {new Date(updateTime).toLocaleTimeString('ko-KR')}
                </div>
              )}
              <div className="flex items-center gap-4">
                <div
                  className="w-3 h-20 rounded-full"
                  style={{ backgroundColor: congestion.color }}
                />
                <div className="flex-1">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {congestion.level}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    승차 인원: {passengerCount.toLocaleString()}명
                  </div>
                </div>
                <div className="text-5xl">{getCongestionIcon(congestion.level)}</div>
              </div>
            </div>

            {/* 예측 혼잡도 카드 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">10분 후 예측</h2>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="w-3 h-20 rounded-full opacity-70"
                  style={{ backgroundColor: predictedCongestion.color }}
                />
                <div className="flex-1">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {predictedCongestion.level}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    예상 인원: {predictedData.predictedPassengerCount.toLocaleString()}명
                  </div>
                </div>
                <div className="text-5xl opacity-70">{getCongestionIcon(predictedCongestion.level)}</div>
              </div>
            </div>

            {/* 열차 칸 단위 혼잡도 시각화 버튼 */}
            <div className="mb-6">
              <button
                onClick={() => setShowTrainCarView(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-4 flex items-center justify-between hover:from-blue-600 hover:to-purple-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Train className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-semibold">열차 칸별 혼잡도 확인</div>
                    <div className="text-sm opacity-90">각 칸의 실시간 혼잡도 확인</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* 시간대별 혼잡도 차트 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                시간대별 혼잡도 추이
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="passengers"
                    stroke={congestion.color}
                    strokeWidth={2}
                    dot={{ fill: congestion.color }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </main>

      {/* 열차 칸별 혼잡도 전체 화면 */}
      {showTrainCarView && (
        <TrainCarVisualization
          stationName={stationName}
          lineNum={lineNum}
          upDirectionName={getUpDirectionName(stationName, lineNum)}
          downDirectionName={getDownDirectionName(stationName, lineNum)}
          onClose={() => setShowTrainCarView(false)}
        />
      )}

      <BottomNavigation />
    </div>
  );
}

function getCongestionIcon(level: string) {
  const icons: Record<string, string> = {
    '여유': '😊',
    '보통': '😐',
    '혼잡': '😰',
    '매우 혼잡': '😱',
  };
  return icons[level] || '😐';
}

function getUpDirectionName(stationName: string, lineNum: string): string {
  // 노선별 상행 방향명 (예시)
  const directionMap: Record<string, Record<string, string>> = {
    '1': {
      '서울역': '소요산',
      '용산': '서울역',
    },
    '2': {
      '강남': '을지로입구',
      '홍대입구': '강남',
    },
  };
  return directionMap[lineNum]?.[stationName] || '상행';
}

function getDownDirectionName(stationName: string, lineNum: string): string {
  // 노선별 하행 방향명 (예시)
  const directionMap: Record<string, Record<string, string>> = {
    '1': {
      '서울역': '인천',
      '용산': '대방',
    },
    '2': {
      '강남': '사당',
      '홍대입구': '신도림',
    },
  };
  return directionMap[lineNum]?.[stationName] || '하행';
}

