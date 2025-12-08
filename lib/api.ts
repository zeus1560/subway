// 서울 지하철 혼잡도 예측 및 경로 탐색 API

import { logger } from './logger';
import { getStationByName, getStationById, type LineId } from './subwayMapData';
import { RouteResult as GraphRouteResult } from './graph/types';
import { findKShortestPaths, type RouteNode } from './routeAlgorithm';
import { getSubwayGraph } from './graph/buildSubwayGraph';

// API 키 (환경 변수에서 가져오기)
const API_KEY = process.env.NEXT_PUBLIC_SEOUL_API_KEY || '';

// 역 이름으로 역 ID 찾기
export function findStationIdByName(stationName: string): string | null {
  if (!stationName || stationName.trim() === '') {
    return null;
  }
  
  // "역" 제거 및 정규화
  const normalizedName = stationName.replace(/역$/, '').trim();
  
  // 정확한 매칭
  let station = getStationByName(normalizedName);
  if (station) {
    return station.id;
  }
  
  // "역" 포함 매칭
  station = getStationByName(stationName);
  if (station) {
    return station.id;
  }
  
  // 부분 매칭 (대소문자 무시)
  const { STATIONS } = require('./subwayMapData');
  station = STATIONS.find((s: any) => {
    const sName = s.name.toLowerCase();
    const searchName = normalizedName.toLowerCase();
    return sName.includes(searchName) || searchName.includes(sName);
  });
  
  if (station) {
    return station.id;
  }
  
  // 공백 제거 후 재시도
  const noSpaceName = normalizedName.replace(/\s+/g, '');
  station = STATIONS.find((s: any) => {
    const sName = s.name.replace(/\s+/g, '').toLowerCase();
    return sName === noSpaceName.toLowerCase();
  });
  
  if (station) {
    return station.id;
  }
  
  logger.warn('역을 찾을 수 없음', { stationName, normalizedName });
  return null;
}

// 역 ID로 역 이름 찾기
export function findStationNameById(stationId: string): string | null {
  const station = getStationById(stationId);
  return station ? station.name : null;
}

// 혼잡도 레벨 계산
export interface CongestionLevel {
  level: string;
  color: string;
  value: number;
}

export const calculateCongestionLevel = (
  passengerCount: number, 
  capacity: number = 1000
): CongestionLevel => {
  const ratio = passengerCount / capacity;

  if (ratio < 0.3) {
    return { level: '여유', color: '#4CAF50', value: 1 };
  } else if (ratio < 0.6) {
    return { level: '보통', color: '#FFC107', value: 2 };
  } else if (ratio < 0.8) {
    return { level: '혼잡', color: '#FF9800', value: 3 };
  } else {
    return { level: '매우 혼잡', color: '#F44336', value: 4 };
  }
};

// 서울 열린데이터 광장 API 호출 (타임아웃 및 에러 처리 개선)
export async function getStationCongestion(
  stationName: string,
  lineNum: string,
  timeout: number = 5000 // 기본 5초 타임아웃
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/CardSubwayStatsNew/1/5/${encodeURIComponent(stationName)}/${encodeURIComponent(lineNum)}`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`서울시 API 응답 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // API 응답 에러 체크 (RESULT가 있는 경우에만)
    const result = data.CardSubwayStatsNew?.RESULT;
    if (result) {
      // RESULT가 있고 CODE가 'INFO-000'이 아니면 에러
      if (result.CODE && result.CODE !== 'INFO-000') {
        // 데이터가 없을 때는 한 번만 경고하고 조용히 null 반환
        // (이미 경고가 찍혔는지 확인하는 로직은 호출자에서 처리)
        return null;
      }
    } else {
      // RESULT가 없으면 정상 응답일 가능성이 높음 (일부 API는 RESULT 없이 데이터만 반환)
      // row 데이터가 있는지 확인
      const hasData = data.CardSubwayStatsNew?.row && Array.isArray(data.CardSubwayStatsNew.row) && data.CardSubwayStatsNew.row.length > 0;
      if (!hasData) {
        // 데이터가 없으면 조용히 null 반환 (경고는 호출자에서 한 번만)
        return null;
      }
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // 타임아웃 에러
    if (error.name === 'AbortError') {
      logger.warn('역 혼잡도 조회 타임아웃', { stationName, lineNum, timeout });
      throw new Error(`서울시 API 요청 타임아웃 (${timeout}ms)`);
    }
    
    // 네트워크 에러
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logger.warn('역 혼잡도 조회 네트워크 에러', { stationName, lineNum, error: error.message });
      throw new Error('서울시 API 서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
    }
    
    logger.error('역 혼잡도 조회 실패', error as Error, { stationName, lineNum });
    throw error;
  }
}

