'use client';

import { useState, useEffect } from 'react';
import { Search, Star, TrendingUp, Clock, Train, Sparkles, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { getFavoriteStations, saveStationUsage } from '@/lib/storage';
import { analyzeFavoriteStations, analyzeStationTrend } from '@/lib/analysis';
import { generateStationRecommendation, CarRecommendation } from '@/lib/recommendation';
import { getLineColor } from '@/lib/utils';

// 주요 역 목록
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
];

// Mock 열차 칸 데이터 생성
const generateMockCarData = (direction: 'up' | 'down') => {
  const cars = [];
  for (let i = 1; i <= 10; i++) {
    // 랜덤하게 혼잡도 생성 (일반적으로 중간 칸이 여유로움)
    let congestionPercent: number;
    let congestionLevel: 'relaxed' | 'normal' | 'caution' | 'crowded';
    
    const context = `train-recommendation-${direction}-${i}`;
    if (i >= 4 && i <= 7) {
      // 중간 칸은 여유롭게
      congestionPercent = 30 + random.contextRandomFloat(context, 0, 30);
    } else if (i === 1 || i === 10) {
      // 앞뒤 칸은 혼잡하게
      congestionPercent = 70 + random.contextRandomFloat(context, 0, 20);
    } else {
      congestionPercent = 40 + random.contextRandomFloat(context, 0, 30);
    }
    
    if (congestionPercent < 40) {
      congestionLevel = 'relaxed';
    } else if (congestionPercent < 60) {
      congestionLevel = 'normal';
    } else if (congestionPercent < 80) {
      congestionLevel = 'caution';
    } else {
      congestionLevel = 'crowded';
    }
    
    cars.push({
      carNumber: i,
      congestionLevel,
      congestionPercent: Math.round(congestionPercent),
      doorPosition: i <= 3 ? 'front' : i >= 8 ? 'back' : 'middle',
      transferAdvantage: i >= 4 && i <= 6, // 중간 칸이 환승 유리
    });
  }
  return cars;
};

