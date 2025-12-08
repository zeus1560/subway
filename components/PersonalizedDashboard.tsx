'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getFavoriteStations } from '@/lib/storage';
import { getStationCongestion, calculateCongestionLevel } from '@/lib/api';
import { analyzeUserPattern } from '@/lib/personalizationService';
import { getCurrentUser } from '@/lib/authService';
import { random } from '@/lib/random';
import HeroStats from './dashboard/HeroStats';
import FrequentStations from './dashboard/FrequentStations';
import QuickChips from './dashboard/QuickChips';
import CongestionSummary from './dashboard/CongestionSummary';

interface NearbyStation {
  name: string;
  lineNum: string;
  distance: number;
}

interface PersonalizedDashboardProps {
  nearbyStations?: NearbyStation[];
  userLocation?: { lat: number; lon: number } | null;
}

export default function PersonalizedDashboard({ nearbyStations = [], userLocation = null }: PersonalizedDashboardProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [favoriteStations, setFavoriteStations] = useState<any[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<any[]>([]);
  const [currentStation, setCurrentStation] = useState<any>(null);
  const [currentCongestion, setCurrentCongestion] = useState<any>(null);
  const [averageWaitTime, setAverageWaitTime] = useState<number>(0);
  const [hasIssues, setHasIssues] = useState<boolean>(false);
  const [commuteReport, setCommuteReport] = useState<any>(null);
  const [userComparison, setUserComparison] = useState<any>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [carCongestionData, setCarCongestionData] = useState<{ up: any[]; down: any[] }>({ up: [], down: [] });
  const [currentTime, setCurrentTime] = useState<string>('');

  // 현재 시간 업데이트
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}시 ${minutes}분`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // 1분마다 업데이트
    return () => clearInterval(interval);
  }, []);

  // 로그인 상태 업데이트 함수
  const updateUserState = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  };

  useEffect(() => {
    setMounted(true);
    updateUserState();
    loadDashboardData();
    
    // 로그인 상태 변경 이벤트 리스너 추가
    const handleAuthStateChanged = () => {
      updateUserState();
      loadDashboardData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-state-changed', handleAuthStateChanged);
      window.addEventListener('storage', handleAuthStateChanged);
    }
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, 60000); // 1분마다 갱신
    
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-state-changed', handleAuthStateChanged);
        window.removeEventListener('storage', handleAuthStateChanged);
      }
    };
  }, [nearbyStations]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      
      // 즐겨찾기 역 및 경로
      const favorites = getFavoriteStations();
      setFavoriteStations(favorites);
      
      // 즐겨찾기 경로 (localStorage에서 가져오기)
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('subway_favorites');
          if (stored) {
            const parsed = JSON.parse(stored);
            setFavoriteRoutes(parsed.favoriteRoutes || []);
          }
        } catch (e) {
          console.error('즐겨찾기 경로 로드 실패:', e);
        }
      }
      
      // 기준역 설정
      let baseStation;
      if (nearbyStations && nearbyStations.length > 0) {
        baseStation = { stationName: nearbyStations[0].name, lineNum: nearbyStations[0].lineNum };
      } else if (favorites.length > 0) {
        baseStation = favorites[0];
      } else {
        baseStation = { stationName: '노량진', lineNum: '1' };
      }
      setCurrentStation(baseStation);
      
      // 현재 역 혼잡도
      try {
      const congestionData = await getStationCongestion(baseStation.stationName, baseStation.lineNum);
      const passengerCount = congestionData?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
      const congestion = calculateCongestionLevel(passengerCount);
      setCurrentCongestion(congestion);
      
      // 평균 대기 시간 계산
      const waitTime = Math.round(passengerCount / 100);
      setAverageWaitTime(waitTime);
      } catch (error) {
        console.error('혼잡도 조회 실패:', error);
        setCurrentCongestion({ level: 2, text: '보통', color: '#FFC107' });
        setAverageWaitTime(5);
      }
      
      // 칸별 혼잡도 데이터 로드
      try {
        const [upResponse, downResponse] = await Promise.all([
          fetch(`/api/train/congestion?line=${encodeURIComponent(baseStation.lineNum)}&station=${encodeURIComponent(baseStation.stationName)}&direction=UP`).catch(() => null),
          fetch(`/api/train/congestion?line=${encodeURIComponent(baseStation.lineNum)}&station=${encodeURIComponent(baseStation.stationName)}&direction=DOWN`).catch(() => null),
        ]);
        
        let upCars: any[] = [];
        let downCars: any[] = [];
        
        if (upResponse?.ok) {
          try {
            const upResult = await upResponse.json();
            if (upResult.success && upResult.data?.cars) {
              upCars = upResult.data.cars;
            }
          } catch (err) {
            console.error('상행 데이터 파싱 실패:', err);
          }
        }
        
        if (downResponse?.ok) {
          try {
            const downResult = await downResponse.json();
            if (downResult.success && downResult.data?.cars) {
              downCars = downResult.data.cars;
            }
          } catch (err) {
            console.error('하행 데이터 파싱 실패:', err);
          }
        }
        
        setCarCongestionData({
          up: upCars,
          down: downCars,
        });
      } catch (error) {
        console.error('칸별 혼잡도 데이터 로드 실패:', error);
        setCarCongestionData({
          up: [],
          down: [],
        });
      }
      
      // 이슈 여부
      const userContext = currentUser?.id || 'anonymous';
      setHasIssues(random.contextRandom(`issues-${userContext}`) > 0.8);
      
      // AI 출퇴근 리포트 (로그인 사용자만)
      if (currentUser?.id) {
        try {
          const pattern = analyzeUserPattern(currentUser.id);
          
          // 이용자 평균 비교
          setUserComparison({
            myAverage: 65,
            userAverage: 70,
            difference: -5,
          });
        } catch (error) {
          console.error('패턴 분석 중 오류:', error);
        }
        
        const lastWeekAvg = 65;
        const thisWeekAvg = 60;
        const diff = thisWeekAvg - lastWeekAvg;
        
        setCommuteReport({
          averageTime: thisWeekAvg,
          diff: diff,
          recommendedTimes: [
            { time: '7:30', congestion: '보통' },
            { time: '8:15', congestion: '여유' },
            { time: '9:00', congestion: '보통' },
          ],
        });
      } else {
        setCommuteReport(null);
        setUserComparison(null);
      }
      
      // AI 제안 메시지
      const suggestions = [
        '오늘은 평소보다 10분 일찍 출발하시면 여유롭게 탑승하실 수 있어요 🚇',
        '현재 2호선이 평소보다 혼잡합니다. 1호선 환승을 고려해보세요 💡',
        '주말에는 평일 대비 30% 여유롭습니다. 여유로운 시간대를 이용하세요 ✨',
      ];
      const suggestionIndex = random.contextRandomInt(`suggestion-${userContext}`, 0, suggestions.length - 1);
      setAiSuggestion(suggestions[suggestionIndex]);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteClick = (start: string, end: string) => {
    // 경로 찾기 페이지로 이동하거나 경로 검색 실행
    router.push(`/route?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  };

  // 추천 정보 생성
  const getRecommendation = () => {
    if (!currentCongestion) return '정보 없음';
    
    const level = currentCongestion.level;
    if (level === 1) return '1~3칸 · 여유로운 칸';
    if (level === 2) return '4~6칸 · 보통 혼잡도';
    return '7~10칸 · 주의 혼잡도';
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2979FF] mx-auto mb-4"></div>
          <p className="text-sm text-[#8A90A2]">대시보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* AI 제안 메시지 */}
        {aiSuggestion && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-[14px] p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-[20px] h-[20px] text-[#8B5CF6] flex-shrink-0" />
              <p className="text-sm text-[#111827] font-medium">{aiSuggestion}</p>
            </div>
          </div>
        )}

        {/* [1단] 핵심 정보 영역 (Hero Section) */}
        <HeroStats
          currentTime={currentTime}
          currentStation={currentStation}
          currentCongestion={currentCongestion}
          averageWaitTime={averageWaitTime}
          hasIssues={hasIssues}
          recommendation={getRecommendation()}
        />

        {/* [2단] 개인화 정보 영역 */}
        <FrequentStations
          favoriteStations={favoriteStations}
          favoriteRoutes={favoriteRoutes}
          onRouteClick={handleRouteClick}
        />

        {/* 개인화 정보 - Quick Chips */}
        {(commuteReport || userComparison) && (
          <QuickChips
            commuteReport={commuteReport}
            userComparison={userComparison}
          />
        )}

        {/* [3단] 혼잡도 예측 & 노선 요약 */}
        {currentStation && (
          <CongestionSummary
            stationName={currentStation.stationName}
            lineNum={currentStation.lineNum}
            carCongestionData={carCongestionData}
          />
        )}
      </div>
    </div>
  );
}