// 경고를 한 번만 찍기 위한 플래그 (모듈 레벨)
let hasWarnedAboutMissingData = false;

// 역 혼잡도 레벨 조회 (예측 포함)
export async function getStationCongestionLevel(
  stationId: string,
  stationName: string,
  lineNum: string,
  currentTime: Date
): Promise<{ congestion: string; level: number; passengerCount?: number }> {

  try {
    // 실시간 데이터 조회 (타임아웃 5초)
    const data = await getStationCongestion(stationName, lineNum, 5000);
    
    // 데이터가 없으면 한 번만 경고하고 기본값 반환
    if (!data || !data.CardSubwayStatsNew?.row || data.CardSubwayStatsNew.row.length === 0) {
      if (!hasWarnedAboutMissingData) {
        logger.warn('서울시 혼잡도 API 응답에 데이터 없음 (이후 조용히 처리)', {
          stationName,
          lineNum,
        });
        hasWarnedAboutMissingData = true;
      }
      return {
        congestion: '정보 없음',
        level: 0,
        passengerCount: 0,
      };
    }
    
    const passengerCount = data.CardSubwayStatsNew.row[0]?.RIDE_PASGR_NUM || 500;
    const congestion = calculateCongestionLevel(passengerCount);
    
    return {
      congestion: congestion.level,
      level: congestion.value,
      passengerCount,
    };
  } catch (error: any) {
    // 타임아웃이나 네트워크 에러 시 기본값 반환 (앱이 중단되지 않도록)
    // 경고는 한 번만
    if (!hasWarnedAboutMissingData) {
      logger.warn('역 혼잡도 조회 실패, 기본값 사용 (이후 조용히 처리)', { 
        stationId, 
        stationName, 
        lineNum, 
        error: error?.message || String(error) 
      });
      hasWarnedAboutMissingData = true;
    }
    return {
      congestion: '정보 없음',
      level: 0,
      passengerCount: 0,
    };
  }
}

// 예측 함수 (간단한 버전)
export function predictCongestion(
  current: { passengerCount: number },
  historical: Array<{ passengerCount: number }>
): { predictedPassengerCount: number } {
  if (historical.length === 0) {
    return { predictedPassengerCount: current.passengerCount };
  }
  
  const avgHistorical = historical.reduce((sum, h) => sum + h.passengerCount, 0) / historical.length;
  const predicted = (current.passengerCount * 0.7) + (avgHistorical * 0.3);
  
  return { predictedPassengerCount: Math.round(predicted) };
}

// 향상된 예측 함수 (캐시 사용)
export async function predictCongestionEnhanced(
  stationId: string,
  stationName: string,
  lineNum: string,
  currentTime: Date,
  currentPassengerCount?: number
): Promise<{ predictedPassengerCount: number; congestion: string; level: number }> {
  try {
    // 현재 데이터 조회
    const currentData = currentPassengerCount 
      ? { passengerCount: currentPassengerCount }
      : await getStationCongestion(stationName, lineNum).then(data => ({
          passengerCount: data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500
        }));
    
    // 간단한 예측 (실제로는 캐시 데이터 사용)
    const predicted = predictCongestion(currentData, [currentData]);
    const congestion = calculateCongestionLevel(predicted.predictedPassengerCount);
    
    return {
      predictedPassengerCount: predicted.predictedPassengerCount,
      congestion: congestion.level,
      level: congestion.value,
    };
  } catch (error) {
    logger.error('향상된 예측 실패', error as Error, { stationId, stationName, lineNum });
    return {
      predictedPassengerCount: 500,
      congestion: '보통',
      level: 2,
    };
  }
}

