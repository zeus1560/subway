'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, User, Menu, MapPin, Navigation, RefreshCw, ArrowRight, Clock, Users, TrendingDown, TrendingUp, Route, X, Train, BarChart3, Star } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import PersonalizedDashboard from '@/components/PersonalizedDashboard';
import Legend from '@/components/Legend';
import LoadingSpinner from '@/components/LoadingSpinner';
import SkeletonLoader from '@/components/SkeletonLoader';
import ErrorMessage from '@/components/ErrorMessage';
import { getCurrentUser } from '@/lib/authService';
import { getNotificationSettings } from '@/lib/notificationService';
import { getWeatherData, getEventData } from '@/lib/weatherService';
import { findNearbyStations, StationCoordinate } from '@/lib/stationCoordinates';
import { getLineColor } from '@/lib/utils';
import { LINE_COLORS, getStationByName } from '@/lib/subwayMapData';
import { getStationCongestion, calculateCongestionLevel, RouteResult } from '@/lib/api';
import { useFavorites } from '@/hooks/useFavorites';
import { useRouteSearch } from '@/hooks/useRouteSearch';
import { logger } from '@/lib/logger';
import { random } from '@/lib/random';

type RouteOption = 'lessCrowded' | 'minTime' | 'lessTransfer' | 'lowerFare';

interface NearbyStation extends StationCoordinate {
  distance: number;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 경로 찾기 상태
  const [startStation, setStartStation] = useState('');
  const [endStation, setEndStation] = useState('');
  
