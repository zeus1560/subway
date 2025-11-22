'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Train, ArrowUp, ArrowDown, ChevronRight, ChevronLeft, X, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, MapPin, Star, Sparkles, Clock, TrendingUp } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { getLineColor } from '@/lib/utils';
import { analyzeUserPattern } from '@/lib/personalizationService';
import { getCurrentUser } from '@/lib/authService';
import { getFavoriteStations } from '@/lib/storage';
import { getStationsByLine, type LineId } from '@/lib/subwayMapData';
import { random } from '@/lib/random';

// 각 호선의 모든 역 목록 (subwayMapData에서 동적으로 생성)
const getLineStations = (): Record<string, Array<{ name: string; lineNum: string }>> => {
  const lineStations: Record<string, Array<{ name: string; lineNum: string }>> = {};
  
  (['1', '2', '3', '4', '5', '6', '7', '8', '9'] as LineId[]).forEach((lineId) => {
    const stations = getStationsByLine(lineId);
    // 역 이름 기준으로 중복 제거
    const uniqueStationsMap = new Map<string, { name: string; lineNum: string }>();
    
    stations.forEach(station => {
      if (!uniqueStationsMap.has(station.name)) {
        uniqueStationsMap.set(station.name, {
          name: station.name,
          lineNum: lineId,
        });
      }
    });
    
    lineStations[lineId] = Array.from(uniqueStationsMap.values());
  });
  
  return lineStations;
};

const LINE_STATIONS = getLineStations();

// 혼잡도 색상 맵
const CONGESTION_COLORS = {
  '여유': {
    bg: '#f0fdf4', // 매우 연한 초록
    text: '#166534', // green-800
    bar: '#22c55e', // green-500
    description: '좌석에 앉을 수 있고, 여유롭게 이동 가능',
  },
  '보통': {
    bg: '#fffbeb', // 매우 연한 노랑
    text: '#854d0e', // yellow-800
    bar: '#eab308', // yellow-500
    description: '서서 이동 가능하며, 약간의 혼잡함',
  },
  '주의': {
    bg: '#fff7ed', // 매우 연한 주황
    text: '#9a3412', // orange-800
    bar: '#f97316', // orange-500
    description: '이동이 다소 불편하며, 좁은 공간',
  },
  '혼잡': {
    bg: '#fef2f2', // 매우 연한 빨강
    text: '#991b1b', // red-800
    bar: '#ef4444', // red-500
    description: '매우 혼잡하며, 이동이 어려움',
  },
};

// AI 최적 탑승 칸 추천 (여유 칸, 환승 유리 칸 등 종합 고려)
function getAIRecommendedCars(
  cars: Array<{ carNumber: number; congestion: string; percentage: number; transferConvenient?: boolean; aiScore?: number }>,
  userPreferences?: { preferTransfer?: boolean; preferComfort?: boolean }
): number[] {
  // AI 점수 기준으로 정렬 (낮을수록 좋음)
  const sorted = [...cars].sort((a, b) => {
    const scoreA = a.aiScore || (a.congestion === '여유' ? 1 : a.congestion === '보통' ? 2 : a.congestion === '주의' ? 3 : 4);
    const scoreB = b.aiScore || (b.congestion === '여유' ? 1 : b.congestion === '보통' ? 2 : b.congestion === '주의' ? 3 : 4);
    
    // 사용자 선호도 반영
    if (userPreferences?.preferTransfer) {
      const transferBonusA = a.transferConvenient ? -0.5 : 0;
      const transferBonusB = b.transferConvenient ? -0.5 : 0;
      return (scoreA + transferBonusA) - (scoreB + transferBonusB);
    }
    
    if (userPreferences?.preferComfort) {
      return scoreA - scoreB;
    }
    
    return scoreA - scoreB;
  });
  
  // 상위 2-3개 추천
  return sorted
    .filter(car => car.congestion === '여유' || car.congestion === '보통')
    .slice(0, 3)
    .map(car => car.carNumber);
}

