import { NextRequest, NextResponse } from 'next/server';
import { findRoutesWithNaver } from '@/lib/naverMapApi';
import { findRoutes } from '@/lib/api';
import { logger } from '@/lib/logger';

// Segment 정규화 함수
// durationMinutes, travelTime, minutes, segmentMinutes 중 존재하는 값을 가져와 Number()로 변환
// NaN/undefined/null/0 → 기본값(환승이면 4, 일반 구간 2)으로 보정
// segment 안의 모든 시간 필드를 동일한 minutes 값으로 덮어쓰기
function normalizeSegment(segment: any): {
  from: string;
  to: string;
  line: string;
  travelTime: number;
  durationMinutes: number;
  minutes: number;
  segmentMinutes: number;
  congestion: number;
  isTransfer: boolean;
} {
  // 기본값 결정 (환승이면 4, 일반 구간 2)
  const isTransfer = Boolean(segment?.isTransfer);
  const defaultValue = isTransfer ? 4 : 2;
  
  // 모든 가능한 시간 필드에서 값 추출 (우선순위: durationMinutes > travelTime > minutes > segmentMinutes)
  const rawValue = 
    segment?.durationMinutes ?? 
    segment?.travelTime ?? 
    segment?.minutes ?? 
    segment?.segmentMinutes ?? 
    undefined;
  
  // null, undefined, 빈 문자열 체크
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return {
      from: String(segment?.from ?? ''),
      to: String(segment?.to ?? ''),
      line: String(segment?.line ?? '1'),
      travelTime: defaultValue,
      durationMinutes: defaultValue,
      minutes: defaultValue,
      segmentMinutes: defaultValue,
      congestion: Number.isFinite(Number(segment?.congestion)) && Number(segment?.congestion) > 0
        ? Math.round(Number(segment?.congestion))
        : 2,
      isTransfer: isTransfer,
    };
  }
  
  // Number로 변환
  const numValue = Number(rawValue);
  
  // 안전한 minutes 값 계산 (NaN, Infinity, 음수 체크)
  const safeMinutes = (
    typeof numValue === 'number' &&
    Number.isFinite(numValue) && 
    !isNaN(numValue) &&
    numValue > 0
  ) ? Math.round(numValue) : defaultValue;
  
  // 모든 시간 필드를 동일한 값으로 덮어쓰기
  return {
    from: String(segment?.from ?? ''),
    to: String(segment?.to ?? ''),
    line: String(segment?.line ?? '1'),
    travelTime: safeMinutes,
    durationMinutes: safeMinutes,
    minutes: safeMinutes,
    segmentMinutes: safeMinutes,
    congestion: Number.isFinite(Number(segment?.congestion)) && Number(segment?.congestion) > 0
      ? Math.round(Number(segment?.congestion))
      : 2,
    isTransfer: isTransfer,
  };
}

// Route 정규화 함수
// segments 또는 detail.perSegment 중 실제 존재하는 배열을 가져온다
// 모든 segment를 normalizeSegment로 맵핑한다
// totalTravelMinutes = segment 합산(숫자인 경우만)
// route.travelTime, route.totalTravelMinutes를 safeTotal로 덮어쓴다
// detail.perSegment와 segments 둘 다 정규화된 배열로 넣는다
function normalizeRoute(route: any): any {
  // segments 또는 detail.perSegment 중 실제 존재하는 배열 가져오기
  const rawSegments = route?.segments ?? route?.detail?.perSegment ?? [];
  
  // 모든 segment를 normalizeSegment로 맵핑
  const normalizedSegments = Array.isArray(rawSegments)
    ? rawSegments.map(normalizeSegment)
    : [];
  
  // totalTravelMinutes = segment 합산(숫자인 경우만) - 요구사항에 따라 재계산
  const sumFromSegments = normalizedSegments.reduce((sum, seg) => {
    // normalizeSegment에서 이미 정규화된 durationMinutes 사용
    const segTime = Number(seg.durationMinutes);
    if (Number.isFinite(segTime) && segTime > 0) {
      return sum + segTime;
    }
    return sum;
  }, 0);
  
  // route.travelTime 또는 route.totalTravelMinutes에서 값 추출
  const rawTotal = Number(route?.totalTravelMinutes ?? route?.travelTime ?? 0);
  
  // 안전한 총 시간 계산 (요구사항에 따라)
  // 유효한 숫자면 그대로 사용, 아니면 segments에서 재계산
  const safeTotal = (() => {
    if (Number.isFinite(rawTotal) && rawTotal > 0) {
      return Math.round(rawTotal);
    }
    // segments에서 재계산
    return sumFromSegments > 0 ? Math.round(sumFromSegments) : 0;
  })();
  
  // 정규화된 route 반환
  // rawSubPath는 반드시 보존해야 함 (프론트엔드에서 subPaths 생성에 필요)
  const normalizedRoute = {
    ...route,
    travelTime: safeTotal,
    totalTravelMinutes: safeTotal,
    segments: normalizedSegments,
    detail: {
      ...route?.detail,
      perSegment: normalizedSegments,
    },
  };
  
  // rawSubPath가 있으면 명시적으로 보존 (스프레드 연산자로는 보존되지 않을 수 있음)
  if (route?.rawSubPath && Array.isArray(route.rawSubPath) && route.rawSubPath.length > 0) {
    normalizedRoute.rawSubPath = route.rawSubPath;
  }
  
  return normalizedRoute;
}