// 기존 경로 탐색 함수 (하위 호환성 유지)
export interface RouteResult {
  type: 'fastest' | 'lessTransfer' | 'lessCrowded';
  stations: string[];
  stationIds: string[];
  travelTime: number;
  totalTravelMinutes?: number; // 총 소요 시간 (분)
  transfers: number;
  congestionScore: number;
  fare: number;
  lines: string[];
  detail: {
    perSegment: Array<{
      from: string;
      to: string;
      line: string;
      travelTime: number;
      durationMinutes?: number; // 구간 소요 시간 (분)
      minutes?: number; // 구간 소요 시간 (분) - 호환성
      segmentMinutes?: number; // 구간 소요 시간 (분) - 호환성
      congestion: number;
      isTransfer: boolean;
    }>;
  };
  stationCongestions?: Array<{
    stationName: string;
    level: number;
  }>;
  stationLines?: Array<{
    station: string;
    line: string;
  }>;
  // 네이버 API 원본 subPath 정보 (정규화용)
  rawSubPath?: Array<{
    trafficType: number; // 1: 지하철, 2: 버스, 3: 도보
    sectionTime: number; // 구간 소요 시간 (초)
    startName?: string;
    endName?: string;
    lane?: Array<{
      name?: string; // 노선명 (예: "5호선")
      busNo?: string; // 버스 번호
    }>;
  }>;
}

export async function findLessCrowdedRoute(
  startStation: string,
  endStation: string,
  timestamp?: Date,
  options?: {
    maxTransfers?: number;
    preferLessCrowded?: boolean;
    maxRoutes?: number;
  }
): Promise<RouteResult[]> {
  // 새로운 그래프 기반 findRoutes 사용
  const routes = await findRoutes(startStation, endStation, timestamp);
  
  // RouteResult 형식으로 변환
  return routes.map(route => ({
    ...route,
    stationCongestions: route.stations.map(stationName => ({
      stationName,
      level: 2, // 기본값, 실제로는 혼잡도 조회 필요
    })),
  }));
}

// Section 타입 정의
type Section = {
  line: LineId;
  fromStationId: string;
  toStationId: string;
  stationIds: string[];   // 포함된 역 id 리스트 (from~to 포함)
};

// RouteNode에서 SubwayGraph edge 기반으로 섹션 생성
function buildSectionsFromRoute(route: RouteNode): Section[] {
  const graph = getSubwayGraph();
  const sections: Section[] = [];
  const path = route.path;

  if (!path || path.length < 2) return sections;

  let current: Section | null = null;

  for (let i = 0; i < path.length - 1; i++) {
    const fromId = path[i];
    const toId = path[i + 1];

    const node = graph.nodes.get(fromId);
    if (!node) continue;

    // fromId -> toId 로 가는 edge 를 찾는다.
    const edge = node.neighbors.find((e) => e.to === toId);
    if (!edge) continue;

    const line = edge.line as LineId;
    const isTransfer = edge.isTransfer === true;

    // 1) 환승 이동인 경우: 현재 섹션만 종료하고, 새 섹션은 만들지 않는다.
    if (isTransfer) {
      if (current) {
        current.toStationId = fromId;
        // 나중에 필터링하니 일단 push
        sections.push(current);
        current = null;
      }
      // 환승 이동 구간은 별도 섹션으로 만들지 않는다.
      continue;
    }

    // 2) 일반 이동(edge.isTransfer === false)인 경우
    if (!current || current.line !== line) {
      // 라인이 바뀌면 이전 섹션을 종료하고 새 섹션 시작
      if (current) {
        current.toStationId = fromId;
        sections.push(current);
      }
      current = {
        line,
        fromStationId: fromId,
        toStationId: toId,
        stationIds: [fromId, toId],
      };
    } else {
      // 같은 라인에서 연속 이동이면 현재 섹션을 확장
      current.toStationId = toId;
      if (!current.stationIds.includes(toId)) {
        current.stationIds.push(toId);
      }
    }
  }

  if (current) {
    sections.push(current);
  }

  // 3) 실질적인 이동이 없는 "단일 역 섹션" 제거
  const filtered = sections.filter((sec) => {
    if (sec.fromStationId === sec.toStationId) return false;
    if (!sec.stationIds || sec.stationIds.length < 2) return false;
    return true;
  });

  return filtered;
}