export default function LinesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedLine, setSelectedLine] = useState<string>('1');
  const [selectedStation, setSelectedStation] = useState<{ name: string; lineNum: string } | null>(null);
  const [direction, setDirection] = useState<'UP' | 'DOWN'>('UP');
  const [selectedCar, setSelectedCar] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTrainIndex, setCurrentTrainIndex] = useState(0);
  const [expandedNextTrain, setExpandedNextTrain] = useState(false);
  // API에서 받은 상·하행 데이터를 저장할 상태
  const [allCarData, setAllCarData] = useState<{
    up: Array<{
      carNumber: number;
      congestion: string;
      color: string;
      passengers: number;
      recommendation: string;
      percentage: number;
      transferConvenient?: boolean;
      aiScore?: number;
      direction: 'UP' | 'DOWN';
      line: string;
      baseStation?: string;
    }>;
    down: Array<{
      carNumber: number;
      congestion: string;
      color: string;
      passengers: number;
      recommendation: string;
      percentage: number;
      transferConvenient?: boolean;
      aiScore?: number;
      direction: 'UP' | 'DOWN';
      line: string;
      baseStation?: string;
    }>;
  }>({ up: [], down: [] });
  const [nextTrainDataUp, setNextTrainDataUp] = useState<Array<{
    carNumber: number;
    congestion: string;
    color: string;
    passengers: number;
    recommendation: string;
    percentage: number;
    transferConvenient?: boolean;
    aiScore?: number;
    direction: 'UP' | 'DOWN';
    line: string;
    baseStation?: string;
  }>>([]);
  const [nextTrainDataDown, setNextTrainDataDown] = useState<Array<{
    carNumber: number;
    congestion: string;
    color: string;
    passengers: number;
    recommendation: string;
    percentage: number;
    transferConvenient?: boolean;
    aiScore?: number;
    direction: 'UP' | 'DOWN';
    line: string;
    baseStation?: string;
  }>>([]);
  const [hoveredCongestion, setHoveredCongestion] = useState<string | null>(null);
  const [userPattern, setUserPattern] = useState<any>(null);
  const [favoriteStations, setFavoriteStations] = useState<any[]>([]);
  const [recommendedStations, setRecommendedStations] = useState<Array<{ name: string; lineNum: string; reason: string }>>([]);
  const [arrivalTimes, setArrivalTimes] = useState<{ up: number; down: number }>({ up: 2, down: 4 });

  // 로그인 상태 업데이트 함수
  const updateUserState = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  };

  // 사용자 패턴 및 즐겨찾기 로드
  useEffect(() => {
    setMounted(true);
    updateUserState();
    
    // 로그인 상태 변경 이벤트 리스너 추가
    const handleAuthStateChanged = () => {
      updateUserState();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-state-changed', handleAuthStateChanged);
      window.addEventListener('storage', handleAuthStateChanged);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-state-changed', handleAuthStateChanged);
        window.removeEventListener('storage', handleAuthStateChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      const pattern = analyzeUserPattern(user.id);
      setUserPattern(pattern);
      
      // 자주 이용하는 역 기반 추천 역 목록 생성
      const frequentStations = pattern.frequentStations.map(s => ({
        name: s.station,
        lineNum: s.line,
        reason: `자주 이용 (${s.count}회)`,
      }));
      
      const favorites = getFavoriteStations();
      setFavoriteStations(favorites);
      
      const favoriteStationsList = favorites.map(f => ({
        name: f.stationName,
        lineNum: f.lineNum,
        reason: '즐겨찾기',
      }));
      
      // 추천 역 목록 (중복 제거)
      const allRecommended = [...frequentStations, ...favoriteStationsList];
      const uniqueRecommended = Array.from(
        new Map(allRecommended.map(item => [`${item.name}_${item.lineNum}`, item])).values()
      );
      setRecommendedStations(uniqueRecommended.slice(0, 5));
      
      // 가장 자주 이용하는 노선으로 초기 설정
      if (pattern.frequentStations.length > 0) {
        const mostFrequentLine = pattern.frequentStations[0].line;
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(mostFrequentLine)) {
          setSelectedLine(mostFrequentLine);
          
          // 가장 자주 이용하는 역으로 초기 설정
          const mostFrequentStation = pattern.frequentStations[0];
          setSelectedStation({
            name: mostFrequentStation.station,
            lineNum: mostFrequentStation.line,
          });
        }
      } else if (favorites.length > 0) {
        // 즐겨찾기 역이 있으면 첫 번째로 설정
        setSelectedStation({
          name: favorites[0].stationName,
          lineNum: favorites[0].lineNum,
        });
        setSelectedLine(favorites[0].lineNum);
      }
    } else {
      // 비로그인 사용자는 기본 역 설정
      const defaultStation = LINE_STATIONS[selectedLine]?.[0];
      if (defaultStation) {
        setSelectedStation(defaultStation);
      }
    }
    // loadCarData는 useEffect에서 selectedStation과 direction 변경 시 자동 호출됨
  }, []);

  // API 응답을 기존 형식으로 변환하는 헬퍼 함수
  const transformCarData = (
    cars: Array<{ carNo: number; congestionLevel: string; value: number }>,
    direction: 'UP' | 'DOWN',
    stationName: string,
    lineNum: string
  ) => {
    return cars.map((car) => {
      const congestion = car.congestionLevel;
      const color = CONGESTION_COLORS[congestion as keyof typeof CONGESTION_COLORS]?.bar || '#6b7280';
      const percentage = car.value;
      
      // AI 추천 점수 계산
      const congestionScore = congestion === '여유' ? 1 : congestion === '보통' ? 2 : congestion === '주의' ? 3 : 4;
      const transferScore = (car.carNo === 3 || car.carNo === 8) ? 0.5 : 1;
      const aiScore = congestionScore + transferScore;
      
      let recommendation = '보통';
      if (congestion === '여유') {
        recommendation = '추천 탑승';
      } else if (congestion === '보통') {
        recommendation = '가능';
      } else if (congestion === '주의') {
        recommendation = '주의';
      } else {
        recommendation = '비추천';
      }
      
      return {
        carNumber: car.carNo,
        congestion,
        color,
        passengers: percentage * 10, // value를 승객 수로 변환
        recommendation,
        percentage,
        transferConvenient: car.carNo === 3 || car.carNo === 8,
        aiScore,
        direction,
        line: lineNum,
        baseStation: stationName,
      };
    });
  };

  // API에서 열차 칸별 혼잡도 데이터 로드 (상·하행 모두)
  const loadCarData = useCallback(async () => {
    if (!selectedStation) {
      setAllCarData({ up: [], down: [] });
      return;
    }
    
    setLoading(true);
    try {
      const stationName = selectedStation.name;
      const lineNum = selectedStation.lineNum;
      
      // 상·하행 모두 API 호출
      const [upResponse, downResponse] = await Promise.all([
        fetch(
          `/api/train/congestion?line=${encodeURIComponent(lineNum)}&station=${encodeURIComponent(stationName)}&direction=UP`
        ),
        fetch(
          `/api/train/congestion?line=${encodeURIComponent(lineNum)}&station=${encodeURIComponent(stationName)}&direction=DOWN`
        ),
      ]);
      
      if (!upResponse.ok || !downResponse.ok) {
        throw new Error(`API 호출 실패: ${upResponse.status} / ${downResponse.status}`);
      }
      
      const [upResult, downResult] = await Promise.all([
        upResponse.json(),
        downResponse.json(),
      ]);
      
      if (!upResult.success || !upResult.data?.cars || !downResult.success || !downResult.data?.cars) {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }
      
      // 상·하행 데이터 변환
      const transformedUp = transformCarData(upResult.data.cars, 'UP', stationName, lineNum);
      const transformedDown = transformCarData(downResult.data.cars, 'DOWN', stationName, lineNum);
      
      setAllCarData({
        up: transformedUp,
        down: transformedDown,
      });
      
      // 다음 열차 데이터 API 호출
      const [nextUpResponse, nextDownResponse] = await Promise.all([
        fetch(
          `/api/train/congestion?line=${encodeURIComponent(lineNum)}&station=${encodeURIComponent(stationName)}&direction=UP&next=true`
        ).catch(() => null),
        fetch(
          `/api/train/congestion?line=${encodeURIComponent(lineNum)}&station=${encodeURIComponent(stationName)}&direction=DOWN&next=true`
        ).catch(() => null),
      ]);
      
      // 다음 열차 데이터 처리
      let nextUpData: any[] = [];
      let nextDownData: any[] = [];
      
      if (nextUpResponse && nextUpResponse.ok) {
        try {
          const nextUpResult = await nextUpResponse.json();
          if (nextUpResult.success && nextUpResult.data?.cars) {
            nextUpData = transformCarData(nextUpResult.data.cars, 'UP', stationName, lineNum);
          }
        } catch (err) {
          console.error('다음 열차 상행 데이터 파싱 실패:', err);
        }
      }
      
      if (nextDownResponse && nextDownResponse.ok) {
        try {
          const nextDownResult = await nextDownResponse.json();
          if (nextDownResult.success && nextDownResult.data?.cars) {
            nextDownData = transformCarData(nextDownResult.data.cars, 'DOWN', stationName, lineNum);
          }
        } catch (err) {
          console.error('다음 열차 하행 데이터 파싱 실패:', err);
        }
      }
      
      setNextTrainDataUp(nextUpData);
      setNextTrainDataDown(nextDownData);
      
      // 예상 도착 시각 계산 (모의 데이터)
      const stationContext = selectedStation || 'default';
      setArrivalTimes({
        up: random.contextRandomInt(`arrival-${stationContext}-up`, 2, 4), // 2-4분
        down: random.contextRandomInt(`arrival-${stationContext}-down`, 3, 5), // 3-5분
      });
    } catch (error) {
      console.error('칸별 혼잡도 데이터 로드 실패:', error);
      setAllCarData({ up: [], down: [] });
    } finally {
      setLoading(false);
    }
  }, [selectedStation]);

  useEffect(() => {
    loadCarData();
  }, [loadCarData]);

  const handleCarClick = (carNumber: number) => {
    setSelectedCar(selectedCar === carNumber ? null : carNumber);
  };

  const handleNextTrain = () => {
    setExpandedNextTrain(!expandedNextTrain);
  };

  const handleStationSelect = (station: { name: string; lineNum: string }) => {
    setSelectedStation(station);
    setSelectedLine(station.lineNum);
  };

  // 상·하행 혼잡도 데이터를 useMemo로 계산하여 구조 분해 할당
  const { up: carDataUp, down: carDataDown } = useMemo(() => {
    return {
      up: allCarData.up,
      down: allCarData.down,
    };
  }, [allCarData]);

  // 현재 선택된 방향의 데이터
  const currentCarData = useMemo(() => {
    return direction === 'UP' ? carDataUp : carDataDown;
  }, [direction, carDataUp, carDataDown]);
  
  // 다음 열차 데이터 (현재는 빈 배열, 필요시 API 호출 추가)
  const currentNextTrainData = useMemo(() => {
    return direction === 'UP' ? nextTrainDataUp : nextTrainDataDown;
  }, [direction, nextTrainDataUp, nextTrainDataDown]);

  // AI 추천 칸 (사용자 선호도 반영)
  const userPreferences = useMemo(() => {
    if (!userPattern) return undefined;
    
    // 사용자 패턴 분석: 환승을 자주 하는지, 여유로운 칸을 선호하는지
    const commuteRoutes = userPattern.commuteRoutes || [];
    const preferTransfer = commuteRoutes.length > 0; // 환승 경로가 있으면 환승 선호
    const preferComfort = true; // 기본적으로 편안함 선호
    
    return { preferTransfer, preferComfort };
  }, [userPattern]);

  // 가장 여유로운 칸 찾기 (기본 추천)
  const getRecommendedCars = (cars: typeof currentCarData): number[] => {
    const sorted = [...cars].sort((a, b) => {
      const orderA = a.congestion === '여유' ? 1 : a.congestion === '보통' ? 2 : a.congestion === '주의' ? 3 : 4;
      const orderB = b.congestion === '여유' ? 1 : b.congestion === '보통' ? 2 : b.congestion === '주의' ? 3 : 4;
      if (orderA !== orderB) return orderA - orderB;
      return a.percentage - b.percentage;
    });
    
    return sorted
      .filter(car => car.congestion === '여유' || car.congestion === '보통')
      .slice(0, 2)
      .map(car => car.carNumber);
  };

  // AI 최적 탑승 칸 추천
  const aiRecommendedCars = useMemo(() => {
    return getAIRecommendedCars(currentCarData, userPreferences);
  }, [currentCarData, userPreferences]);

  // AI 추천 이유 (useMemo 내부에서 조건부 로직 처리)
  const aiRecommendedReason = useMemo(() => {
    // userPreferences가 없으면 기본값 반환
    if (!userPreferences) {
      return '여유로운 칸';
    }
    
    // preferTransfer가 true인 경우 환승 유리 칸 확인
    if (userPreferences.preferTransfer) {
      const transferCars = aiRecommendedCars.filter(car => 
        currentCarData.find(c => c.carNumber === car)?.transferConvenient
      );
      if (transferCars.length > 0) {
        return `환승 유리 + 여유로운 칸`;
      }
    }
    
    // 기본값 반환
    return '여유로운 칸';
  }, [aiRecommendedCars, currentCarData, userPreferences]);

  // 피해야 할 칸 찾기 (혼잡 칸)
  const getCrowdedCars = (cars: typeof currentCarData): number[] => {
    return cars
      .filter(car => car.congestion === '혼잡')
      .map(car => car.carNumber);
  };

  // 상·하행 혼잡도 요약
  const congestionSummary = useMemo(() => {
    const upRelaxed = carDataUp.filter(c => c.congestion === '여유' || c.congestion === '보통').length;
    const upCrowded = carDataUp.filter(c => c.congestion === '혼잡').length;
    const downRelaxed = carDataDown.filter(c => c.congestion === '여유' || c.congestion === '보통').length;
    const downCrowded = carDataDown.filter(c => c.congestion === '혼잡').length;
    
    return {
      up: { relaxed: upRelaxed, crowded: upCrowded },
      down: { relaxed: downRelaxed, crowded: downCrowded },
    };
  }, [carDataUp, carDataDown]);

  // early return은 모든 hooks 호출 후에만 실행
  if (!mounted) {
    return null;
  }

  // 목적지 이름 생성
  const destinationNames: Record<string, { up: string; down: string }> = {
    '1': { up: '광운대행', down: '서동탄행' },
    '2': { up: '성수행', down: '신정네거리행' },
    '3': { up: '대화행', down: '오금행' },
    '4': { up: '당고개행', down: '오이도행' },
    '5': { up: '방화행', down: '마천행' },
    '6': { up: '응암순환', down: '응암순환' },
    '7': { up: '장암행', down: '부평구청행' },
    '8': { up: '암사행', down: '모란행' },
    '9': { up: '개화행', down: '중앙보훈병원행' },
  };

  const destinationName = destinationNames[selectedLine]?.[direction.toLowerCase() as 'up' | 'down'] || '행';
  const directionText = direction === 'UP' ? '상행' : '하행';
  const trainNumber = currentTrainIndex + 1;

  // 추천/위험 칸 정보
  const recommendedCars = getRecommendedCars(currentCarData);
  const crowdedCars = getCrowdedCars(currentCarData);
  const recommendedCarsText = recommendedCars.map(n => `${n}칸`).join('·');
  const recommendedCarsCongestion = currentCarData.find(c => recommendedCars.includes(c.carNumber))?.congestion || '보통';
  const crowdedCarsText = crowdedCars.length > 0 
    ? `${crowdedCars.length === 1 ? crowdedCars[0] : `${crowdedCars[0]}~${crowdedCars[crowdedCars.length - 1]}`}칸`
    : '없음';

  // AI 추천 칸 정보
  const aiRecommendedCarsText = aiRecommendedCars.map(n => `${n}칸`).join('·');

  // 다음 열차 추천/위험 칸 정보
  const nextRecommendedCars = getRecommendedCars(currentNextTrainData);
  const nextCrowdedCars = getCrowdedCars(currentNextTrainData);
  const nextRecommendedCarsText = nextRecommendedCars.map(n => `${n}칸`).join('·');
  const nextRecommendedCarsCongestion = currentNextTrainData.find(c => nextRecommendedCars.includes(c.carNumber))?.congestion || '보통';
  const nextCrowdedCarsText = nextCrowdedCars.length > 0 
    ? `${nextCrowdedCars.length === 1 ? nextCrowdedCars[0] : `${nextCrowdedCars[0]}~${nextCrowdedCars[nextCrowdedCars.length - 1]}`}칸`
    : '없음';

  // 선택된 칸의 혼잡도 정보
  const selectedCarData = selectedCar ? currentCarData.find(c => c.carNumber === selectedCar) : null;

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-gray-900 pb-20">
      <style jsx>{`
        @keyframes train-arrival {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .train-arrival {
          animation: train-arrival 0.8s ease-out;
        }
        @keyframes pulse-strip {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .pulse-strip {
          animation: pulse-strip 2s ease-in-out infinite;
        }
      `}</style>

      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">열차 칸별 혼잡도</h1>
          
          {/* 노선 선택 탭 */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((line) => (
              <button
                key={line}
                onClick={() => setSelectedLine(line)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                  selectedLine === line
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
                style={
                  selectedLine === line
                    ? { backgroundColor: getLineColor(line) }
                    : {}
                }
              >
                {line}호선
              </button>
            ))}
          </div>

          {/* 역 선택 UI */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">기준역 선택</span>
            </div>
            
            {/* 추천 역 (즐겨찾기/자주 이용 역) */}
            {recommendedStations.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {recommendedStations.map((station) => (
                  <button
                    key={`${station.name}_${station.lineNum}`}
                    onClick={() => handleStationSelect(station)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedStation?.name === station.name && selectedStation?.lineNum === station.lineNum
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>{station.name}</span>
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">{station.reason}</div>
                  </button>
                ))}
              </div>
            )}
            
            {/* 전체 역 목록 (드롭다운 또는 스크롤) */}
            <div className="relative">
              <select
                value={selectedStation ? `${selectedStation.name}_${selectedStation.lineNum}` : ''}
                onChange={(e) => {
                  const [name, lineNum] = e.target.value.split('_');
                  if (name && lineNum) {
                    handleStationSelect({ name, lineNum });
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">역을 선택하세요</option>
                {LINE_STATIONS[selectedLine]?.filter((station, index, self) => 
                  index === self.findIndex(s => s.name === station.name)
                ).map((station) => (
                  <option key={`${station.name}_${station.lineNum}`} value={`${station.name}_${station.lineNum}`}>
                    {station.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 상행/하행 전환 버튼 */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setDirection('UP')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                direction === 'UP'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <ArrowUp className="w-4 h-4" />
              상행
            </button>
            <button
              onClick={() => setDirection('DOWN')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                direction === 'DOWN'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              하행
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-3">데이터를 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 대시보드 헤더 카드 - 기준역 및 현재 열차 정보 */}
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg border border-gray-100 p-5 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg bg-white/20"
                  >
                    {selectedLine}호선
                  </div>
                  <div>
                    <div className="text-lg font-bold mb-1">
                      {selectedStation?.name || '노량진'}역
                    </div>
                    <div className="text-sm opacity-90">
                      {directionText} · {trainNumber}번째 열차 · {arrivalTimes[direction.toLowerCase() as 'up' | 'down']}분 후 도착
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-75 mb-1">기준역</div>
                  <div className="text-sm font-semibold bg-white/20 px-2 py-1 rounded">
                    {selectedStation?.name || '노량진'}
                  </div>
                </div>
              </div>
              
              {/* AI 추천 칸 정보 */}
              <div className="pt-4 border-t border-white/20">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-semibold">AI 추천 탑승 칸: </span>
                  <span className="text-base font-bold bg-white/20 px-3 py-1 rounded-lg">{aiRecommendedCarsText}</span>
                  <span className="text-xs opacity-90">({aiRecommendedReason})</span>
                </div>
              </div>
            </div>

            {/* 상·하행 혼잡도 요약 카드 (그리드 레이아웃) */}
            <div className="grid grid-cols-2 gap-4">
              {/* 상행 요약 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">상행 혼잡도</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">도착 예상</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{arrivalTimes.up}분 후</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">여유</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {congestionSummary.up.relaxed}칸
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">혼잡</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {congestionSummary.up.crowded}칸
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 하행 요약 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">하행 혼잡도</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">도착 예상</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{arrivalTimes.down}분 후</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">여유</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {congestionSummary.down.relaxed}칸
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">혼잡</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {congestionSummary.down.crowded}칸
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 열차 칸별 혼잡도 카드 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {directionText} 열차 칸별 혼잡도
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {arrivalTimes[direction.toLowerCase() as 'up' | 'down']}분 후 도착
                </div>
              </div>
              
              {/* 열차 레이아웃 */}
              {currentCarData.length === 0 ? (
                <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <Train className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
                    칸별 혼잡도 데이터가 없습니다
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {selectedStation?.name || '역'}의 {directionText} 열차 데이터를 불러오는 중입니다.
                  </p>
                </div>
              ) : (
                <div className="relative mb-4 train-arrival">
                  {/* 열차 연결선 (상단) */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600" />
                  
                  {/* 칸 카드들 */}
                  <div className="flex items-end gap-2 pt-2 pb-1">
                    {currentCarData.map((car, index) => {
                    const isFirst = index === 0;
                    const isLast = index === currentCarData.length - 1;
                    const isRecommended = recommendedCars.includes(car.carNumber);
                    const isAIRecommended = aiRecommendedCars.includes(car.carNumber);
                    const isCrowded = crowdedCars.includes(car.carNumber);
                    const isSelected = selectedCar === car.carNumber;
                    const color = CONGESTION_COLORS[car.congestion as keyof typeof CONGESTION_COLORS];

                    return (
                      <div
                        key={car.carNumber}
                        className={`flex-1 flex flex-col items-center cursor-pointer transition-all hover:scale-105 active:scale-95 relative ${
                          isSelected ? 'z-10' : ''
                        } ${isAIRecommended ? 'z-10' : ''}`}
                        onClick={() => handleCarClick(car.carNumber)}
                      >
                        {/* AI 추천 배지 */}
                        {isAIRecommended && (
                          <div className="absolute -top-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-20 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI
                          </div>
                        )}

                        {/* 기본 추천 배지 */}
                        {isRecommended && !isAIRecommended && (
                          <div className="absolute -top-3 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-20 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            추천
                          </div>
                        )}

                        {/* 위험 아이콘 */}
                        {isCrowded && (
                          <div className="absolute -top-2 right-0 bg-red-500 text-white rounded-full p-0.5 shadow-md z-20">
                            <AlertTriangle className="w-3 h-3" />
                          </div>
                        )}

                        {/* 칸 카드 */}
                        <div
                          className={`w-full flex flex-col items-center justify-between rounded-lg border-2 transition-all ${
                            isFirst ? 'rounded-l-2xl' : ''
                          } ${isLast ? 'rounded-r-2xl' : ''} ${
                            isAIRecommended 
                              ? 'border-purple-500 shadow-lg ring-2 ring-purple-300' 
                              : isRecommended 
                              ? 'border-green-500 shadow-md' 
                              : isCrowded
                              ? 'border-red-300'
                              : 'border-transparent'
                          } ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                          style={{
                            backgroundColor: color.bg,
                            minHeight: '100px',
                          }}
                        >
                          {/* 상단 중앙: n칸 */}
                          <div className="flex-1 flex items-center justify-center pt-2">
                            <span className="font-bold text-gray-900 dark:text-white text-sm">
                              {car.carNumber}칸
                            </span>
                          </div>
                          
                          {/* 하단 중앙: 혼잡도 텍스트 */}
                          <div className="w-full pb-0">
                            <span 
                              className="text-[10px] font-medium block text-center mb-2"
                              style={{ color: color.text }}
                            >
                              {car.congestion}
                            </span>
                            {/* 하단 진한 색 스트립 */}
                            <div
                              className={`h-2.5 w-full pulse-strip ${isFirst ? 'rounded-bl-2xl' : ''} ${isLast ? 'rounded-br-2xl' : ''}`}
                              style={{ backgroundColor: color.bar }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                  {/* 열차 연결선 (하단) */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600" />
                </div>
              )}

              {/* 요약 정보 - 데이터가 있을 때만 표시 */}
              {currentCarData.length > 0 && (
                <div className={`grid gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 ${
                  crowdedCars.length > 0 ? 'grid-cols-3' : 'grid-cols-2'
                }`}>
                <div className="text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">AI 추천</div>
                  <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{aiRecommendedCarsText}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">{aiRecommendedReason}</div>
                </div>
                {crowdedCars.length > 0 && (
                  <div className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">피해야 할 칸</div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">{crowdedCarsText}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">혼잡</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">다음 열차</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{arrivalTimes[direction.toLowerCase() as 'up' | 'down'] + 3}분 후</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">예상 혼잡: {nextRecommendedCarsCongestion}</div>
                </div>
                </div>
              )}
            </div>

            {/* 다음 열차 정보 카드 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <button
                onClick={handleNextTrain}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-3">
                  <Train className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {currentTrainIndex + 2}번째 열차
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {arrivalTimes[direction.toLowerCase() as 'up' | 'down'] + 3}분 후 도착 · 예상 혼잡: {nextRecommendedCarsCongestion}
                    </div>
                  </div>
                </div>
                {expandedNextTrain ? (
                  <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* 다음 열차 내용 */}
              {expandedNextTrain && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {/* 열차 레이아웃 */}
                  {currentNextTrainData.length === 0 ? (
                    <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                      <Train className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium mb-1 text-sm">
                        다음 열차 칸별 혼잡도 데이터가 없습니다
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {selectedStation?.name || '역'}의 {directionText} 다음 열차 데이터를 불러오는 중입니다.
                      </p>
                    </div>
                  ) : (
                    <div className="relative mb-4">
                      {/* 열차 연결선 (상단) */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600" />
                      
                      {/* 칸 카드들 */}
                      <div className="flex items-end gap-0.5 pt-2 pb-1">
                        {currentNextTrainData.map((car, index) => {
                        const isFirst = index === 0;
                        const isLast = index === currentNextTrainData.length - 1;
                        const isRecommended = nextRecommendedCars.includes(car.carNumber);
                        const isCrowded = nextCrowdedCars.includes(car.carNumber);
                        const color = CONGESTION_COLORS[car.congestion as keyof typeof CONGESTION_COLORS];

                        return (
                          <div
                            key={car.carNumber}
                            className={`flex-1 flex flex-col items-center cursor-pointer transition-all hover:scale-105 active:scale-95 relative ${
                              isRecommended ? 'z-10' : ''
                            }`}
                            onClick={() => handleCarClick(car.carNumber)}
                          >
                            {/* 추천 배지 */}
                            {isRecommended && (
                              <div className="absolute -top-3 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md z-20 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                추천
                              </div>
                            )}

                            {/* 위험 아이콘 */}
                            {isCrowded && (
                              <div className="absolute -top-2 right-0 bg-red-500 text-white rounded-full p-0.5 shadow-md z-20">
                                <AlertTriangle className="w-3 h-3" />
                              </div>
                            )}

                            {/* 칸 카드 */}
                            <div
                              className={`w-full flex flex-col items-center justify-between rounded-lg border-2 transition-all ${
                                isFirst ? 'rounded-l-2xl' : ''
                              } ${isLast ? 'rounded-r-2xl' : ''} ${
                                isRecommended 
                                  ? 'border-green-500 shadow-md' 
                                  : isCrowded
                                  ? 'border-red-300'
                                  : 'border-transparent'
                              }`}
                              style={{
                                backgroundColor: color.bg,
                                minHeight: '100px',
                              }}
                            >
                              {/* 상단 중앙: n칸 */}
                              <div className="flex-1 flex items-center justify-center pt-2">
                                <span className="font-bold text-gray-900 dark:text-white text-sm">
                                  {car.carNumber}칸
                                </span>
                              </div>
                              
                              {/* 하단 중앙: 혼잡도 텍스트 */}
                              <div className="w-full pb-0">
                                <span 
                                  className="text-[10px] font-medium block text-center mb-1"
                                  style={{ color: color.text }}
                                >
                                  {car.congestion}
                                </span>
                                {/* 하단 진한 색 스트립 */}
                                <div
                                  className={`h-2.5 w-full pulse-strip ${isFirst ? 'rounded-bl-2xl' : ''} ${isLast ? 'rounded-br-2xl' : ''}`}
                                  style={{ backgroundColor: color.bar }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      </div>

                      {/* 열차 연결선 (하단) */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600" />
                    </div>
                  )}

                  {/* 추천/위험 칸 요약 - 데이터가 있을 때만 표시 */}
                  {currentNextTrainData.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">추천 칸</div>
                      <div className="text-sm font-bold text-green-600 dark:text-green-400">{nextRecommendedCarsText}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{nextRecommendedCarsCongestion}</div>
                    </div>
                    {nextCrowdedCars.length > 0 && (
                      <div className="text-center">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">피해야 할 칸</div>
                        <div className="text-sm font-bold text-red-600 dark:text-red-400">{nextCrowdedCarsText}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">혼잡</div>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 혼잡도 안내 바 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
                혼잡도 안내
              </div>
              <div className="flex h-10 rounded-lg overflow-hidden relative">
                {(['여유', '보통', '주의', '혼잡'] as const).map((level, index) => {
                  const color = CONGESTION_COLORS[level];
                  const isLast = index === 3;
                  
                  return (
                    <div
                      key={level}
                      className="flex-1 flex flex-col items-center justify-center text-xs font-medium text-white relative group cursor-pointer"
                      style={{ backgroundColor: color.bar }}
                      onMouseEnter={() => setHoveredCongestion(level)}
                      onMouseLeave={() => setHoveredCongestion(null)}
                    >
                      {!isLast && (
                        <div className="absolute right-0 top-0 bottom-0 w-px bg-white opacity-50" />
                      )}
                      <span className="font-bold">{level}</span>
                      
                      {/* 툴팁 */}
                      {hoveredCongestion === level && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
                          {color.description}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="w-2 h-2 bg-gray-900 transform rotate-45"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 선택 칸 상세 정보 토스트 */}
      {selectedCar && selectedCarData && (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: CONGESTION_COLORS[selectedCarData.congestion as keyof typeof CONGESTION_COLORS].bar }}
              >
                {selectedCar}칸
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedCar}칸 · 혼잡도: {selectedCarData.congestion} · 예측 {selectedCarData.percentage}%
                </div>
                {selectedCarData.transferConvenient && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                    환승 유리
                  </div>
                )}
                {aiRecommendedCars.includes(selectedCar) && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI 추천 칸
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedCar(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