  // 경로 찾기 커스텀 훅 사용
  const {
    routes,
    loading: routeLoading,
    routeOption,
    departureDateTime,
    setRouteOption,
    setDepartureDateTime,
    searchRoute,
    getMinDateTimeString,
  } = useRouteSearch({ maxRoutes: 5 });
  const [selectedStation, setSelectedStation] = useState<{station: string; congestion: string; level: number} | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set()); // 펼쳐진 구간 인덱스
  const [selectedStationDetail, setSelectedStationDetail] = useState<{station: string; lines: string[]} | null>(null);
  const [expandedRouteIndex, setExpandedRouteIndex] = useState<number | null>(0); // 펼쳐진 경로 인덱스 (첫 번째 경로 기본 확장)
  const [activeTab, setActiveTab] = useState<'nearby' | 'route' | 'dashboard'>('nearby'); // 탭 상태
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set()); // 접힌 섹션들
  
  // 기준역 정보 상태
  const [currentStation, setCurrentStation] = useState<{ stationName: string; lineNum: string } | null>(null);
  const [currentCongestion, setCurrentCongestion] = useState<{ level: number; text: string; color: string } | null>(null);
  const [averageWaitTime, setAverageWaitTime] = useState<number>(0);
  const [hasIssues, setHasIssues] = useState<boolean>(false);
  interface CarCongestion {
    carNo: number;
    congestionLevel: string;
    value: number;
  }
  const [carCongestionData, setCarCongestionData] = useState<{ up: CarCongestion[]; down: CarCongestion[] }>({ up: [], down: [] });
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down'>('up');
  
  // 즐겨찾기 훅
  const { 
    favoriteStations, 
    favoriteRoutes, 
    addFavoriteStation, 
    removeFavoriteStation, 
    isFavoriteStation,
    addFavoriteRoute 
  } = useFavorites();

  // 로그인 상태 업데이트 함수 (메모이제이션)
  const updateUserState = useCallback(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    setMounted(true);
    updateUserState();
    
    const notificationSettings = getNotificationSettings();
    setNotificationsEnabled(notificationSettings.enabled);
    
    loadWeatherAndEvents();
    getCurrentLocation();

    // 로그인 상태 변경 이벤트 리스너 추가
    const handleAuthStateChanged = () => {
      updateUserState();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-state-changed', handleAuthStateChanged);
      // storage 이벤트도 감지 (다른 탭에서 로그인한 경우)
      window.addEventListener('storage', handleAuthStateChanged);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-state-changed', handleAuthStateChanged);
        window.removeEventListener('storage', handleAuthStateChanged);
      }
    };
  }, [updateUserState]);

  // 기준역 정보 로드 (메모이제이션)
  const loadCurrentStationInfo = useCallback(async () => {
    if (nearbyStations.length === 0) {
      // nearbyStations가 없으면 빈 데이터로 설정
      setCarCongestionData({ up: [], down: [] });
      return;
    }
    
    const baseStation = { stationName: nearbyStations[0].name, lineNum: nearbyStations[0].lineNum };
    setCurrentStation(baseStation);
    
    try {
      // 현재 역 혼잡도 (타임아웃 시 기본값 사용)
      let congestionData;
      let passengerCount = 500; // 기본값
      
      try {
        congestionData = await getStationCongestion(baseStation.stationName, baseStation.lineNum, 5000);
        passengerCount = congestionData?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
      } catch (error: any) {
        // 타임아웃이나 네트워크 에러 시 기본값 사용
        logger.warn('역 혼잡도 조회 실패, 기본값 사용', {
          stationName: baseStation.stationName,
          lineNum: baseStation.lineNum,
          error: error?.message || String(error),
        });
        passengerCount = 500;
      }
      
      const congestion = calculateCongestionLevel(passengerCount);
      setCurrentCongestion(congestion);
      
      // 평균 대기 시간 계산
      const waitTime = Math.round(passengerCount / 100);
      setAverageWaitTime(waitTime);
      
      // 칸별 혼잡도 데이터 로드
      const [upResponse, downResponse] = await Promise.all([
        fetch(`/api/train/congestion?line=${encodeURIComponent(baseStation.lineNum)}&station=${encodeURIComponent(baseStation.stationName)}&direction=UP`).catch(() => null),
        fetch(`/api/train/congestion?line=${encodeURIComponent(baseStation.lineNum)}&station=${encodeURIComponent(baseStation.stationName)}&direction=DOWN`).catch(() => null),
      ]);
      
      let upCars: CarCongestion[] = [];
      let downCars: CarCongestion[] = [];
      
      if (upResponse?.ok) {
        try {
          const upResult = await upResponse.json() as { success: boolean; data?: { cars?: CarCongestion[] } };
          if (upResult.success && upResult.data?.cars) {
            upCars = upResult.data.cars;
          }
        } catch (e) {
          logger.error('상행 데이터 파싱 실패', e as Error);
        }
      }
      
      if (downResponse?.ok) {
        try {
          const downResult = await downResponse.json() as { success: boolean; data?: { cars?: CarCongestion[] } };
          if (downResult.success && downResult.data?.cars) {
            downCars = downResult.data.cars;
          }
        } catch (e) {
          logger.error('하행 데이터 파싱 실패', e as Error);
        }
      }
      
      setCarCongestionData({
        up: upCars,
        down: downCars,
      });
    } catch (error) {
      logger.error('기준역 정보 로드 실패', error as Error);
    }
  }, [nearbyStations]);

  useEffect(() => {
    if (nearbyStations.length > 0) {
      loadCurrentStationInfo();
    }
  }, [nearbyStations, loadCurrentStationInfo]);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('GPS를 지원하지 않는 브라우저입니다.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        
        // 반경 2km 내 역 찾기
        const nearby = findNearbyStations(latitude, longitude, 2.0);
        setNearbyStations(nearby);
        
        // 기준역 정보 로드
        if (nearby.length > 0) {
          loadCurrentStationInfo();
        }
        setLocationLoading(false);
      },
      (error) => {
        console.error('위치 정보 가져오기 실패:', error);
        let errorMessage = '위치 정보를 가져올 수 없습니다.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 권한이 거부되었습니다.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
            break;
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleStationClick = useCallback((station: NearbyStation) => {
    router.push(`/stations/${station.name}_${station.lineNum}`);
  }, [router]);

  const loadWeatherAndEvents = useCallback(async () => {
    try {
      const weatherData = await getWeatherData();
      const eventData = await getEventData();
      setWeather(weatherData);
      setEvents(eventData);
    } catch (error) {
      logger.error('날씨/이벤트 데이터 로드 실패', error as Error);
    }
  }, []);

  const handleRouteSearch = useCallback(async () => {
    try {
      await searchRoute(startStation, endStation);
    } catch (error) {
      alert('경로를 찾을 수 없습니다.');
    }
  }, [startStation, endStation, searchRoute]);

  // 혼잡도 색상/텍스트 (메모이제이션)
  const getCongestionColor = useCallback((level: number): string => {
    switch (level) {
      case 1: return '#4CAF50'; // 여유
      case 2: return '#FFC107'; // 보통
      case 3: return '#FF9800'; // 주의
      case 4: return '#F44336'; // 매우 혼잡
      default: return '#9E9E9E';
    }
  }, []);

  const getCongestionText = useCallback((level: number): string => {
    switch (level) {
      case 1: return '여유';
      case 2: return '보통';
      case 3: return '주의';
      case 4: return '매우 혼잡';
      default: return '알 수 없음';
    }
  }, []);

  // 역 이름으로 실제 노선 정보 가져오기 (메모이제이션)
  const getStationLineFromData = useCallback((stationName: string): string => {
    // stationLines 배열에서 찾기
    const route = routes.find(r => r.stations.includes(stationName));
    if (route) {
      const stationLine = route.stationLines?.find((sl: { station: string; line: string }) => sl.station === stationName);
      if (stationLine) return stationLine.line;
    }
    
    // subwayMapData에서 직접 찾기
    const station = getStationByName(stationName);
    if (station && station.lines.length > 0) {
      return station.lines[0];
    }
    
    // "역" 제거 후 다시 시도
    const nameWithoutStation = stationName.replace(/역$/, '');
    const station2 = getStationByName(nameWithoutStation);
    if (station2 && station2.lines.length > 0) {
      return station2.lines[0];
    }
    
    return '1'; // 기본값
  }, [routes]);

  // 경로를 구간별로 나누기 (출발역, 환승역들, 도착역) - 메모이제이션
  const getRouteSections = useCallback((route: RouteResult) => {
    const sections: Array<{
      stations: string[];
      startStation: string;
      transferStation?: string; // 환승역 정보 추가
      endStation: string;
      line: string;
      isTransfer: boolean;
    }> = [];
    
    if (!route.stations || route.stations.length === 0) return sections;
    
    // 각 역의 실제 노선 정보 가져오기 (인덱스 기반으로 정확하게)
    const getStationLine = (stationName: string, index: number) => {
      // route.stationLines에서 인덱스로 직접 찾기 (가장 정확)
      if (route.stationLines && route.stationLines[index]) {
        return route.stationLines[index].line;
      }
      
      // route.stationLines에서 역 이름으로 찾기
      const stationLine = route.stationLines?.find((sl: { station: string; line: string }) => sl.station === stationName);
      if (stationLine) return stationLine.line;
      
      // subwayMapData에서 직접 찾기
      return getStationLineFromData(stationName);
    };
    
    let currentSection: string[] = [route.stations[0]];
    let currentLine = getStationLine(route.stations[0], 0);
    
    for (let i = 1; i < route.stations.length; i++) {
      const prevStation = route.stations[i - 1];
      const currentStation = route.stations[i];
      const prevLine = getStationLine(prevStation, i - 1);
      const currentLineForStation = getStationLine(currentStation, i);
      
      // 환승 여부 확인: 노선이 바뀌는 경우
      // 단, 같은 역 이름이지만 다른 노선인 경우도 환승으로 처리
      const isTransfer = prevLine !== currentLineForStation;
      
      if (isTransfer) {
        // 현재 구간 저장
        if (currentSection.length > 0) {
          // 환승역은 현재 역 (노선이 바뀌는 지점)
          sections.push({
            stations: [...currentSection], // 환승 전까지의 역들
            startStation: currentSection[0],
            endStation: prevStation, // 환승 전 마지막 역
            transferStation: currentStation, // 실제 환승역 (노선이 바뀌는 역)
            line: currentLine,
            isTransfer: false,
          });
        }
        
        // 새 구간 시작 (환승역을 시작점으로 포함)
        currentSection = [currentStation];
        currentLine = currentLineForStation;
      } else {
        // 같은 노선이면 계속 추가
        currentSection.push(currentStation);
      }
    }
    
    // 마지막 구간 추가
    if (currentSection.length > 0) {
      sections.push({
        stations: [...currentSection],
        startStation: currentSection[0],
        endStation: currentSection[currentSection.length - 1],
        transferStation: undefined, // 마지막 구간은 환승역 없음
        line: currentLine,
        isTransfer: false,
      });
    }
    
    return sections.length > 0 ? sections : [{
      stations: route.stations,
      startStation: route.stations[0],
      endStation: route.stations[route.stations.length - 1],
      transferStation: undefined,
      line: getStationLine(route.stations[0], 0),
      isTransfer: false,
    }];
  }, [getStationLineFromData]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-gray-900">
      {/* 미니멀 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">대시보드</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/stations"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="역 검색"
              >
                <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </Link>
              <Link
                href="/analytics"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="모델 성능 평가"
              >
                <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
              </Link>
              {user ? (
                <Link
                  href="/settings"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  title="설정"
                >
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  title="로그인"
                >
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Link>
              )}
              <Link
                href="/settings"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative"
              >
                <Bell className={`w-5 h-5 ${notificationsEnabled ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'}`} />
                {notificationsEnabled && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="sticky top-[73px] z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('nearby')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === 'nearby'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-label="주변 역 탭"
              aria-selected={activeTab === 'nearby'}
              role="tab"
            >
              <div className="flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>주변 역</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('route')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === 'route'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-label="경로 찾기 탭"
              aria-selected={activeTab === 'route'}
              role="tab"
            >
              <div className="flex items-center justify-center gap-2">
                <Route className="w-4 h-4" aria-hidden="true" />
                <span>경로 찾기</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-label="대시보드 탭"
              aria-selected={activeTab === 'dashboard'}
              role="tab"
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4" aria-hidden="true" />
                <span>대시보드</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 즐겨찾기 섹션 (모든 탭에서 표시) */}
      {(favoriteStations.length > 0 || favoriteRoutes.length > 0) && (
      <section className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              자주 찾는 역 / 출근 경로
            </h2>
            
            <div className="space-y-3">
              {/* 즐겨찾는 역 */}
              {favoriteStations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">즐겨찾는 역</h3>
                  <div className="flex flex-wrap gap-2">
                    {favoriteStations.slice(0, 5).map((fav, idx) => (
                      <button
                        key={idx}
                        onClick={() => router.push(`/stations/${fav.stationName}_${fav.lineNum || '1'}`)}
                        className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        {fav.stationName}
                        {fav.lineNum && <span className="text-xs">({fav.lineNum}호선)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 즐겨찾는 경로 */}
              {favoriteRoutes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">자주 찾는 경로</h3>
                  <div className="flex flex-wrap gap-2">
                    {favoriteRoutes.slice(0, 5).map((fav, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setStartStation(fav.start);
                          setEndStation(fav.end);
                          setActiveTab('route');
                          // handleRouteSearch는 비동기이므로 즉시 호출
                          setTimeout(() => {
                            handleRouteSearch();
                          }, 100);
                        }}
                        className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center gap-2"
                      >
                        <Route className="w-4 h-4" />
                        {fav.start} → {fav.end}
                        {fav.useCount && fav.useCount > 1 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({fav.useCount}회)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}


      {/* 내 주변 역 리스트 (탭 컨텐츠) */}
      {activeTab === 'nearby' && (
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-b border-blue-200 dark:border-gray-800 shadow-sm">
          <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">내 주변 역</h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">나에게 맞춤 정보</p>
                </div>
              {userLocation && nearbyStations.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    (반경 2km · {nearbyStations.length}개)
                </span>
              )}
              {userLocation && nearbyStations.length === 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    (반경 2km)
                </span>
              )}
            </div>
            <button
              onClick={getCurrentLocation}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              title="위치 새로고침"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${locationLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {locationLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="md" text="위치 정보를 가져오는 중..." />
            </div>
          ) : locationError ? (
            <div className="py-4">
              <ErrorMessage
                title="위치 정보를 가져올 수 없습니다"
                message={locationError}
                onRetry={getCurrentLocation}
                severity="warning"
              />
            </div>
          ) : nearbyStations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                반경 2km 내에 지하철역이 없습니다.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                다른 위치에서 시도해주세요.
              </p>
            </div>
          ) : (
            <div>
              {/* 내 주변 역 리스트 */}
              <div className="space-y-2 max-h-96 overflow-y-auto mb-6">
                {nearbyStations.slice(0, 10).map((station, index) => (
                <button
                  key={`${station.name}-${station.lineNum}-${index}`}
                  onClick={() => handleStationClick(station)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow-md text-left bg-white/80 dark:bg-gray-800/80"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: getLineColor(station.lineNum) }}
                  >
                    {station.lineNum}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {station.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {station.lineNum}호선
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Navigation className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {station.distance < 0.1 
                          ? `${Math.round(station.distance * 1000)}m`
                          : `${station.distance.toFixed(2)}km`
                        }
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400 dark:text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
              </div>
              
              {/* 나에게 맞춤 정보 섹션 - 이미지와 동일한 레이아웃 */}
              <div className="space-y-4">
                {/* 기준역 정보 카드 - 이미지와 동일한 레이아웃 */}
                <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-lg border border-gray-100 p-6 text-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <div className="text-sm opacity-90 mb-1">기준역</div>
                      <div className="text-lg font-semibold mb-4">
                        {currentStation ? `${currentStation.stationName}역` : nearbyStations[0] ? `${nearbyStations[0].name}역` : '역 정보 없음'}
                      </div>
                      <div className="text-sm opacity-90 mb-1">현재 시간대 혼잡도</div>
                      <div className="text-2xl font-bold mb-4">
                        {currentCongestion?.level || '보통'}
                      </div>
                      <div className="pt-4 border-t border-white/20">
                        <div className="text-sm opacity-90 mb-1">지금 추천</div>
                        <div className="text-lg font-semibold">
                          {currentCongestion?.level === '여유' ? '1~3칸' : currentCongestion?.level === '보통' ? '4~6칸' : '7~10칸'} · {currentCongestion?.level === '여유' ? '여유로운 칸' : currentCongestion?.level === '보통' ? '보통 혼잡도' : '주의 혼잡도'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm opacity-90 mb-1">현재 시간</div>
                        <div className="text-lg font-semibold">
                          {String(new Date().getHours()).padStart(2, '0')}시 {String(new Date().getMinutes()).padStart(2, '0')}분
                        </div>
                      </div>
                      <div>
                        <div className="text-sm opacity-90 mb-1">평균 대기</div>
                        <div className="text-lg font-semibold">{averageWaitTime}분</div>
                      </div>
                      <div>
                        <div className="text-sm opacity-90 mb-1">지연/이슈</div>
                        <div className={`text-lg font-semibold ${hasIssues ? 'text-red-200' : 'text-green-200'}`}>
                          {hasIssues ? '있음' : '없음'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              
              {/* 칸별 혼잡도 예측 - 이미지와 동일한 레이아웃 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Train className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">칸별 혼잡도 예측</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {currentStation ? `${currentStation.stationName}역 · ${currentStation.lineNum}호선` : nearbyStations[0] ? `${nearbyStations[0].name}역 · ${nearbyStations[0].lineNum}호선` : '역 정보 없음'}
                    </span>
                  </div>
                    <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDirection('up')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        selectedDirection === 'up'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      aria-label="상행 방향 선택"
                      aria-pressed={selectedDirection === 'up'}
                    >
                      상행
                    </button>
                    <button
                      onClick={() => setSelectedDirection('down')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        selectedDirection === 'down'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      aria-label="하행 방향 선택"
                      aria-pressed={selectedDirection === 'down'}
                    >
                      하행
                    </button>
                  </div>
                </div>
                
                {carCongestionData[selectedDirection].length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {carCongestionData[selectedDirection].map((car: any, index: number) => {
                        const getCongestionColor = (level: string) => {
                          switch (level) {
                            case '여유':
                              return 'bg-green-500';
                            case '보통':
                              return 'bg-yellow-500';
                            case '주의':
                              return 'bg-orange-500';
                            case '혼잡':
                              return 'bg-red-500';
                            default:
                              return 'bg-gray-300';
                          }
                        };
                        
                        const isRecommended = car.congestionLevel === '여유' || car.congestionLevel === '보통';
                        const carNo = car.carNo || car.carNumber || `${index + 1}칸`;
                        const value = car.value || car.congestionPercent || 0;
                        const congestionLevel = car.congestionLevel || '보통';
                        
                        return (
                          <div
                            key={index}
                            className="relative rounded-lg p-3 text-center transition-all hover:scale-105 cursor-pointer"
                            style={{
                              backgroundColor: congestionLevel === '여유' ? '#dcfce7' :
                                              congestionLevel === '보통' ? '#fef9c3' :
                                              congestionLevel === '주의' ? '#fed7aa' : '#fee2e2',
                            }}
                          >
                            {/* 체크마크 - 모든 추천 칸에 표시 */}
                            {isRecommended && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-[8px]">✓</span>
                              </div>
                            )}
                            <div className="text-xs font-bold text-gray-700 mb-1">
                              {carNo}
                            </div>
                            <div className={`h-16 rounded ${getCongestionColor(congestionLevel)} mb-2 flex items-center justify-center`}>
                              <span className="text-white text-xs font-bold">
                                {value}%
                              </span>
                            </div>
                            <div className="text-xs font-medium" style={{
                              color: congestionLevel === '여유' ? '#166534' :
                                     congestionLevel === '보통' ? '#854d0e' :
                                     congestionLevel === '주의' ? '#9a3412' : '#991b1b',
                            }}>
                              {congestionLevel}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span>여유</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-yellow-500"></div>
                        <span>보통</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-orange-500"></div>
                        <span>주의</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        <span>혼잡</span>
                      </div>
                      <div className="ml-auto text-blue-600 dark:text-blue-400 font-medium">
                        <span className="text-green-600">✓</span> 표시된 칸 추천
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    칸별 혼잡도 데이터를 불러오는 중...
                  </div>
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* 경로 찾기 섹션 (탭 컨텐츠) */}
      {activeTab === 'route' && (
        <section className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 min-h-[calc(100vh-200px)]">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Route className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">경로 찾기</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">덜 붐비는 환승 루트 추천</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <input
                    type="text"
                    placeholder="출발역 입력"
                    value={startStation}
                    onChange={(e) => setStartStation(e.target.value)}
                    className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none border-b border-gray-300 dark:border-gray-600 pb-2"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <input
                    type="text"
                    placeholder="도착역 입력"
                    value={endStation}
                    onChange={(e) => setEndStation(e.target.value)}
                    className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none border-b border-gray-300 dark:border-gray-600 pb-2"
                  />
                </div>
              </div>

              {/* 출발 시간 설정 - 항상 표시 */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <label htmlFor="departure-time-home" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    출발 시간
                  </label>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  미래 시간만 설정할 수 있습니다. 비워두면 현재 시간 기준으로 예측합니다.
                </div>
                
                <input
                  id="departure-time-home"
                  type="datetime-local"
                  value={departureDateTime}
                  min={getMinDateTimeString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const selectedTime = new Date(value);
                      const now = new Date();
                      
                      // 과거 시간이면 경고하고 빈 문자열로 설정
                      if (selectedTime.getTime() < now.getTime()) {
                        alert('과거 시간은 선택할 수 없습니다.');
                        setDepartureDateTime("");
                      } else {
                        setDepartureDateTime(value);
                      }
                    } else {
                      setDepartureDateTime("");
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* 선택된 시간 또는 현재 시간 표시 - 항상 표시 */}
                <div className="mt-3 p-3 bg-white dark:bg-gray-700/50 rounded-lg">
                  {departureDateTime && departureDateTime !== "" ? (
                    <>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">설정된 출발 시간</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(departureDateTime).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          weekday: 'short'
                        })}
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                          (미래 예측)
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">현재 시간 기준</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date().toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          weekday: 'short'
                        })}
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          (지금 출발)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRouteOption('lessCrowded')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    routeOption === 'lessCrowded'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  혼잡도 낮음
                </button>
                <button
                  onClick={() => setRouteOption('minTime')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    routeOption === 'minTime'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  최소 시간
                </button>
                <button
                  onClick={() => setRouteOption('lessTransfer')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    routeOption === 'lessTransfer'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  환승 적음
                </button>
                <button
                  onClick={() => setRouteOption('lowerFare')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    routeOption === 'lowerFare'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  요금 낮음
                </button>
              </div>

              <button
                onClick={handleRouteSearch}
                disabled={routeLoading}
                className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
              >
                <Search className="w-5 h-5" />
                {routeLoading ? '경로 찾는 중...' : '경로 찾기'}
              </button>

              {routes.length > 0 && (
                <div className="space-y-3 mt-4">
                  {routes.map((route, routeIndex) => {
                    const isExpanded = expandedRouteIndex === routeIndex;
                    const isOptimal = routeIndex === 0;
                    
                    // 구간별 시간 계산
                    const sections = getRouteSections(route);
                    const totalStations = route.stations.length;
                    
                    // route 전체 시간: ODsay info.totalTime 또는 실제 시간 정보 사용
                    const routeTotalTime = (() => {
                      const rawTotal = route.totalTravelMinutes ?? route.travelTime ?? route.estimatedTime ?? 0;
                      const n = Number(rawTotal);
                      if (Number.isFinite(n) && n > 0) return n;
                      // segments에서 재계산
                      const segments = route.detail?.perSegment || [];
                      return segments.reduce((sum: number, seg: any) => {
                        const segTime = Number(seg.durationMinutes ?? seg.travelTime ?? 0);
                        return sum + (Number.isFinite(segTime) && segTime > 0 ? segTime : 0);
                      }, 0);
                    })();
                    
                    // 구간별 실제 시간 정보 가져오기 (perSegment에서)
                    const segments = route.detail?.perSegment || [];
                    const getSectionTime = (section: typeof sections[0]) => {
                      // 같은 노선의 segments를 찾아서 시간 합산
                      const sectionSegments = segments.filter((seg: any) => {
                        const segLine = String(seg.line || '');
                        const sectionLine = String(section.line || '');
                        return segLine === sectionLine && 
                               section.stations.some(station => seg.from === station || seg.to === station);
                      });
                      
                      if (sectionSegments.length > 0) {
                        const totalTime = sectionSegments.reduce((sum: number, seg: any) => {
                          const segTime = Number(seg.durationMinutes ?? seg.travelTime ?? 0);
                          return sum + (Number.isFinite(segTime) && segTime > 0 ? segTime : 0);
                        }, 0);
                        return totalTime > 0 ? totalTime : null; // 시간 정보가 있으면 반환, 없으면 null
                      }
                      
                      // segments에서 찾지 못하면 null 반환 (표시하지 않음)
                      return null;
                    };
                    
                    return (
                      <div key={routeIndex} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* 경로 헤더 */}
                        <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                        onClick={() => setExpandedRouteIndex(isExpanded ? null : routeIndex)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isOptimal && (
                            <span className="text-xs font-bold px-2 py-1 bg-blue-500 text-white rounded flex-shrink-0">
                              최적
                            </span>
                          )}
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {(() => {
                              // route 전체 시간: ODsay info.totalTime 사용
                              const timeNum = Number(routeTotalTime);
                              return Number.isFinite(timeNum) && timeNum > 0 ? `${timeNum}분` : '–';
                            })()}
                          </div>
                          <div className="text-base text-gray-600 dark:text-gray-400">
                            {route.fare.toLocaleString()}원
                          </div>
                          {route.transferCount > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              환승 {route.transferCount}회
                            </span>
                          )}
                        </div>
                        
                        {/* 구간별 시간 막대 그래프 - 제거됨 (중복 표시 방지) */}
                        
                        {/* 펼치기/접기 아이콘 */}
                        <div className="text-gray-400 flex-shrink-0">
                          {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>
                      
                      {/* 확장된 경로 상세 */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                          <div className="space-y-3">
                            {sections.map((section, sectionIndex) => {
                              const lineColor = LINE_COLORS[section.line as keyof typeof LINE_COLORS] || getLineColor(section.line);
                              // 실제 시간 정보 가져오기 (없으면 null)
                              const sectionTime = getSectionTime(section);
                              const sectionExpanded = expandedSections.has(sectionIndex);
                              
                              return (
                                <div key={sectionIndex} className="flex items-start gap-3">
                                  {/* 노선 색상 아이콘 */}
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                    style={{ backgroundColor: lineColor }}
                                  >
                                    {section.line}
                                  </div>
                                  
                                  {/* 구간 정보 */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {section.startStation}
                                      </span>
                                      {section.stations.length > 1 && (
                                        <>
                                          <ArrowRight className="w-4 h-4 text-gray-400" />
                                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {section.transferStation ? section.transferStation : section.endStation}
                                          </span>
                                          {section.transferStation && (
                                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                              (환승)
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    
                                    {/* 역 목록 (펼쳐진 경우) */}
                                    {sectionExpanded && (
                                      <div className="mt-2 space-y-1 pl-2 border-l-2" style={{ borderColor: lineColor }}>
                                        {section.stations.map((station: string, stationIdx: number) => {
                                          const stationCongestion = route.stationCongestions?.find(
                                            (sc: any) => sc.station === station
                                          ) || { congestion: '보통', level: 2 };
                                          
                                          const congestionColor = getCongestionColor(stationCongestion.level);
                                          const isFirst = stationIdx === 0;
                                          const isLast = stationIdx === section.stations.length - 1;
                                          
                                          return (
                                            <div
                                              key={stationIdx}
                                              className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white dark:hover:bg-gray-800 rounded px-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const stationData = getStationByName(station);
                                                const stationLines = stationData?.lines || [section.line];
                                                setSelectedStationDetail({ station, lines: stationLines.map(l => l.toString()) });
                                              }}
                                            >
                                              <div
                                                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                style={{ 
                                                  backgroundColor: isFirst ? '#10B981' : isLast ? '#EF4444' : congestionColor 
                                                }}
                                              >
                                                {isFirst ? '출' : isLast ? '도' : stationIdx}
                                              </div>
                                              <span className="text-xs text-gray-700 dark:text-gray-300">
                                                {station}
                                              </span>
                                              <span 
                                                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                                style={{ 
                                                  backgroundColor: `${congestionColor}20`,
                                                  color: congestionColor
                                                }}
                                              >
                                                {stationCongestion.congestion}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    
                                    {/* 구간 펼치기 버튼 */}
                                    {section.stations.length > 2 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newExpanded = new Set(expandedSections);
                                          if (expandedSections.has(sectionIndex)) {
                                            newExpanded.delete(sectionIndex);
                                          } else {
                                            newExpanded.add(sectionIndex);
                                          }
                                          setExpandedSections(newExpanded);
                                        }}
                                        className="text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline"
                                      >
                                        {sectionExpanded ? '접기' : `${section.stations.length}개 역 보기`}
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* 시간 정보 제거 (요구사항에 따라) */}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}

              {routes.length === 0 && !routeLoading && (
                <div className="text-center py-8">
                  <Route className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    출발역과 도착역을 입력하고 경로를 찾아보세요
                  </p>
                </div>
              )}

              {/* 역 상세 정보 모달 - 노선별 혼잡도 */}
              {selectedStationDetail && (
                <div 
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedStationDetail(null)}
              >
                <div 
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedStationDetail.station}
                    </h3>
                    <button
                      onClick={() => setSelectedStationDetail(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      노선별 혼잡도
                    </div>
                    
                    {selectedStationDetail.lines.map((line: string) => {
                      const lineColor = LINE_COLORS[line as keyof typeof LINE_COLORS] || getLineColor(line);
                      // 해당 역의 혼잡도 찾기
                      const route = routes.find(r => r.stations.includes(selectedStationDetail.station));
                      const stationCongestion = route?.stationCongestions?.find(
                        (sc: any) => sc.station === selectedStationDetail.station
                      ) || { congestion: '보통', level: 2 };
                      
                      const congestionColor = getCongestionColor(stationCongestion.level);
                      const congestionText = getCongestionText(stationCongestion.level);
                      
                      return (
                        <div key={line} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                              style={{ backgroundColor: lineColor }}
                            >
                              {line}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {line}호선
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedStationDetail.station}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                              <span className="text-sm text-gray-600 dark:text-gray-400">현재 혼잡도</span>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: congestionColor }}
                                >
                                  {stationCongestion.level}
                                </div>
                                <span 
                                  className="text-sm font-bold"
                                  style={{ color: congestionColor }}
                                >
                                  {congestionText}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <span className="text-sm text-blue-600 dark:text-blue-400">다음 열차 도착</span>
                              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                약 {random.randomInt(2, 4)}분
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 개인화 대시보드 (탭 컨텐츠) */}
      {activeTab === 'dashboard' && (
        <PersonalizedDashboard nearbyStations={nearbyStations} userLocation={userLocation} />
      )}

      <BottomNavigation />
      <Legend />
      <div className="h-20"></div>
    </div>
  );
}