// RouteNode를 GraphRouteResult로 변환하는 헬퍼 함수
function convertRouteNodeToGraphRouteResult(
  routeNode: RouteNode | null,
  type: 'fastest' | 'lessTransfer' | 'lessCrowded'
): GraphRouteResult | null {
  if (!routeNode) return null;

  // 전체 경로 역 이름 목록
  const stations = routeNode.path.map(id => {
    const station = getStationById(id);
    return station ? station.name : id;
  });

  // 섹션 생성
  const sections = buildSectionsFromRoute(routeNode);
  const graph = getSubwayGraph();

  const perSegment: Array<{
    from: string;
    to: string;
    line: LineId;
    travelTime: number;
    durationMinutes: number;
    congestion: number;
    isTransfer: boolean;
    stations: string[];    // 섹션 내 모든 역 이름
    stationIds: string[];  // 섹션 내 모든 역 ID
    stationCount: number;  // 역 개수
  }> = [];

  for (const section of sections) {
    const fromStation = getStationById(section.fromStationId);
    const toStation = getStationById(section.toStationId);

    const fromName = fromStation?.name || section.fromStationId;
    const toName = toStation?.name || section.toStationId;

    // 섹션에 포함된 역 ID 목록
    const stationIdsInSection =
      section.stationIds && section.stationIds.length > 0
        ? section.stationIds
        : [section.fromStationId, section.toStationId].filter(Boolean);

    // ID → 이름 변환
    const stationNamesInSection = stationIdsInSection.map(id => {
      const st = getStationById(id);
      return st ? st.name : id;
    });

    // 섹션 시간 합산
    let totalTravelTime = 0;
    for (let i = 0; i < stationIdsInSection.length - 1; i++) {
      const fromId = stationIdsInSection[i];
      const toId = stationIdsInSection[i + 1];

      const node = graph.nodes.get(fromId);
      if (!node) continue;

      const edge = node.neighbors.find(e => e.to === toId);
      if (edge && !edge.isTransfer) {
        totalTravelTime += edge.travelTime;
      }
    }

    if (totalTravelTime === 0) {
      totalTravelTime = 2; // 기본 2분
    }

    perSegment.push({
      from: fromName,
      to: toName,
      line: section.line as LineId,
      travelTime: totalTravelTime,
      durationMinutes: totalTravelTime,
      congestion: 2,
      isTransfer: false,
      stations: stationNamesInSection,
      stationIds: stationIdsInSection,
      stationCount: stationIdsInSection.length,
    });
  }

  // 요금 계산
  const estimatedDistance = (routeNode.path.length - 1) * 1.2;
  let fare = 1400;
  if (estimatedDistance > 10) {
    const extraDistance = estimatedDistance - 10;
    const extraFare = Math.ceil(extraDistance / 5) * 100;
    fare += extraFare;
  }
  fare = Math.min(fare, 2000);

  // 사용한 노선 목록 추출
  const lines = Array.from(
    new Set(
      perSegment.map(seg => seg.line).filter(Boolean)
    )
  ) as LineId[];

  return {
    type,
    stations,
    stationIds: routeNode.path,
    travelTime: routeNode.totalTime,
    totalTravelMinutes: routeNode.totalTime,
    transfers: routeNode.transferCount,
    congestionScore: routeNode.totalCongestion,
    fare,
    lines,
    detail: {
      perSegment,
    },
  };
}

