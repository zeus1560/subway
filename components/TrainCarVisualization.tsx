'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Train, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { random } from '@/lib/random';

interface CarData {
  carNumber: number;
  congestionLevel: 'relaxed' | 'normal' | 'caution' | 'crowded';
  congestionPercent: number;
  recommendedBoarding: boolean;
  doorPosition: 'front' | 'middle' | 'back';
  transferAdvantage: boolean;
}

interface TrainData {
  trainId: string;
  arrivalTime: number; // 초 단위
  cars: CarData[];
}

interface TrainCarVisualizationProps {
  stationName: string;
  lineNum: string;
  direction?: 'up' | 'down';
  onDirectionChange?: (direction: 'up' | 'down') => void;
  upDirectionName?: string;
  downDirectionName?: string;
  onClose?: () => void;
}

// 혼잡도별 색상 정의
const CONGESTION_COLORS = {
  relaxed: {
    bg: '#dcfce7', // green-100
    text: '#166534', // green-800
    bar: '#22c55e', // green-500
    label: '여유',
  },
  normal: {
    bg: '#fef9c3', // yellow-100
    text: '#854d0e', // yellow-800
    bar: '#eab308', // yellow-500
    label: '보통',
  },
  caution: {
    bg: '#fed7aa', // orange-100
    text: '#9a3412', // orange-800
    bar: '#f97316', // orange-500
    label: '주의',
  },
  crowded: {
    bg: '#fee2e2', // red-100
    text: '#991b1b', // red-800
    bar: '#ef4444', // red-500
    label: '혼잡',
  },
};

