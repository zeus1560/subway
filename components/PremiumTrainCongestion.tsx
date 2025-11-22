'use client';

import { useState, useEffect } from 'react';
import { Train, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, MapPin, Star } from 'lucide-react';

interface CarData {
  carNumber: number;
  congestion: '여유' | '보통' | '주의' | '혼잡';
  percentage: number;
  isMyCar?: boolean; // 사용자가 자주 이용하는 칸
  transferConvenient?: boolean; // 환승 편리
}

interface PredictionData {
  current: number;
  after5min: number;
  after10min: number;
}

interface PremiumTrainCongestionProps {
  stationName: string;
  lineNum: string;
  direction: 'up' | 'down';
  destinationName: string;
  cars: CarData[];
  userLocation?: string; // 예: '2번 출구'
  recommendedCar?: number;
  predictionData?: PredictionData;
  onCarClick?: (carNumber: number) => void;
  onFeedback?: (carNumber: number, emotion: 'happy' | 'neutral' | 'sad') => void;
}

const CONGESTION_COLORS = {
  '여유': {
    bg: '#dcfce7',
    text: '#166534',
    bar: '#22c55e',
  },
  '보통': {
    bg: '#fef9c3',
    text: '#854d0e',
    bar: '#eab308',
  },
  '주의': {
    bg: '#fed7aa',
    text: '#9a3412',
    bar: '#f97316',
  },
  '혼잡': {
    bg: '#fee2e2',
    text: '#991b1b',
    bar: '#ef4444',
  },
};

// 혼잡도 레벨 계산
const getCongestionLevel = (percentage: number): '여유' | '보통' | '주의' | '혼잡' => {
  if (percentage < 30) return '여유';
  if (percentage < 60) return '보통';
  if (percentage < 80) return '주의';
  return '혼잡';
};

