'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRouteSearch, RouteOption } from '@/hooks/useRouteSearch';
import { normalizeRoute } from '@/lib/routeNormalizer';
import { useFavorites, type FavoriteRoute } from '@/hooks/useFavorites';
import { findNearbyStations } from '@/lib/stationCoordinates';
import type { RouteSummary } from '@/types/route';
import FrequentRouteChips, { type FrequentRoute } from '@/components/route/FrequentRouteChips';
import RouteSearchForm from '@/components/route/RouteSearchForm';
import RouteResultSummary from '@/components/route/RouteResultSummary';
import RouteResultSteps from '@/components/route/RouteResultSteps';

/**
 * 너무 긴 경로 필터링
 * 최단 시간의 1.6배 AND 최단 시간 + 40분까지 둘 다 만족해야 통과
 */
function filterLongRoutes(routes: RouteSummary[]): RouteSummary[] {
  if (routes.length === 0) return [];

  const times = routes
    .map((r) => r.totalMinutes ?? Infinity)
    .filter((t) => Number.isFinite(t));

  if (times.length === 0) return [];

  const minTime = Math.min(...times);

  const MAX_DIFF = 40;   // 최단 시간 + 40분
  const MAX_RATIO = 1.6; // 최단 시간의 1.6배

  const filtered = routes.filter((r) => {
    const t = r.totalMinutes;
    if (!Number.isFinite(t ?? NaN)) return false;

    const tt = t as number;
    const dt = tt - minTime;

    const withinAbs = dt <= MAX_DIFF;
    const withinRatio = tt <= minTime * MAX_RATIO;

    // ★ 반드시 AND 로 처리 (둘 다 만족하는 것만 통과)
    return withinAbs && withinRatio;
  });

  return filtered;
}

/**
 * 시간 + 환승을 같이 고려해서 정렬
 * ① 크게 느린 루트는 뒤로
 * ② 비슷한 시간(5분 이내) 안에서는 환승 적은 루트가 앞으로
 */
function sortByTime(routes: RouteSummary[]): RouteSummary[] {
  if (routes.length === 0) return routes;

  const times = routes
    .map((r) => r.totalMinutes ?? Infinity)
    .filter((t) => Number.isFinite(t));

  if (times.length === 0) return routes;

  const minTime = Math.min(...times);
  const TIME_BUCKET = 5; // 5분 단위로 시간 "급" 나누기

  const bucket = (r: RouteSummary): number => {
    const t = r.totalMinutes;
    if (!Number.isFinite(t ?? NaN)) return Number.POSITIVE_INFINITY;
    const diff = (t as number) - minTime;
    // minTime~minTime+5분 → 0, +5~+10분 → 1, ...
    return diff <= 0 ? 0 : Math.floor(diff / TIME_BUCKET);
  };

  const sorted = [...routes].sort((a, b) => {
    // 1) 시간 급이 다른 경우: 더 느린 급을 뒤로
    const ba = bucket(a);
    const bb = bucket(b);
    if (ba !== bb) return ba - bb;

    // 2) 같은 시간 급이면: 환승 수가 적은 루트를 앞으로
    const ta = a.transfers ?? 0;
    const tb = b.transfers ?? 0;
    if (ta !== tb) return ta - tb;

    // 3) 그래도 같으면: 실제 시간 짧은 순
    return (a.totalMinutes ?? Infinity) - (b.totalMinutes ?? Infinity);
  });

  // 첫 번째만 "최적" 표시
  return sorted.map((r, idx) => ({
    ...r,
    isBest: idx === 0,
  }));
}