export default function TrainCarVisualization({
  stationName,
  lineNum,
  direction: initialDirection,
  onDirectionChange,
  upDirectionName,
  downDirectionName,
  onClose,
}: TrainCarVisualizationProps) {
  const router = useRouter();
  const [trains, setTrains] = useState<Record<'up' | 'down', TrainData[]>>({ up: [], down: [] });
  const [selectedCar, setSelectedCar] = useState<{ trainId: string; carNumber: number; direction: 'up' | 'down' } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<Record<'up' | 'down', number>>({ up: 0, down: 0 });
  const [loading, setLoading] = useState(true);
  const [currentTrainIndex, setCurrentTrainIndex] = useState<Record<'up' | 'down', number>>({ up: 0, down: 0 });
  const [nearbyStations, setNearbyStations] = useState<string[]>([]);
  const [selectedStationIndex, setSelectedStationIndex] = useState(0);
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down'>(initialDirection || 'up');
  const [expandedNextTrain, setExpandedNextTrain] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadNearbyStations();
    loadTrainData('up');
    loadTrainData('down');
    const interval = setInterval(() => {
      updateTimeRemaining();
      loadTrainData('up');
      loadTrainData('down');
    }, 30000);

    const timeInterval = setInterval(updateTimeRemaining, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, [stationName, lineNum]);

  const loadNearbyStations = () => {
    // 인근 역 목록 (예시)
    const stations: Record<string, string[]> = {
      '노량진': ['용산', '노량진', '대방'],
      '용산': ['서울역', '용산', '노량진'],
      '대방': ['노량진', '대방', '신길'],
      '강남': ['역삼', '강남', '선릉'],
      '역삼': ['강남', '역삼', '선릉'],
      '선릉': ['역삼', '선릉', '한티'],
    };
    const stationList = stations[stationName] || [stationName];
    setNearbyStations(stationList);
    setSelectedStationIndex(stationList.indexOf(stationName));
  };

  const loadTrainData = async (dir: 'up' | 'down') => {
    try {
      const mockTrains: TrainData[] = [];
      
      for (let i = 0; i < 3; i++) {
        const cars: CarData[] = [];
        for (let carNum = 1; carNum <= 10; carNum++) {
          const baseCongestion = getBaseCongestion(dir, carNum);
          const context = `train-${dir}-${i}-${carNum}`;
          const congestionPercent = baseCongestion + random.contextRandomFloat(context, -10, 10);
          
          let congestionLevel: CarData['congestionLevel'] = 'normal';
          if (congestionPercent < 30) congestionLevel = 'relaxed';
          else if (congestionPercent < 60) congestionLevel = 'normal';
          else if (congestionPercent < 80) congestionLevel = 'caution';
          else congestionLevel = 'crowded';

          cars.push({
            carNumber: carNum,
            congestionLevel,
            congestionPercent: Math.max(0, Math.min(100, congestionPercent)),
            recommendedBoarding: congestionPercent < 50,
            doorPosition: carNum <= 3 ? 'front' : carNum <= 7 ? 'middle' : 'back',
            transferAdvantage: carNum === 5 || carNum === 6,
          });
        }
        
        const arrivalContext = `train-arrival-${dir}-${i}`;
        mockTrains.push({
          trainId: `train-${dir}-${i + 1}`,
          arrivalTime: (i + 1) * 180 + random.contextRandomFloat(arrivalContext, 0, 60),
          cars,
        });
      }
      
      setTrains((prev) => ({ ...prev, [dir]: mockTrains }));
      if (mockTrains.length > 0) {
        setTimeRemaining((prev) => ({ ...prev, [dir]: Math.round(mockTrains[0].arrivalTime) }));
      }
      setLoading(false);
    } catch (error) {
      console.error('열차 데이터 로드 실패:', error);
      setLoading(false);
    }
  };

  const getBaseCongestion = (dir: 'up' | 'down', carNum: number): number => {
    const now = new Date();
    const hour = now.getHours();
    
    let base = 40;
    if (hour >= 7 && hour <= 9) base = 70;
    else if (hour >= 18 && hour <= 20) base = 75;
    
    if (dir === 'up') base += 5;
    
    if (carNum === 1 || carNum === 10) base += 10;
    else if (carNum >= 4 && carNum <= 7) base -= 5;
    
    return base;
  };

  const updateTimeRemaining = () => {
    ['up', 'down'].forEach((dir) => {
      const dirKey = dir as 'up' | 'down';
      if (trains[dirKey] && trains[dirKey].length > 0) {
        const nextTrain = trains[dirKey][currentTrainIndex[dirKey] || 0];
        if (nextTrain) {
          const remaining = Math.max(0, nextTrain.arrivalTime - (Date.now() % 100000) / 1000);
          setTimeRemaining((prev) => ({ ...prev, [dirKey]: Math.round(remaining) }));
        }
      }
    });
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}초`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}분 ${secs}초` : `${mins}분`;
  };

  const handleCarClick = (trainId: string, carNumber: number, direction: 'up' | 'down') => {
    if (selectedCar?.trainId === trainId && selectedCar?.carNumber === carNumber && selectedCar?.direction === direction) {
      setSelectedCar(null);
    } else {
      setSelectedCar({ trainId, carNumber, direction });
    }
  };

  const handleStationClick = (station: string) => {
    if (station !== stationName) {
      router.push(`/stations/${encodeURIComponent(`${station}_${lineNum}`)}`);
    }
  };

  // 가장 여유로운 칸 찾기
  const getRecommendedCars = (cars: CarData[]): number[] => {
    const sorted = [...cars].sort((a, b) => {
      const orderA = a.congestionLevel === 'relaxed' ? 1 : a.congestionLevel === 'normal' ? 2 : a.congestionLevel === 'caution' ? 3 : 4;
      const orderB = b.congestionLevel === 'relaxed' ? 1 : b.congestionLevel === 'normal' ? 2 : b.congestionLevel === 'caution' ? 3 : 4;
      if (orderA !== orderB) return orderA - orderB;
      return a.congestionPercent - b.congestionPercent;
    });
    
    return sorted
      .filter(car => car.congestionLevel === 'relaxed' || car.congestionLevel === 'normal')
      .slice(0, 2)
      .map(car => car.carNumber);
  };

  // 가장 혼잡한 칸 찾기
  const getCrowdedCars = (cars: CarData[]): number[] => {
    return cars
      .filter(car => car.congestionLevel === 'crowded')
      .map(car => car.carNumber);
  };

  const getSelectedCarData = (): CarData | null => {
    if (!selectedCar) return null;
    const train = trains[selectedCar.direction]?.find((t) => t.trainId === selectedCar.trainId);
    return train?.cars.find((c) => c.carNumber === selectedCar.carNumber) || null;
  };

  const selectedCarData = getSelectedCarData();

  // 이전역/현재역/다음역 계산
  const prevStation = nearbyStations.length >= 3 && selectedStationIndex > 0 
    ? nearbyStations[selectedStationIndex - 1] 
    : nearbyStations.length >= 2 && selectedStationIndex === 1
      ? nearbyStations[0]
      : null;
  const nextStation = nearbyStations.length >= 3 && selectedStationIndex < nearbyStations.length - 1
    ? nearbyStations[selectedStationIndex + 1]
    : nearbyStations.length >= 2 && selectedStationIndex === 0
      ? nearbyStations[1]
      : null;

  const renderTrain = (dir: 'up' | 'down', trainIndex: number) => {
    const trainList = trains[dir] || [];
    const currentTrain = trainList[trainIndex];
    const isReversed = dir === 'down';
    const displayCars = isReversed ? [...currentTrain.cars].reverse() : currentTrain.cars;
    const recommendedCars = getRecommendedCars(currentTrain.cars);
    const crowdedCars = getCrowdedCars(currentTrain.cars);
    const trainKey = `${dir}-${trainIndex}`;
    const isExpanded = expandedNextTrain[trainKey] || false;

    if (!currentTrain) return null;

    const destinationName = dir === 'up' 
      ? (upDirectionName || '광운대행')
      : (downDirectionName || '서동탄행');
    
    const etaText = trainIndex === 0 
      ? '도착' 
      : `${trainIndex + 1}분 후`;

    return (
      <div className="mb-6">
        {/* 지하철 열차 UI */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* 왼쪽: 지하철 머리 부분 */}
            <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
              {/* 진행 방향 화살표 (애니메이션) */}
              {dir === 'up' ? (
                <div className="relative">
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400 animate-pulse" />
                  <div className="absolute inset-0 animate-ping">
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 opacity-20" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400 animate-pulse" />
                  <div className="absolute inset-0 animate-ping">
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 opacity-20" />
                  </div>
                </div>
              )}
              
              {/* 지하철 머리 아이콘 */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-800 dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-md">
                <Train className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              
              {/* 방향 정보 */}
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                  {dir === 'up' ? '상행' : '하행'} {destinationName}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {trainIndex + 1}번째 열차 · {etaText}
                </div>
              </div>
            </div>

            {/* 오른쪽: 칸 카드들 (가로 배치) */}
            <div className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-2 hide-scrollbar">
              {displayCars.map((car, index) => {
                const isSelected = selectedCar?.trainId === currentTrain.trainId && 
                                  selectedCar?.carNumber === car.carNumber && 
                                  selectedCar?.direction === dir;
                const isRecommended = recommendedCars.includes(car.carNumber);
                const isCrowded = crowdedCars.includes(car.carNumber);
                const color = CONGESTION_COLORS[car.congestionLevel];
                const isFirst = index === 0;
                const isLast = index === displayCars.length - 1;
                const displayCarNum = isReversed ? 11 - car.carNumber : car.carNumber;

                return (
                  <div
                    key={car.carNumber}
                    className={`relative flex-shrink-0 flex flex-col items-center cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation animate-train-move ${
                      isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                    } ${isRecommended ? 'ring-2 ring-green-500 ring-offset-1 shadow-lg z-10' : ''}`}
                    onClick={() => handleCarClick(currentTrain.trainId, car.carNumber, dir)}
                  >
                    {/* 추천 배지 */}
                    {isRecommended && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-10 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        추천
                      </div>
                    )}

                    {/* 경고 아이콘 */}
                    {isCrowded && (
                      <div className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-0.5 shadow-md z-10">
                        <AlertTriangle className="w-3 h-3" />
                      </div>
                    )}

                    {/* 칸 카드 */}
                    <div
                      className={`w-12 h-20 sm:w-14 sm:h-24 rounded-lg flex flex-col items-center justify-between transition-all border-2 ${
                        isFirst ? 'rounded-l-2xl' : ''
                      } ${isLast ? 'rounded-r-2xl' : ''} ${
                        isSelected ? 'ring-2 ring-blue-400' : ''
                      } ${isRecommended ? 'border-green-500' : 'border-transparent'}`}
                      style={{
                        backgroundColor: color.bg,
                      }}
                    >
                      {/* 상단: 칸 번호 */}
                      <div className="flex-1 flex items-center justify-center pt-2">
                        <span 
                          className="text-base sm:text-lg font-bold"
                          style={{ color: color.text }}
                        >
                          {displayCarNum}칸
                        </span>
                      </div>
                      
                      {/* 하단: 혼잡도 레벨 */}
                      <div className="w-full pb-1">
                        <span 
                          className="text-[10px] sm:text-xs font-medium block text-center"
                          style={{ color: color.text }}
                        >
                          {color.label}
                        </span>
                        {/* 하단 색 바 */}
                        <div
                          className={`h-1 w-full ${isFirst ? 'rounded-bl-2xl' : ''} ${isLast ? 'rounded-br-2xl' : ''}`}
                          style={{ backgroundColor: color.bar }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 다음 열차 아코디언 */}
        {trainIndex === 0 && trainList.length > 1 && (
          <div className="mt-4">
            <button
              onClick={() => setExpandedNextTrain(prev => ({
                ...prev,
                [trainKey]: !prev[trainKey]
              }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Train className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {trainIndex + 2}번째 열차 · {trainIndex + 2}분 후 도착
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {/* 다음 열차 내용 */}
            {isExpanded && (
              <div className="mt-3">
                {renderTrain(dir, trainIndex + 1)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">열차 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#f5f7fb] dark:bg-gray-900">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center flex-1">
              열차 칸별 혼잡도
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>

          {/* 3분할 탭 (이전역/현재역/다음역) */}
          <div className="flex gap-2 mb-4">
            {/* 이전역 */}
            {prevStation ? (
              <button
                onClick={() => handleStationClick(prevStation)}
                className="flex-1 px-4 py-3 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {prevStation}
              </button>
            ) : (
              <div className="flex-1 px-4 py-3 rounded-full text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900/50">
                -
              </div>
            )}

            {/* 현재역 (강조) */}
            <div className="flex-1 px-4 py-3 rounded-full text-sm font-bold text-white bg-blue-500 dark:bg-blue-600 shadow-md">
              {stationName}
            </div>

            {/* 다음역 */}
            {nextStation ? (
              <button
                onClick={() => handleStationClick(nextStation)}
                className="flex-1 px-4 py-3 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {nextStation}
              </button>
            ) : (
              <div className="flex-1 px-4 py-3 rounded-full text-sm font-medium text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900/50">
                -
              </div>
            )}
          </div>

          {/* 한 줄 설명 */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
            시간표 도착시간 기준 예상 혼잡도입니다.
          </p>

          {/* 상행/하행 토글 */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            <button
              onClick={() => setSelectedDirection('up')}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedDirection === 'up'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              상행
            </button>
            <button
              onClick={() => setSelectedDirection('down')}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedDirection === 'down'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              하행
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="container mx-auto px-4 py-6 overflow-y-auto pb-24" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {renderTrain(selectedDirection, currentTrainIndex[selectedDirection] || 0)}
      </div>

      {/* 하단 고정 영역 - 선택된 칸 상세 정보 */}
      {selectedCarData && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-10 pb-safe">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="font-bold text-gray-900 dark:text-white">
                {selectedCar?.carNumber}칸
              </span>
              <span className="text-gray-400">·</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                혼잡도: {CONGESTION_COLORS[selectedCarData.congestionLevel].label}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600 dark:text-gray-400">
                예측 {selectedCarData.congestionPercent.toFixed(0)}%
              </span>
              <span className="text-gray-400">·</span>
              <span className={`font-semibold ${
                selectedCarData.recommendedBoarding 
                  ? 'text-green-600 dark:text-green-400' 
                  : selectedCarData.congestionLevel === 'crowded'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
              }`}>
                {selectedCarData.recommendedBoarding ? '추천: 이 칸 이용' : selectedCarData.congestionLevel === 'crowded' ? '추천: 다른 칸 이용' : '보통'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 하단 범례 (선택된 칸이 없을 때만) */}
      {!selectedCarData && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-10 pb-safe">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {Object.entries(CONGESTION_COLORS).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div 
                    className="w-5 h-4 rounded"
                    style={{ backgroundColor: color.bg }}
                  >
                    <div 
                      className="h-1 w-full rounded-b"
                      style={{ backgroundColor: color.bar }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {color.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