// 새로운 그래프 기반 경로 탐색 함수 (routeAlgorithm.ts 직접 호출)
export async function findRoutes(
  startStation: string,
  endStation: string,
  timestamp?: Date,
  options?: {
    preferLessCrowded?: boolean;
    preferLessTransfer?: boolean;
    preferMinTime?: boolean;
    maxTransfers?: number;
    maxRoutes?: number;
  }
): Promise<GraphRouteResult[]> {
  try {
    const routeOption = options?.preferMinTime 
      ? 'minTime' 
      : options?.preferLessTransfer 
      ? 'lessTransfer'
      : options?.preferLessCrowded
      ? 'lessCrowded'
      : 'optimal';
    
    logger.info('경로 탐색 시작 (routeAlgorithm.ts 직접 호출)', { 
      startStation, 
      endStation, 
      timestamp,
      routeOption,
      options,
    });
    
    // 역 이름을 역 ID로 변환
    const startId = findStationIdByName(startStation);
    const endId = findStationIdByName(endStation);
    
    if (!startId) {
      logger.warn('출발역을 찾을 수 없음', { startStation });
      return [];
    }
    
    if (!endId) {
      logger.warn('도착역을 찾을 수 없음', { endStation });
      return [];
    }
    
    if (startId === endId) {
      logger.info('출발역과 도착역이 같음', { startStation, endStation });
      return [];
    }
    
    logger.info('역 ID 변환 완료', { startStation, startId, endStation, endId });
    
    // 출발 시간 (없으면 현재 시간)
    const departureTime = timestamp || new Date();
    
    // routeAlgorithm.ts의 findKShortestPaths 직접 호출
    logger.info('경로 탐색 시작 (routeAlgorithm.ts)', { startId, endId, options });
    const routeNodes = await findKShortestPaths(
      startId,
      endId,
      departureTime,
      options?.maxRoutes ?? 3,
      {
        preferLessCrowded: options?.preferLessCrowded,
        preferLessTransfer: options?.preferLessTransfer,
        preferMinTime: options?.preferMinTime,
        maxTransfers: options?.maxTransfers ?? 5,
        maxRoutes: options?.maxRoutes ?? 3,
      }
    );
    
    // RouteNode를 GraphRouteResult로 변환
    const routes: GraphRouteResult[] = [];
    
    for (let i = 0; i < routeNodes.length; i++) {
      const routeNode = routeNodes[i];
      let routeType: 'fastest' | 'lessTransfer' | 'lessCrowded' = 'fastest';
      
      // 첫 번째 경로는 옵션에 따라 타입 결정
      if (i === 0) {
        if (options?.preferMinTime) {
          routeType = 'fastest';
        } else if (options?.preferLessTransfer) {
          routeType = 'lessTransfer';
        } else if (options?.preferLessCrowded) {
          routeType = 'lessCrowded';
        } else {
          // 기본: 환승이 가장 적은 경로
          routeType = routeNode.transferCount <= 1 ? 'lessTransfer' : 'fastest';
        }
      } else {
        // 나머지 경로는 환승 수에 따라 타입 결정
        if (routeNode.transferCount <= 1) {
          routeType = 'lessTransfer';
        } else if (routeNode.totalCongestion < 10) {
          routeType = 'lessCrowded';
        } else {
          routeType = 'fastest';
        }
      }
      
      const converted = convertRouteNodeToGraphRouteResult(routeNode, routeType);
      if (converted) {
        routes.push(converted);
      }
    }
    
    logger.info('경로 탐색 완료', { 
      routeCount: routes.length,
      startStation,
      endStation,
      routeOption,
      routes: routes.map((r, idx) => ({ 
        순위: idx + 1,
        type: r.type, 
        stations: r.stations.length, 
        time: r.travelTime,
        transfers: r.transfers,
        congestion: r.congestionScore,
      }))
    });
    
    return routes;
  } catch (error) {
    logger.error('경로 탐색 중 오류 발생', error as Error, { startStation, endStation });
    return [];
  }
}
