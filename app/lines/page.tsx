'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Train } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { getLineColor } from '@/lib/utils';
import { analyzeUserPattern } from '@/lib/personalizationService';
import { getCurrentUser } from '@/lib/authService';
import { getFavoriteStations } from '@/lib/storage';
import { getStationsByLine, type LineId, ALL_LINE_IDS } from '@/lib/subwayMapData';
import { random } from '@/lib/random';
import CongestionControls, { type Direction } from '@/components/congestion/CongestionControls';
import StationSummaryCard from '@/components/congestion/StationSummaryCard';
import DirectionSummaryPanel from '@/components/congestion/DirectionSummaryPanel';
import CarCongestionGrid, { type CongestionLevel } from '@/components/congestion/CarCongestionGrid';
import CongestionLegendBar from '@/components/congestion/CongestionLegendBar';

// 각 호선의 모든 역 목록
const getLineStations = (): Record<string, Array<{ name: string; lineNum: string }>> => {
  const lineStations: Record<string, Array<{ name: string; lineNum: string }>> = {};
  
  ALL_LINE_IDS.forEach((lineId) => {
    const stations = getStationsByLine(lineId);
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

// AI 최적 탑승 칸 추천
function getAIRecommendedCars(
  cars: Array<{ carNumber: number; congestion: string; percentage: number; transferConvenient?: boolean; aiScore?: number }>,
  userPreferences?: { preferTransfer?: boolean; preferComfort?: boolean }
): number[] {
  const sorted = [...cars].sort((a, b) => {
    const scoreA = a.aiScore || (a.congestion === '여유' ? 1 : a.congestion === '보통' ? 2 : a.congestion === '주의' ? 3 : 4);
    const scoreB = b.aiScore || (b.congestion === '여유' ? 1 : b.congestion === '보통' ? 2 : b.congestion === '주의' ? 3 : 4);
    
    if (userPreferences?.preferTransfer) {
      const transferBonusA = a.transferConvenient ? -0.5 : 0;
      const transferBonusB = b.transferConvenient ? -0.5 : 0;
      return (scoreA + transferBonusA) - (scoreB + transferBonusB);
    }
    
    return scoreA - scoreB;
  });
  
  return sorted
    .filter(car => car.congestion === '여유' || car.congestion === '보통')
    .slice(0, 3)
    .map(car => car.carNumber);
}

export default function LinesPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedLine, setSelectedLine] = useState<string>('1');
  const [selectedStation, setSelectedStation] = useState<{ name: string; lineNum: string } | null>(null);
  const [direction, setDirection] = useState<Direction>('up');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [allCarData, setAllCarData] = useState<{
    up: Array<{
      carNumber: number;
      congestion: string;
      percentage: number;
      transferConvenient?: boolean;
      aiScore?: number;
    }>;
    down: Array<{
      carNumber: number;
      congestion: string;
      percentage: number;
      transferConvenient?: boolean;
      aiScore?: number;
    }>;
  }>({ up: [], down: [] });
  const [userPattern, setUserPattern] = useState<any>(null);
  const [recommendedStations, setRecommendedStations] = useState<Array<{ name: string; lineNum: string; reason: string }>>([]);
  const [arrivalTimes, setArrivalTimes] = useState<{ up: number; down: number }>({ up: 2, down: 4 });
  const [hoveredCongestion, setHoveredCongestion] = useState<CongestionLevel | null>(null);

  // 로그인 상태 업데이트 함수
  const updateUserState = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  };

  // 사용자 패턴 및 즐겨찾기 로드
  useEffect(() => {
    setMounted(true);
    updateUserState();
    
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
      
      const frequentStations = pattern.frequentStations.map(s => ({
        name: s.station,
        lineNum: s.line,
        reason: `자주 이용 (${s.count}회)`,
      }));
      
      const favorites = getFavoriteStations();
      const favoriteStationsList = favorites.map(f => ({
        name: f.stationName,
        lineNum: f.lineNum || '1',
        reason: '즐겨찾기',
      }));
      
      const allRecommended = [...frequentStations, ...favoriteStationsList];
      const uniqueRecommended = Array.from(
        new Map(allRecommended.map(item => [`${item.name}_${item.lineNum}`, item])).values()
      );
      setRecommendedStations(uniqueRecommended.slice(0, 5));
      
      if (pattern.frequentStations.length > 0) {
        const mostFrequentLine = pattern.frequentStations[0].line;
        if (ALL_LINE_IDS.includes(mostFrequentLine as LineId)) {
          setSelectedLine(mostFrequentLine);
          const mostFrequentStation = pattern.frequentStations[0];
          setSelectedStation({
            name: mostFrequentStation.station,
            lineNum: mostFrequentStation.line,
          });
        }
      } else if (favorites.length > 0) {
        setSelectedStation({
          name: favorites[0].stationName,
          lineNum: favorites[0].lineNum || '1',
        });
        setSelectedLine(favorites[0].lineNum || '1');
      }
    } else {
      const defaultStation = LINE_STATIONS[selectedLine]?.[0];
      if (defaultStation) {
        setSelectedStation(defaultStation);
      }
    }
  }, [user, selectedLine]);

  // API 응답을 기존 형식으로 변환하는 헬퍼 함수
  const transformCarData = (
    cars: Array<{ carNo: number; congestionLevel: string; value: number }>,
    direction: 'UP' | 'DOWN',
    stationName: string,
    lineNum: string
  ) => {
    return cars.map((car) => {
      const congestion = car.congestionLevel;
      const percentage = car.value;
      
      const congestionScore = congestion === '여유' ? 1 : congestion === '보통' ? 2 : congestion === '주의' ? 3 : 4;
      const transferScore = (car.carNo === 3 || car.carNo === 8) ? 0.5 : 1;
      const aiScore = congestionScore + transferScore;
      
      return {
        carNumber: car.carNo,
        congestion,
        percentage,
        transferConvenient: car.carNo === 3 || car.carNo === 8,
        aiScore,
      };
    });
  };

  // API에서 열차 칸별 혼잡도 데이터 로드
  const loadCarData = useCallback(async () => {
    if (!selectedStation) {
      setAllCarData({ up: [], down: [] });
      return;
    }
    
    setLoading(true);
    try {
      const stationName = selectedStation.name;
      const lineNum = selectedStation.lineNum;
      
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
      
      const transformedUp = transformCarData(upResult.data.cars, 'UP', stationName, lineNum);
      const transformedDown = transformCarData(downResult.data.cars, 'DOWN', stationName, lineNum);
      
      setAllCarData({
        up: transformedUp,
        down: transformedDown,
      });
      
      const stationContext = selectedStation || 'default';
      setArrivalTimes({
        up: random.contextRandomInt(`arrival-${stationContext}-up`, 2, 4),
        down: random.contextRandomInt(`arrival-${stationContext}-down`, 3, 5),
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

  const handleStationSelect = (station: { name: string; lineNum: string }) => {
    setSelectedStation(station);
    setSelectedLine(station.lineNum);
  };

  // 현재 선택된 방향의 데이터
  const currentCarData = useMemo(() => {
    return direction === 'up' ? allCarData.up : allCarData.down;
  }, [direction, allCarData]);

  // AI 추천 칸
  const userPreferences = useMemo(() => {
    if (!userPattern) return undefined;
    const commuteRoutes = userPattern.commuteRoutes || [];
    const preferTransfer = commuteRoutes.length > 0;
    return { preferTransfer, preferComfort: true };
  }, [userPattern]);

  const aiRecommendedCars = useMemo(() => {
    return getAIRecommendedCars(currentCarData, userPreferences);
  }, [currentCarData, userPreferences]);

  const aiRecommendedReason = useMemo(() => {
    if (!userPreferences) {
      return '여유로운 칸';
    }
    
    if (userPreferences.preferTransfer) {
      const transferCars = aiRecommendedCars.filter(car => 
        currentCarData.find(c => c.carNumber === car)?.transferConvenient
      );
      if (transferCars.length > 0) {
        return '환승 유리 + 여유로운 칸';
      }
    }
    
    return '여유로운 칸';
  }, [aiRecommendedCars, currentCarData, userPreferences]);

  // 상/하행 혼잡도 요약
  const congestionSummary = useMemo(() => {
    const currentData = direction === 'up' ? allCarData.up : allCarData.down;
    const relaxed = currentData.filter(c => c.congestion === '여유' || c.congestion === '보통').length;
    const crowded = currentData.filter(c => c.congestion === '혼잡').length;
    
    // 혼잡도 레벨 결정 (대부분 여유/보통이면 여유, 혼잡이 많으면 혼잡)
    let congestionLevel: CongestionLevel = '보통';
    if (relaxed >= 7) congestionLevel = '여유';
    else if (crowded >= 5) congestionLevel = '혼잡';
    else if (currentData.filter(c => c.congestion === '주의').length >= 3) congestionLevel = '주의';
    
    return {
      etaMinutes: arrivalTimes[direction],
      congestionLevel,
      relaxedCount: relaxed,
      crowdedCount: crowded,
    };
  }, [direction, allCarData, arrivalTimes]);

  // 칸별 혼잡도 그리드용 데이터 변환
  const carGridData = useMemo(() => {
    return currentCarData.map(car => ({
      carNumber: car.carNumber,
      level: car.congestion as CongestionLevel,
      percentage: car.percentage,
      isRecommended: aiRecommendedCars.includes(car.carNumber),
    }));
  }, [currentCarData, aiRecommendedCars]);

  const directionText = direction === 'up' ? '상행' : '하행';

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background-elevated border-b border-border-subtle">
        <div className="section-container py-4 px-6">
          <h1 className="text-xl font-semibold mb-2">열차 칸별 혼잡도</h1>
        </div>
      </header>

      <main className="section-container py-8 px-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
            <p className="text-sm text-text-muted mt-3">데이터를 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="first:mt-0 mt-6">
              {/* [섹션 A] 상단 컨트롤 바 */}
              <CongestionControls
                selectedLine={selectedLine}
                lines={ALL_LINE_IDS}
                baseStation={selectedStation?.name || null}
                stations={LINE_STATIONS[selectedLine] || []}
                direction={direction}
                recommendedStations={recommendedStations}
                onChangeLine={setSelectedLine}
                onChangeBaseStation={handleStationSelect}
                onChangeDirection={setDirection}
              />
            </div>

            {/* [섹션 B] 기준역/열차 요약 카드 */}
            {selectedStation && (
              <div className="mt-6">
                <StationSummaryCard
                lineNum={selectedLine}
                stationName={selectedStation.name}
                direction={direction}
                directionText={directionText}
                arrivalMinutes={arrivalTimes[direction]}
                  recommendedCars={aiRecommendedCars}
                  recommendedReason={aiRecommendedReason}
                />
              </div>
            )}

            {/* [섹션 C] 상/하행 혼잡도 요약 (현재 선택된 방향만 표시) */}
            {selectedStation && (
              <div className="mt-6">
                <DirectionSummaryPanel summary={congestionSummary} />
              </div>
            )}

            {/* [섹션 D] 칸별 혼잡도 그리드 */}
            {selectedStation && (
              <div className="mt-6">
                <CarCongestionGrid cars={carGridData} />
              </div>
            )}

            {/* 범례 바 */}
            <div className="mt-6">
              <CongestionLegendBar onHover={setHoveredCongestion} />
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
