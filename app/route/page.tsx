'use client';

import { useState, useMemo, useEffect } from 'react';
import React from 'react';
import { Search, MapPin, Calendar } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRouteSearch, RouteOption } from '@/hooks/useRouteSearch';
import { normalizeRoute } from '@/lib/routeNormalizer';
import { RouteResultCard } from '@/components/RouteResultCard';
import type { RouteSummary } from '@/types/route';

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
  const [routeOption, setRouteOption] = useState<RouteOption>('minTime'); // 기본값: 최소 시간
  
  const {
    routes, // 원본 경로 후보 (RouteResult[])
    loading,
    departureDateTime,
    setDepartureDateTime,
    searchRoute,
    getMinDateTimeString,
  } = useRouteSearch({ maxRoutes: 1 });

  // 1단계: 원본 → 정규화
  const normalizedRoutes = useMemo<RouteSummary[]>(() => {
    return routes.map((route, index) => normalizeRoute(route, index));
  }, [routes]);
  
  // 2단계: 첫 번째 경로만 표시 (isBest: true)
  const displayRoutes = useMemo<RouteSummary[]>(() => {
    if (normalizedRoutes.length === 0) return [];
    
    // 첫 번째 경로만 사용하고 isBest: true로 설정
    return normalizedRoutes.map((r, idx) => ({
      ...r,
      isBest: idx === 0,
    }));
  }, [normalizedRoutes]);
  
  // 디버깅: 경로 확인
  useEffect(() => {
    if (displayRoutes.length > 0) {
      console.log(
        "[DISPLAY ROUTES - path[0] 기반]",
        {
          totalCount: displayRoutes.length,
          routes: displayRoutes.map((r) => ({
            minutes: r.totalMinutes,
            transfers: r.transfers,
            fare: r.fare,
            isBest: r.isBest,
            lines: r.subPaths?.map(sp => sp.label) || [],
          })),
        }
      );
    }
  }, [displayRoutes]);

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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">경로 찾기</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                덜 붐비는 환승 루트 추천
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* 입력 섹션 */}
        <div className="space-y-4 mb-6">
          {/* 출발역/도착역 입력 */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="출발역 입력"
                value={startStation}
                onChange={(e) => setStartStation(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="도착역 입력"
                value={endStation}
                onChange={(e) => setEndStation(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* 출발 시간 설정 */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                출발 시간
              </label>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              미래 시간만 설정할 수 있습니다. 비워두면 현재 시간 기준으로 예측합니다.
            </div>
            
            <input
              type="datetime-local"
              value={departureDateTime}
              min={getMinDateTimeString()}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  const selectedTime = new Date(value);
                  const now = new Date();
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
            
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
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
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                      (지금 출발)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 검색 버튼 */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-base"
          >
            <Search className="w-5 h-5" />
            {loading ? '경로 찾는 중...' : '경로 찾기'}
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* 경로 결과 */}
        {!loading && displayRoutes.length > 0 && (
          <div className="space-y-4">
            {/* 네이버 순서 그대로 표시 (정렬 옵션 비활성화) */}
            {displayRoutes.map((route, index) => (
              <RouteResultCard
                key={route.id}
                route={route}
                index={index}
              />
            ))}
          </div>
        )}

        {/* 경로 없음 */}
        {!loading && displayRoutes.length === 0 && startStation && endStation && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              경로를 찾을 수 없습니다.
            </p>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}