// PredictionGraph 컴포넌트
function PredictionGraph({ data }: { data: PredictionData }) {
  const levels = [
    { value: data.current, label: '지금' },
    { value: data.after5min, label: '5분후' },
    { value: data.after10min, label: '10분후' },
  ];

  return (
    <div className="flex items-center gap-4 text-xs">
      {levels.map((level, index) => {
        const congestionLevel = getCongestionLevel(level.value);
        const color = CONGESTION_COLORS[congestionLevel];
        const filledDots = Math.ceil((level.value / 100) * 6);
        
        return (
          <div key={index} className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400 min-w-[50px]">{level.label}</span>
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < filledDots ? '' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{
                    backgroundColor: i < filledDots ? color.bar : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// UserFeedback 컴포넌트
function UserFeedback({ 
  onFeedback 
}: { 
  onFeedback?: (emotion: 'happy' | 'neutral' | 'sad') => void 
}) {
  const [selectedEmotion, setSelectedEmotion] = useState<'happy' | 'neutral' | 'sad' | null>(null);

  const handleClick = (emotion: 'happy' | 'neutral' | 'sad') => {
    setSelectedEmotion(emotion);
    if (onFeedback) {
      onFeedback(emotion);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 dark:text-gray-400">이번 칸 어땠어요?</span>
      <div className="flex gap-2">
        {[
          { emoji: '😊', emotion: 'happy' as const },
          { emoji: '😐', emotion: 'neutral' as const },
          { emoji: '😫', emotion: 'sad' as const },
        ].map(({ emoji, emotion }) => (
          <button
            key={emotion}
            onClick={() => handleClick(emotion)}
            className={`text-2xl transition-all hover:scale-125 active:scale-95 ${
              selectedEmotion === emotion ? 'scale-125' : ''
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// TrainCar 컴포넌트
function TrainCar({
  car,
  isRecommended,
  isCrowded,
  isSelected,
  onClick,
  isFirst,
  isLast,
}: {
  car: CarData;
  isRecommended: boolean;
  isCrowded: boolean;
  isSelected: boolean;
  onClick: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const color = CONGESTION_COLORS[car.congestion];

  return (
    <div
      className={`relative flex-shrink-0 flex flex-col items-center cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''
      } ${isRecommended ? 'ring-2 ring-green-500 ring-offset-1 shadow-lg z-10' : ''} ${
        car.isMyCar ? 'ring-2 ring-yellow-400 ring-offset-1 z-10' : ''
      }`}
      onClick={onClick}
    >
      {/* MY 칸 배지 */}
      {car.isMyCar && (
        <div className="absolute -top-2 -left-2 bg-yellow-400 text-white rounded-full p-0.5 shadow-md z-10">
          <Star className="w-3 h-3 fill-white" />
        </div>
      )}

      {/* 추천 배지 */}
      {isRecommended && !car.isMyCar && (
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
        } ${isRecommended ? 'border-green-500' : car.isMyCar ? 'border-yellow-400' : 'border-transparent'}`}
        style={{
          backgroundColor: isRecommended ? '#e0f7e9' : color.bg,
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
            {car.congestion}
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
}

// TrainDirectionBlock 컴포넌트
function TrainDirectionBlock({
  stationName,
  lineNum,
  direction,
  destinationName,
  cars,
  userLocation,
  recommendedCar,
  predictionData,
  onCarClick,
  onFeedback,
}: PremiumTrainCongestionProps) {
  const [selectedCar, setSelectedCar] = useState<number | null>(null);
  const recommendedCars = recommendedCar ? [recommendedCar] : cars
    .filter(c => c.congestion === '여유' || c.congestion === '보통')
    .slice(0, 2)
    .map(c => c.carNumber);
  const crowdedCars = cars.filter(c => c.congestion === '혼잡').map(c => c.carNumber);
  
  const recommendedCarData = cars.find(c => recommendedCars.includes(c.carNumber));
  const myCar = cars.find(c => c.isMyCar);

  const handleCarClick = (carNumber: number) => {
    setSelectedCar(carNumber);
    if (onCarClick) {
      onCarClick(carNumber);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* 상단: 역명 및 방향 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🚉</span>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {stationName}역  |  {lineNum}호선 {direction === 'up' ? '상행' : '하행'}
          </h2>
        </div>
        <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          <span className="text-gray-400">{direction === 'up' ? '<' : ''}</span>{' '}
          <span className="text-gray-900 dark:text-white">{destinationName} 도착 중</span>
          {' '}<span className="text-gray-400">{direction === 'down' ? '>' : ''}</span>
        </div>
      </div>

      {/* 열차 UI */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4">
        {/* 왼쪽: 지하철 머리 부분 */}
        <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
          {/* 진행 방향 화살표 */}
          {direction === 'up' ? (
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
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 dark:bg-blue-700 rounded-xl flex items-center justify-center shadow-md">
            <Train className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
        </div>

        {/* 오른쪽: 칸 카드들 (가로 배치, 애니메이션) */}
        <div className="flex-1 flex items-center gap-0.5 sm:gap-1 overflow-x-auto pb-2 hide-scrollbar animate-train-slide">
          {cars.map((car, index) => {
            const isFirst = index === 0;
            const isLast = index === cars.length - 1;
            const isRecommended = recommendedCars.includes(car.carNumber);
            const isCrowded = crowdedCars.includes(car.carNumber);

            return (
              <TrainCar
                key={car.carNumber}
                car={car}
                isRecommended={isRecommended}
                isCrowded={isCrowded}
                isSelected={selectedCar === car.carNumber}
                onClick={() => handleCarClick(car.carNumber)}
                isFirst={isFirst}
                isLast={isLast}
              />
            );
          })}
        </div>
      </div>

      {/* 레일 라인 */}
      <div className="h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full mb-4" />

      {/* 추천 문구 */}
      {recommendedCarData && (
        <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">추천:</span>
            <span className="font-bold text-green-600 dark:text-green-400">
              {recommendedCars.map(n => `${n}칸`).join(', ')}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              ({recommendedCarData.congestion}
              {recommendedCarData.transferConvenient ? ', 환승 편리' : ''})
            </span>
          </div>
        </div>
      )}
      
      {/* 구분선 */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />

      {/* 위치 기반 안내 */}
      {userLocation && recommendedCarData && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-700 dark:text-gray-300">
              내 위치: {userLocation}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              ({recommendedCars[0]}칸까지 1분 거리)
            </span>
          </div>
        </div>
      )}
      
      {/* 구분선 */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />

      {/* 시간대별 예측 */}
      {predictionData && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
            시간대별 예측
          </div>
          <PredictionGraph data={predictionData} />
        </div>
      )}
      
      {/* 구분선 */}
      <div className="h-px bg-gray-200 dark:bg-gray-700 my-4" />

      {/* 감정 피드백 */}
      <div className="pt-3">
        <UserFeedback 
          onFeedback={(emotion) => {
            if (selectedCar && onFeedback) {
              onFeedback(selectedCar, emotion);
            }
          }}
        />
      </div>
    </div>
  );
}

// Main Component
export default function PremiumTrainCongestion({
  stationName,
  lineNum,
  direction,
  destinationName,
  cars,
  userLocation,
  recommendedCar,
  predictionData,
  onCarClick,
  onFeedback,
}: PremiumTrainCongestionProps) {
  return (
    <div className="w-full bg-[#f9fafb] dark:bg-gray-900 rounded-2xl p-4 sm:p-6">
      <TrainDirectionBlock
        stationName={stationName}
        lineNum={lineNum}
        direction={direction}
        destinationName={destinationName}
        cars={cars}
        userLocation={userLocation}
        recommendedCar={recommendedCar}
        predictionData={predictionData}
        onCarClick={onCarClick}
        onFeedback={onFeedback}
      />
    </div>
  );
}

