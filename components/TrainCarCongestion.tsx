'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Train, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

export type CarCongestion = {
  carNumber: number;
  level: "여유" | "보통" | "주의" | "혼잡";
  percentage?: number; // 혼잡도 퍼센트 (0-100)
};

export type DirectionCongestion = {
  label: string;        // "용산 방향 광운대행"
  direction: "상행" | "하행"; // 방향
  etaText: string;      // "도착", "3분 후" 등
  cars: CarCongestion[];
  trainNumber?: number; // 열차 번호 (예: 1번째 열차)
};

export interface TrainCongestionProps {
  currentStation: string;              // "노량진"
  lineNumber?: string;                 // "2" (노선 번호)
  directions: DirectionCongestion[];   // 상행/하행 2개
  nearbyStations?: string[];          // ["용산", "노량진", "대방"]
  onStationChange?: (station: string) => void;
  onNextTrain?: (directionIndex: number) => void;
  onPrevTrain?: (directionIndex: number) => void;
}

// 혼잡도별 색상 정의
const CONGESTION_COLORS = {
  여유: {
    bg: '#dcfce7', // green-100
    text: '#166534', // green-800
    bar: '#22c55e', // green-500
    label: '여유',
  },
  보통: {
    bg: '#fef9c3', // yellow-100
    text: '#854d0e', // yellow-800
    bar: '#eab308', // yellow-500
    label: '보통',
  },
  주의: {
    bg: '#fed7aa', // orange-100
    text: '#9a3412', // orange-800
    bar: '#f97316', // orange-500
    label: '주의',
  },
  혼잡: {
    bg: '#fee2e2', // red-100
    text: '#991b1b', // red-800
    bar: '#ef4444', // red-500
    label: '혼잡',
  },
};

// 혼잡도 퍼센트 계산 (없으면 기본값)
const getCongestionPercentage = (level: string, carNumber: number): number => {
  const basePercentages = {
    여유: 20 + (carNumber % 3) * 5,
    보통: 50 + (carNumber % 3) * 10,
    주의: 70 + (carNumber % 3) * 8,
    혼잡: 85 + (carNumber % 3) * 5,
  };
  return basePercentages[level as keyof typeof basePercentages] || 50;
};