export default function RoutePage() {
  const [startStation, setStartStation] = useState('');
  const [endStation, setEndStation] = useState('');
  const [suggestedFrom, setSuggestedFrom] = useState<string>('');
  
  const { favoriteRoutes } = useFavorites();
  
  const {
    routes,
    loading,
    departureDateTime,
    setDepartureDateTime,
    searchRoute,
    getMinDateTimeString,
  } = useRouteSearch({ maxRoutes: 1 });

  // 현재 위치 기반 추천 역 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const nearby = findNearbyStations(latitude, longitude, 2.0);
          if (nearby.length > 0) {
            setSuggestedFrom(`${nearby[0].name}역 (추천)`);
          }
        },
        () => {
          // 위치 권한 거부 시 무시
        }
      );
    }
  }, []);

  // 1단계: 원본 → 정규화
  const normalizedRoutes = useMemo<RouteSummary[]>(() => {
    const normalized = routes.map((route, index) => normalizeRoute(route, index));
    return normalized;
  }, [routes]);

  // 2단계: 첫 번째 경로만 표시 (isBest: true)
  const displayRoutes = useMemo<RouteSummary[]>(() => {
    if (normalizedRoutes.length === 0) return [];
    return normalizedRoutes.map((r, idx) => ({
      ...r,
      isBest: idx === 0,
    }));
  }, [normalizedRoutes]);

  // 자주 찾는 경로 데이터 변환
  const frequentRoutes: FrequentRoute[] = useMemo(() => {
    return favoriteRoutes.slice(0, 10).map((route, idx) => ({
      id: `route-${idx}`,
      label: `${route.start} → ${route.end}${route.useCount && route.useCount > 1 ? ` (${route.useCount}회)` : ''}`,
      start: route.start,
      end: route.end,
    }));
  }, [favoriteRoutes]);

  const handleSearch = async () => {
    if (!startStation.trim() || !endStation.trim()) {
      alert('출발역과 도착역을 모두 입력해주세요.');
      return;
    }
    
    try {
      await searchRoute(startStation.trim(), endStation.trim());
    } catch (error) {
      alert('경로를 찾을 수 없습니다.');
    }
  };

  const handleFrequentRouteSelect = (route: FrequentRoute) => {
    setStartStation(route.start);
    setEndStation(route.end);
    // 자동으로 검색하지 않고 사용자가 버튼을 누르도록 함
  };

  const handleSwapStations = () => {
    const temp = startStation;
    setStartStation(endStation);
    setEndStation(temp);
  };

  const currentRoute = displayRoutes.length > 0 ? displayRoutes[0] : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-background-elevated border-b border-border-subtle">
        <div className="section-container py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary rounded-card flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold mb-2">경로 찾기</h1>
              <p className="text-sm text-text-muted">
                덜 붐비는 환승 루트 추천
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="section-container py-8 px-6">
        {/* [섹션 A] 자주 찾는 경로 */}
        <div className="first:mt-0 mt-6">
          <FrequentRouteChips
            routes={frequentRoutes}
            onSelect={handleFrequentRouteSelect}
          />
        </div>

        {/* [섹션 B] 경로 입력 폼 */}
        <div className="mt-6">
          <RouteSearchForm
          from={startStation}
          to={endStation}
          departureTime={departureDateTime}
          onChangeFrom={setStartStation}
          onChangeTo={setEndStation}
          onSwapStations={handleSwapStations}
            onChangeDepartureTime={setDepartureDateTime}
            onSubmit={handleSearch}
            loading={loading}
            minDateTime={getMinDateTimeString()}
            suggestedFrom={suggestedFrom}
          />
        </div>

        {/* Divider */}
        {!loading && displayRoutes.length > 0 && (
          <div className="h-8 border-t border-border-subtle my-8"></div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* [섹션 C] 검색 결과 */}
        {!loading && currentRoute && (
          <div className="mt-6">
            {/* 결과 요약 */}
            <RouteResultSummary
              totalMinutes={currentRoute.totalMinutes}
              fare={currentRoute.fare}
              transfers={currentRoute.transfers}
              isBest={currentRoute.isBest}
            />

            {/* 경로 단계별 상세 */}
            <RouteResultSteps route={currentRoute} />
          </div>
        )}

        {/* 경로 없음 */}
        {!loading && displayRoutes.length === 0 && startStation && endStation && (
          <div className="text-center py-12">
            <p className="text-text-muted">
              경로를 찾을 수 없습니다.
            </p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
