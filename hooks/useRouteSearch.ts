'use client';

import { useState, useCallback } from 'react';
import { RouteResult } from '@/lib/api';
import { useFavorites } from './useFavorites';
import { logger } from '@/lib/logger';

export type RouteOption = 'lessCrowded' | 'minTime' | 'lessTransfer' | 'lowerFare';

interface UseRouteSearchOptions {
  maxRoutes?: number;
}

interface UseRouteSearchReturn {
  routes: RouteResult[]; // 원본 경로 후보 (정렬되지 않음)
  loading: boolean;
  departureDateTime: string;
  setDepartureDateTime: (dateTime: string) => void;
  searchRoute: (startStation: string, endStation: string) => Promise<void>;
  getEffectiveDepartureTime: () => Date;
  getMinDateTimeString: () => string;
}

export function useRouteSearch(options: UseRouteSearchOptions = {}): UseRouteSearchReturn {
  const [routes, setRoutes] = useState<RouteResult[]>([]); // 원본 경로 후보만 저장
  const [loading, setLoading] = useState(false);
  const [departureDateTime, setDepartureDateTime] = useState<string>("");
  const { addFavoriteRoute } = useFavorites();

  // 최소 날짜/시간 계산 (현재 시간 이후만 선택 가능)
  const getMinDateTimeString = useCallback((): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }, []);

  // 유효한 출발 시간 가져오기 (과거 시간 검증 포함)
  const getEffectiveDepartureTime = useCallback((): Date => {
    if (!departureDateTime || departureDateTime === "") {
      return new Date(); // 선택 안했으면 현재 시간
    }
    
    const dt = new Date(departureDateTime);
    const now = new Date();
    
    // 과거 시간이면 현재 시간으로 보정
    if (dt.getTime() < now.getTime()) {
      return now;
    }
    
    return dt;
  }, [departureDateTime]);

  // 경로 검색 함수
  const searchRoute = useCallback(async (startStation: string, endStation: string): Promise<void> => {
    // 시작/도착역이 비어있는지 명확히 체크
    const startTrimmed = startStation?.trim() || '';
    const endTrimmed = endStation?.trim() || '';
    
    if (!startTrimmed || !endTrimmed) {
      // 경고는 한 번만 (실제로 검색이 실행되지 않으므로)
      logger.warn('경로 검색: 출발역 또는 도착역이 비어있음', { 
        startStation: startTrimmed || '(비어있음)', 
        endStation: endTrimmed || '(비어있음)' 
      });
      throw new Error('출발역과 도착역을 모두 입력해주세요.');
    }

    // 출발 시간 검증
    const effectiveTime = getEffectiveDepartureTime();
    const now = new Date();
    
    if (departureDateTime && departureDateTime !== "") {
      const selectedTime = new Date(departureDateTime);
      if (selectedTime.getTime() < now.getTime()) {
        logger.warn('경로 검색: 과거 시간 선택됨', { departureDateTime, now: now.toISOString() });
        setDepartureDateTime("");
      }
    }

    setLoading(true);
    try {
      logger.info('경로 검색 시작', { 
        startStation: startTrimmed, 
        endStation: endTrimmed, 
        departureTime: effectiveTime.toISOString()
      });
      
      // /api/route API를 통해 정규화된 데이터 가져오기
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startStation: startTrimmed,
          endStation: endTrimmed,
          timestamp: effectiveTime.toISOString(),
        }),
      });
      
      const data = await response.json();
      
      // 404가 아닌 경우에도 응답 본문 확인
      if (!response.ok) {
        const errorMessage = data.error || data.message || `서버 오류 (${response.status})`;
        throw new Error(errorMessage);
      }
      
      // success가 false이거나 routes가 없으면 에러
      if (!data.success || !Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error(data.message || '경로를 찾을 수 없습니다.');
      }
      
      const results = data.routes as RouteResult[];
      
      // 원본 경로 후보만 저장 (정렬은 페이지에서 클라이언트 사이드로 처리)
      // maxRoutes 옵션이 있으면 제한 적용
      const limitedResults = options.maxRoutes 
        ? results.slice(0, options.maxRoutes)
        : results;
      
      setRoutes(limitedResults);
      
      // 경로를 즐겨찾기에 추가 (자동)
      addFavoriteRoute(startTrimmed, endTrimmed);
      
      logger.info('경로 검색 완료', { 
        routeCount: results.length,
        startStation: startTrimmed,
        endStation: endTrimmed
      });
    } catch (error) {
      logger.error('경로 찾기 실패', error as Error, {
        startStation: startTrimmed,
        endStation: endTrimmed
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [departureDateTime, getEffectiveDepartureTime, addFavoriteRoute]);

  return {
    routes, // 원본 경로 후보
    loading,
    departureDateTime,
    setDepartureDateTime,
    searchRoute,
    getEffectiveDepartureTime,
    getMinDateTimeString,
  };
}