export async function POST(request: NextRequest) {
  try {
    const { startStation, endStation, timestamp } = await request.json();

    if (!startStation || !endStation) {
      logger.warn('경로 API: 필수 파라미터 누락', { startStation, endStation });
      return NextResponse.json(
        { error: '출발역과 도착역을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 안전한 Date 파싱
    let departureTime: Date | undefined;
    if (timestamp) {
      const dt = new Date(timestamp);
      if (isNaN(dt.getTime())) {
        logger.warn('경로 API: 잘못된 타임스탬프', { timestamp });
        return NextResponse.json(
          { error: '잘못된 출발 시간입니다.' },
          { status: 400 }
        );
      }
      departureTime = dt;
    }

    // 네이버 지도 API를 사용한 경로 탐색 (실패 시 내부 그래프 기반 경로 탐색으로 fallback)
    let routes: any[] = [];
    try {
      logger.info('경로 API: 네이버 API 호출 시작', { startStation, endStation, departureTime });
      routes = await findRoutesWithNaver(startStation, endStation, departureTime);
      logger.info('경로 API: 네이버 API 호출 완료', { routeCount: routes.length });
    } catch (naverError) {
      logger.warn('경로 API: 네이버 API 호출 실패, 내부 그래프 기반 경로 탐색으로 fallback', {
        startStation,
        endStation,
        departureTime,
        errorMessage: (naverError as Error)?.message,
      });
      
      // 네이버 API 실패 시 내부 그래프 기반 경로 탐색 사용
      try {
        logger.info('경로 API: 내부 그래프 기반 경로 탐색 시작', { startStation, endStation, departureTime });
        const graphRoutes = await findRoutes(startStation, endStation, departureTime);
        logger.info('경로 API: 내부 그래프 기반 경로 탐색 완료', { routeCount: graphRoutes.length });
        
        // GraphRouteResult를 RouteResult 형식으로 변환
        routes = graphRoutes.map((gr, idx) => ({
          id: `graph-${Date.now()}-${idx}`,
          type: gr.type || 'fastest',
          stations: gr.stations || [],
          stationIds: gr.stationIds || [],
          totalTravelMinutes: gr.totalTravelMinutes || gr.travelTime || 0,
          travelTime: gr.travelTime || gr.totalTravelMinutes || 0,
          transfers: gr.transfers || 0,
          congestionScore: gr.congestionScore || 0,
          fare: gr.fare || 0,
          detail: {
            perSegment: gr.detail?.perSegment || [],
          },
          rawSubPath: undefined, // 그래프 기반 경로는 rawSubPath 없음
        }));
      } catch (graphError) {
        logger.error('경로 API: 내부 그래프 기반 경로 탐색도 실패', graphError as Error, {
          startStation,
          endStation,
          departureTime,
        });
        return NextResponse.json(
          { 
            success: false,
            error: '경로 탐색 중 오류가 발생했습니다.',
            message: '네이버 API와 내부 경로 탐색 모두 실패했습니다.'
          },
          { status: 500 }
        );
      }
    }
    
    // 네이버 API가 빈 배열을 반환한 경우에도 내부 그래프 기반 경로 탐색 시도
    if (routes.length === 0) {
      logger.warn('경로 API: 네이버 API가 빈 경로 반환, 내부 그래프 기반 경로 탐색으로 fallback', { 
        startStation, 
        endStation, 
        departureTime,
      });
      
      try {
        logger.info('경로 API: 내부 그래프 기반 경로 탐색 시작 (빈 경로 fallback)', { startStation, endStation, departureTime });
        const graphRoutes = await findRoutes(startStation, endStation, departureTime);
        logger.info('경로 API: 내부 그래프 기반 경로 탐색 완료 (빈 경로 fallback)', { routeCount: graphRoutes.length });
        
        // GraphRouteResult를 RouteResult 형식으로 변환
        routes = graphRoutes.map((gr, idx) => ({
          id: `graph-${Date.now()}-${idx}`,
          type: gr.type || 'fastest',
          stations: gr.stations || [],
          stationIds: gr.stationIds || [],
          totalTravelMinutes: gr.totalTravelMinutes || gr.travelTime || 0,
          travelTime: gr.travelTime || gr.totalTravelMinutes || 0,
          transfers: gr.transfers || 0,
          congestionScore: gr.congestionScore || 0,
          fare: gr.fare || 0,
          detail: {
            perSegment: gr.detail?.perSegment || [],
          },
          rawSubPath: undefined, // 그래프 기반 경로는 rawSubPath 없음
        }));
      } catch (graphError) {
        logger.error('경로 API: 내부 그래프 기반 경로 탐색도 실패 (빈 경로 fallback)', graphError as Error, {
          startStation,
          endStation,
          departureTime,
        });
        return NextResponse.json(
          { 
            success: false,
            message: '경로를 찾을 수 없습니다. 역 이름을 확인해주세요.' 
          },
          { status: 200 } // 404 대신 200으로 반환하고 success: false로 표시
        );
      }
    }
    
    // 모든 route를 normalizeRoute로 정규화 (시간 필드만 정규화, rawSubPath는 보존)
    const normalizedRoutes = routes.map(normalizeRoute);

    logger.info('경로 API: 경로 탐색 성공', { 
      startStation, 
      endStation, 
      routeCount: normalizedRoutes.length 
    });
    
    return NextResponse.json({ success: true, routes: normalizedRoutes });
  } catch (error) {
    logger.error('경로 API: 서버 오류 발생', error as Error);
    return NextResponse.json(
      { error: '경로 탐색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