export default function TrainRecommendationPage() {
  const [selectedStation, setSelectedStation] = useState<{ name: string; lineNum: string } | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down'>('up');
  const [showStationSelector, setShowStationSelector] = useState(false);
  const [favoriteStations, setFavoriteStations] = useState<any[]>([]);
  const [frequentStations, setFrequentStations] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [originalCars, setOriginalCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState(false);

  useEffect(() => {
    loadFavoriteStations();
    loadFrequentStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadRecommendation();
    }
  }, [selectedStation, selectedDirection]);

  const loadFavoriteStations = () => {
    const favorites = getFavoriteStations();
    setFavoriteStations(favorites);
    
    // 즐겨찾기가 있고 선택된 역이 없으면 첫 번째 즐겨찾기 역 선택
    if (favorites.length > 0 && !selectedStation) {
      setSelectedStation({
        name: favorites[0].stationName,
        lineNum: favorites[0].lineNum,
      });
    }
  };

  const loadFrequentStations = () => {
    const analysis = analyzeFavoriteStations();
    setFrequentStations(analysis.frequentStations);
    
    // 자주 이용한 역이 있고 선택된 역이 없으면 첫 번째 역 선택
    if (analysis.frequentStations.length > 0 && !selectedStation && favoriteStations.length === 0) {
      setSelectedStation({
        name: analysis.frequentStations[0].stationName,
        lineNum: analysis.frequentStations[0].lineNum,
      });
    }
  };

  const loadRecommendation = async () => {
    if (!selectedStation) return;
    
    setLoading(true);
    try {
      // 이용 이력 저장
      const now = new Date();
      await saveStationUsage({
        stationName: selectedStation.name,
        lineNum: selectedStation.lineNum,
        direction: selectedDirection,
        timestamp: now.getTime(),
        dayOfWeek: now.getDay(),
        hour: now.getHours(),
      });
      
      // Mock 데이터 생성
      const cars = generateMockCarData(selectedDirection);
      const arrivalContext = `train-arrival-${selectedStation.name}-${selectedDirection}`;
      const nextTrainArrival = random.contextRandomInt(arrivalContext, 60, 360); // 1-6분 사이
      
      const rec = generateStationRecommendation(
        selectedStation.name,
        selectedStation.lineNum,
        selectedDirection,
        cars,
        nextTrainArrival,
        {
          preferTransfer: true,
          preferQuiet: true,
        }
      );
      
      setRecommendation(rec);
      setOriginalCars(cars);
    } catch (error) {
      console.error('추천 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = (stationName: string, lineNum: string) => {
    setSelectedStation({ name: stationName, lineNum });
    setShowStationSelector(false);
  };

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'relaxed':
        return { bg: '#dcfce7', text: '#166534', bar: '#22c55e' };
      case 'normal':
        return { bg: '#fef9c3', text: '#854d0e', bar: '#eab308' };
      case 'caution':
        return { bg: '#fed7aa', text: '#9a3412', bar: '#f97316' };
      case 'crowded':
        return { bg: '#fee2e2', text: '#991b1b', bar: '#ef4444' };
      default:
        return { bg: '#f3f4f6', text: '#374151', bar: '#6b7280' };
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            AI 열차 칸 추천
          </h1>
          
          {/* 역 선택 */}
          <div className="relative">
            <button
              onClick={() => setShowStationSelector(!showStationSelector)}
              className="w-full flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Search className="w-5 h-5 text-gray-500" />
              <div className="flex-1 text-left">
                {selectedStation ? (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedStation.name}
                    </span>
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: getLineColor(selectedStation.lineNum) }}
                    >
                      {selectedStation.lineNum}호선
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400">역 선택하기</div>
                )}
              </div>
            </button>

            {/* 역 선택 드롭다운 */}
            {showStationSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                <div className="p-2">
                  {/* 즐겨찾기 역 */}
                  {favoriteStations.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        즐겨찾기
                      </div>
                      {favoriteStations.map((fav, index) => (
                        <button
                          key={`fav_${index}`}
                          onClick={() => handleStationSelect(fav.stationName, fav.lineNum)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span
                            className="px-2 py-1 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: getLineColor(fav.lineNum) }}
                          >
                            {fav.lineNum}호선
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {fav.stationName}
                          </span>
                        </button>
                      ))}
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                    </>
                  )}
                  
                  {/* 자주 이용한 역 */}
                  {frequentStations.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        자주 이용한 역
                      </div>
                      {frequentStations.slice(0, 5).map((station, index) => (
                        <button
                          key={`freq_${index}`}
                          onClick={() => handleStationSelect(station.stationName, station.lineNum)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <span
                            className="px-2 py-1 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: getLineColor(station.lineNum) }}
                          >
                            {station.lineNum}호선
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {station.stationName}
                          </span>
                          <span className="ml-auto text-xs text-gray-500">
                            {station.count}회
                          </span>
                        </button>
                      ))}
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                    </>
                  )}
                  
                  {/* 전체 역 목록 */}
                  {STATIONS.map((station, index) =>
                    station.lines.map((line) => (
                      <button
                        key={`${station.name}_${line}_${index}`}
                        onClick={() => handleStationSelect(station.name, line)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          selectedStation?.name === station.name && selectedStation?.lineNum === line
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : ''
                        }`}
                      >
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: getLineColor(line) }}
                        >
                          {line}호선
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {station.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-3">AI 분석 중...</p>
          </div>
        ) : recommendation ? (
          <>
            {/* 방향 선택 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSelectedDirection('up')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  selectedDirection === 'up'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                상행
              </button>
              <button
                onClick={() => setSelectedDirection('down')}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  selectedDirection === 'down'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                하행
              </button>
            </div>

            {/* AI 인사이트 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    AI 추천 분석
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {recommendation.aiInsight}
                  </p>
                </div>
              </div>
            </div>

            {/* 다음 열차 정보 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Train className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">다음 열차</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {recommendation.nextTrainInfo.estimatedArrival}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">혼잡도 요약</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    평균 {Math.round(recommendation.congestionSummary.average)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    최소 {Math.round(recommendation.congestionSummary.min)}% · 최대 {Math.round(recommendation.congestionSummary.max)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 추천 칸 목록 */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                추천 탑승 칸 순위
              </h2>
              <div className="space-y-3">
                {recommendation.recommendedCars.slice(0, 5).map((car: CarRecommendation, index: number) => {
                  // 원본 cars 데이터에서 찾기
                  const carData = originalCars.find((c: any) => c.carNumber === car.carNumber);
                  const color = getCongestionColor(carData?.congestionLevel || 'normal');
                  
                  return (
                    <div
                      key={car.carNumber}
                      className={`bg-white dark:bg-gray-800 border-2 rounded-xl p-4 ${
                        index === 0
                          ? 'border-green-500 dark:border-green-400'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {index === 0 && (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                              최고 추천
                            </span>
                          )}
                          <span className="text-xl font-bold text-gray-900 dark:text-white">
                            {car.carNumber}칸
                          </span>
                          <span
                            className="px-2 py-1 rounded text-xs font-semibold"
                            style={{
                              backgroundColor: color.bg,
                              color: color.text,
                            }}
                          >
                            {color.text === '#166534' ? '여유' :
                             color.text === '#854d0e' ? '보통' :
                             color.text === '#9a3412' ? '주의' : '혼잡'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {Math.round(car.score)}점
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {car.reason}
                      </div>
                      {car.advantages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {car.advantages.map((advantage, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded"
                            >
                              {advantage}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 열차 칸 시각화 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                열차 칸별 혼잡도
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {recommendation.recommendedCars.map((car: CarRecommendation) => {
                  // 원본 cars 데이터에서 찾기
                  const carData = originalCars.find((c: any) => c.carNumber === car.carNumber);
                  const color = getCongestionColor(carData?.congestionLevel || 'normal');
                  const isTopRecommendation = car.carNumber === recommendation.recommendedCars[0].carNumber;
                  
                  return (
                    <div
                      key={car.carNumber}
                      className={`flex-shrink-0 w-16 text-center ${
                        isTopRecommendation ? 'ring-2 ring-green-500 rounded-lg p-1' : ''
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        {car.carNumber}칸
                      </div>
                      <div
                        className="h-24 rounded mb-1 flex items-end justify-center p-1"
                        style={{ backgroundColor: color.bg }}
                      >
                        <div
                          className="w-full rounded"
                          style={{
                            height: `${carData?.congestionPercent || 50}%`,
                            backgroundColor: color.bar,
                          }}
                        />
                      </div>
                      <div
                        className="text-xs font-semibold"
                        style={{ color: color.text }}
                      >
                        {carData?.congestionPercent || 50}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              역을 선택하면 AI가 최적의 탑승 칸을 추천해드립니다.
            </p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}