export default function TrainCarCongestion({
  currentStation,
  lineNumber = '2',
  directions,
  nearbyStations = [],
  onStationChange,
  onNextTrain,
  onPrevTrain,
}: TrainCongestionProps) {
  const [selectedCar, setSelectedCar] = useState<{ directionIndex: number; carNumber: number } | null>(null);
  const [showLegendHelp, setShowLegendHelp] = useState(false);
  const [currentTrainIndex, setCurrentTrainIndex] = useState<number[]>(
    directions.map(() => 0)
  );
  const [selectedLine, setSelectedLine] = useState<string>(lineNumber);
  const [selectedDirection, setSelectedDirection] = useState<'상행' | '하행'>('상행');
  const [expandedNextTrain, setExpandedNextTrain] = useState<Record<number, boolean>>({});

  // 현재 역의 인덱스 찾기
  const currentStationIndex = nearbyStations.length >= 3
    ? nearbyStations.indexOf(currentStation)
    : nearbyStations.length === 2
      ? (nearbyStations[0] === currentStation ? 0 : 1)
      : 1;

  // 이전역/현재역/다음역 계산
  const prevStation = nearbyStations.length >= 3 && currentStationIndex > 0 
    ? nearbyStations[currentStationIndex - 1] 
    : nearbyStations.length >= 2 && currentStationIndex === 1
      ? nearbyStations[0]
      : null;
  const nextStation = nearbyStations.length >= 3 && currentStationIndex < nearbyStations.length - 1
    ? nearbyStations[currentStationIndex + 1]
    : nearbyStations.length >= 2 && currentStationIndex === 0
      ? nearbyStations[1]
      : null;

  const handleStationClick = (station: string) => {
    if (onStationChange && station !== currentStation) {
      onStationChange(station);
    }
  };

  const handleCarClick = (directionIndex: number, carNumber: number) => {
    if (selectedCar?.directionIndex === directionIndex && selectedCar?.carNumber === carNumber) {
      setSelectedCar(null);
    } else {
      setSelectedCar({ directionIndex, carNumber });
    }
  };

  const handleNextTrain = (directionIndex: number) => {
    if (onNextTrain) {
      onNextTrain(directionIndex);
    } else {
      setCurrentTrainIndex((prev) => {
        const newIndex = [...prev];
        newIndex[directionIndex] = (newIndex[directionIndex] || 0) + 1;
        return newIndex;
      });
    }
  };

  const handlePrevTrain = (directionIndex: number) => {
    if (onPrevTrain) {
      onPrevTrain(directionIndex);
    } else {
      setCurrentTrainIndex((prev) => {
        const newIndex = [...prev];
        newIndex[directionIndex] = Math.max(0, (newIndex[directionIndex] || 0) - 1);
        return newIndex;
      });
    }
  };

  // 가장 여유로운 칸 찾기 (상위 1-2개)
  const getRecommendedCars = (cars: CarCongestion[]): number[] => {
    const congestionOrder = { 여유: 1, 보통: 2, 주의: 3, 혼잡: 4 };
    const sorted = [...cars].sort((a, b) => {
      const orderA = congestionOrder[a.level];
      const orderB = congestionOrder[b.level];
      if (orderA !== orderB) return orderA - orderB;
      const percentA = a.percentage || getCongestionPercentage(a.level, a.carNumber);
      const percentB = b.percentage || getCongestionPercentage(b.level, b.carNumber);
      return percentA - percentB;
    });
    
    const recommended = sorted
      .filter(car => car.level === '여유' || car.level === '보통')
      .slice(0, 2)
      .map(car => car.carNumber);
    
    return recommended;
  };

  // 가장 혼잡한 칸 찾기
  const getCrowdedCars = (cars: CarCongestion[]): number[] => {
    return cars
      .filter(car => car.level === '혼잡')
      .map(car => car.carNumber);
  };

  // 필터링된 방향 목록
  const filteredDirections = directions.filter(dir => dir.direction === selectedDirection);

  // 열차 렌더링 함수
  const renderTrain = (direction: DirectionCongestion, directionIndex: number, trainIndex: number) => {
    const trainNumber = direction.trainNumber || (trainIndex + 1);
    const recommendedCars = getRecommendedCars(direction.cars);
    const crowdedCars = getCrowdedCars(direction.cars);
    const isReversed = direction.direction === '하행'; // 하행은 역순 표시
    const displayCars = isReversed ? [...direction.cars].reverse() : direction.cars;

    return (
      <div className="mb-6">
        {/* 지하철 열차 UI */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* 왼쪽: 지하철 머리 부분 */}
            <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
              {/* 진행 방향 화살표 (애니메이션) */}
              {direction.direction === '상행' ? (
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
                  {direction.label}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {direction.etaText}
                </div>
              </div>
            </div>

            {/* 오른쪽: 칸 카드들 (가로 배치) */}
            <div className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-2 hide-scrollbar">
              {displayCars.map((car, index) => {
                const isSelected = selectedCar?.directionIndex === directionIndex && 
                                  selectedCar?.carNumber === car.carNumber;
                const isRecommended = recommendedCars.includes(car.carNumber);
                const isCrowded = crowdedCars.includes(car.carNumber);
                const color = CONGESTION_COLORS[car.level];
                const percentage = car.percentage || getCongestionPercentage(car.level, car.carNumber);
                const isFirst = index === 0;
                const isLast = index === displayCars.length - 1;

                return (
                  <div
                    key={car.carNumber}
                    className={`relative flex-shrink-0 flex flex-col items-center cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation animate-train-move ${
                      isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
                    } ${isRecommended ? 'ring-2 ring-green-500 ring-offset-1 shadow-lg z-10' : ''}`}
                    onClick={() => handleCarClick(directionIndex, car.carNumber)}
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
                          {car.carNumber}칸
                        </span>
                      </div>
                      
                      {/* 하단: 혼잡도 레벨 */}
                      <div className="w-full pb-1">
                        <span 
                          className="text-[10px] sm:text-xs font-medium block text-center"
                          style={{ color: color.text }}
                        >
                          {car.level}
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
      </div>
    );
  };

  const renderDirectionBlock = (direction: DirectionCongestion, directionIndex: number) => {
    const currentIndex = currentTrainIndex[directionIndex] || 0;
    const canGoNext = currentIndex < 2;
    const isExpanded = expandedNextTrain[directionIndex] || false;

    return (
      <div className="mb-8">
        {/* 현재 열차 */}
        {renderTrain(direction, directionIndex, currentIndex)}

        {/* 다음 열차 아코디언 */}
        {canGoNext && (
          <div className="mt-4">
            <button
              onClick={() => setExpandedNextTrain(prev => ({
                ...prev,
                [directionIndex]: !prev[directionIndex]
              }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Train className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {direction.trainNumber ? (direction.trainNumber + 1) : 2}번째 열차 · {direction.etaText.includes('도착') ? '3분 후 도착' : '다음 열차'}
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
                {renderTrain(direction, directionIndex, currentIndex + 1)}
              </div>
            )}
          </div>
        )}

        {/* 선택된 칸 정보 박스 (하단 고정 영역) */}
        {selectedCar?.directionIndex === directionIndex && selectedCar && (
          <div className="mt-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            {(() => {
              const selectedCarData = direction.cars.find(c => c.carNumber === selectedCar.carNumber);
              if (!selectedCarData) return null;
              const percentage = selectedCarData.percentage || getCongestionPercentage(selectedCarData.level, selectedCarData.carNumber);
              const isRecommended = getRecommendedCars(direction.cars).includes(selectedCar.carNumber);
              const isCrowded = getCrowdedCars(direction.cars).includes(selectedCar.carNumber);
              
              return (
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedCar.carNumber}칸
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    혼잡도: {selectedCarData.level}
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    예측 {percentage}%
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className={`font-semibold ${
                    isRecommended 
                      ? 'text-green-600 dark:text-green-400' 
                      : isCrowded 
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {isRecommended ? '추천: 이 칸 이용' : isCrowded ? '추천: 다른 칸 이용' : '보통'}
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-[#f5f7fb] dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
      {/* 상단 역/방향 영역 */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4">
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
            {currentStation}
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
            onClick={() => setSelectedDirection('상행')}
            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedDirection === '상행'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            상행
          </button>
          <button
            onClick={() => setSelectedDirection('하행')}
            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedDirection === '하행'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            하행
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="px-4 sm:px-6 py-6">
        {filteredDirections.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            선택한 방향의 열차 정보가 없습니다.
          </div>
        ) : (
          filteredDirections.map((direction, index) => {
            const directionIndex = directions.findIndex(d => d === direction);
            return (
              <div key={index}>
                {renderDirectionBlock(direction, directionIndex)}
                {index < filteredDirections.length - 1 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 my-8"></div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 하단 범례 */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* 색상 범례 */}
          <div className="flex items-center gap-3 flex-wrap">
            {Object.entries(CONGESTION_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center gap-1.5">
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

          {/* 도움말 아이콘 */}
          <div className="relative">
            <button
              onClick={() => setShowLegendHelp(!showLegendHelp)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="도움말"
            >
              <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            {/* 도움말 툴팁 */}
            {showLegendHelp && (
              <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg z-20">
                시간표 도착 기준 예상 혼잡도입니다.
                <div className="absolute top-full right-4 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
