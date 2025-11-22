// 네이버 지도 API를 사용한 경로 탐색

import { logger } from './logger';
import { RouteResult } from './api';

// 네이버 지도 API 키 (이미지에서 확인한 값)
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || 'dfhei54ffz';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET || 'HCovfrJnRXfyTld86qldckGkDkr6SICcNrBGppkb';

// 네이버 지도 대중교통 API 엔드포인트
// 참고: 네이버 클라우드 플랫폼 Directions API v1
// 대중교통 경로 탐색은 /v1/transit 엔드포인트 사용
// 참고: https://api.ncloud-docs.com/docs/ai-naver-mapsdirection
// 실제 엔드포인트는 map-direction-15 또는 map-direction일 수 있음
const NAVER_DIRECTIONS_API = 'https://naveropenapi.apigw.ntruss.com/map-direction-15/v1/transit';

// 네이버 API 응답 타입
interface NaverSubPath {
  trafficType: number; // 1: 지하철, 2: 버스, 3: 도보
  sectionTime: number; // 구간 소요 시간 (초)
  distance: number; // 거리 (미터)
  startName?: string; // 출발지 이름
  endName?: string; // 도착지 이름
  lane?: Array<{
    name?: string; // 노선명 (예: "5호선")
    busNo?: string; // 버스 번호
    subwayCode?: number; // 지하철 코드
  }>;
  passStopList?: {
    stations?: Array<{
      stationName: string;
      stationId?: string;
    }>;
  };
}

interface NaverRoute {
  summary: {
    start: {
      name: string;
      x: number;
      y: number;
    };
    goal: {
      name: string;
      x: number;
      y: number;
    };
    distance: number; // 총 거리 (미터)
    duration: number; // 총 소요 시간 (초)
    departureTime: string; // 출발 시간
    arrivalTime: string; // 도착 시간
    fare: {
      regular: {
        totalFare: number; // 총 요금
      };
    };
    subwayTransitCount?: number; // 지하철 환승 횟수
    busTransitCount?: number; // 버스 환승 횟수
  };
  path: Array<{
    subPath: NaverSubPath[];
  }>;
}

interface NaverDirectionsResponse {
  code: number;
  message: string;
  currentDateTime: string;
  route: {
    trafast?: NaverRoute[]; // 최단 시간
    tracomfort?: NaverRoute[]; // 최소 환승
    traavoid?: NaverRoute[]; // 회피 경로
  };
}

/**
 * 네이버 지도 API를 사용하여 경로 탐색
 */
export async function findRoutesWithNaver(
  startStation: string,
  endStation: string,
  timestamp?: Date
): Promise<RouteResult[]> {
  try {
    logger.info('네이버 지도 API: 경로 탐색 시작', { startStation, endStation, timestamp });

    // 역 이름 정규화 ("역" 추가, 공백 처리)
    const normalizeStationName = (name: string): string => {
      let normalized = name.trim();
      // "역"이 없으면 추가 (단, 이미 "역"으로 끝나면 그대로)
      if (!normalized.endsWith('역')) {
        normalized = normalized + '역';
      }
      return normalized;
    };

    const normalizedStart = normalizeStationName(startStation);
    const normalizedEnd = normalizeStationName(endStation);

    logger.info('네이버 지도 API: 역 이름 정규화', { 
      original: { startStation, endStation },
      normalized: { normalizedStart, normalizedEnd }
    });

    // 출발 시간 포맷팅 (YYYYMMDDHHmm) - 한국 시간대 고려
    const departureTime = timestamp || new Date();
    // UTC 시간을 한국 시간대로 변환 (Asia/Seoul = UTC+9)
    const koreaTime = new Date(departureTime.getTime() + (9 * 60 * 60 * 1000));
    const year = koreaTime.getUTCFullYear();
    const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getUTCDate()).padStart(2, '0');
    const hour = String(koreaTime.getUTCHours()).padStart(2, '0');
    const minute = String(koreaTime.getUTCMinutes()).padStart(2, '0');
    const timeString = `${year}${month}${day}${hour}${minute}`;
    
    logger.info('네이버 지도 API: 출발 시간 변환', {
      original: departureTime.toISOString(),
      koreaTime: koreaTime.toISOString(),
      timeString
    });

    // API 요청 URL 구성
    const params = new URLSearchParams({
      start: normalizedStart,
      goal: normalizedEnd,
      departureTime: timeString,
    });

    const url = `${NAVER_DIRECTIONS_API}?${params.toString()}`;

    logger.info('네이버 지도 API: 요청 URL', { url: url.replace(NAVER_CLIENT_SECRET, '***') });

    // API 요청
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET,
      },
    });

    const responseText = await response.text();
    logger.info('네이버 지도 API: 응답 상태', { 
      status: response.status, 
      statusText: response.statusText,
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 500) // 응답 미리보기
    });

    if (!response.ok) {
      logger.error('네이버 지도 API: 요청 실패', new Error(responseText), {
        status: response.status,
        statusText: response.statusText,
        startStation: normalizedStart,
        endStation: normalizedEnd,
        url: url.replace(NAVER_CLIENT_SECRET, '***'),
        responseText: responseText.substring(0, 1000),
      });
      throw new Error(`네이버 지도 API 요청 실패: ${response.status} - ${responseText.substring(0, 200)}`);
    }

    let data: NaverDirectionsResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('네이버 지도 API: JSON 파싱 실패', parseError as Error, {
        responseText: responseText.substring(0, 500),
      });
      throw new Error('네이버 지도 API 응답 파싱 실패');
    }

    // 원본 JSON 구조 확인 (디버깅용)
    console.log('[NAVER RAW]', JSON.stringify(data, null, 2));

    // 응답 데이터 상세 로깅
    const responseInfo: any = {
      code: data.code,
      message: data.message,
      hasRoute: !!data.route,
      hasTrafast: !!data.route?.trafast,
      hasTracomfort: !!data.route?.tracomfort,
      trafastCount: data.route?.trafast?.length || 0,
      tracomfortCount: data.route?.tracomfort?.length || 0,
      routeKeys: data.route ? Object.keys(data.route) : [],
    };
    
    // trafast/tracomfort 첫 번째 항목의 path 정보도 확인
    if (data.route?.trafast?.[0]?.path?.[0]) {
      const firstPath = data.route.trafast[0].path[0];
      responseInfo.trafastFirstPath = {
        hasPath: !!firstPath,
        hasSubPath: !!firstPath.subPath,
        subPathLength: firstPath.subPath?.length || 0,
      };
    }
    if (data.route?.tracomfort?.[0]?.path?.[0]) {
      const firstPath = data.route.tracomfort[0].path[0];
      responseInfo.tracomfortFirstPath = {
        hasPath: !!firstPath,
        hasSubPath: !!firstPath.subPath,
        subPathLength: firstPath.subPath?.length || 0,
      };
    }
    
    logger.info('네이버 지도 API: 응답 데이터', responseInfo);

    if (data.code !== 0) {
      logger.warn('네이버 지도 API: 경로를 찾을 수 없음', {
        code: data.code,
        message: data.message,
        startStation: normalizedStart,
        endStation: normalizedEnd,
      });
      return [];
    }

    // route가 없거나 trafast/tracomfort가 모두 없으면 빈 배열 반환
    if (!data.route || (!data.route.trafast && !data.route.tracomfort)) {
      logger.warn('네이버 지도 API: route 또는 trafast/tracomfort가 없음', {
        hasRoute: !!data.route,
        hasTrafast: !!data.route?.trafast,
        hasTracomfort: !!data.route?.tracomfort,
        startStation: normalizedStart,
        endStation: normalizedEnd,
      });
      return [];
    }

    // path[0]만 사용하여 단 하나의 RouteResult 생성
    let targetPath: { subPath: NaverSubPath[] } | null = null;
    let targetSummary: NaverRoute['summary'] | null = null;
    
    // trafast의 첫 번째 route의 첫 번째 path 사용
    if (data.route.trafast && data.route.trafast.length > 0) {
      const firstRoute = data.route.trafast[0];
      if (firstRoute.path && firstRoute.path.length > 0) {
        targetPath = firstRoute.path[0];
        targetSummary = firstRoute.summary;
      }
    }
    
    // trafast가 없으면 tracomfort 사용
    if (!targetPath && data.route.tracomfort && data.route.tracomfort.length > 0) {
      const firstRoute = data.route.tracomfort[0];
      if (firstRoute.path && firstRoute.path.length > 0) {
        targetPath = firstRoute.path[0];
        targetSummary = firstRoute.summary;
      }
    }
    
    // path가 없으면 빈 배열 반환
    if (!targetPath || !targetSummary) {
      logger.warn('네이버 지도 API: path를 찾을 수 없음', {
        hasTrafast: !!data.route?.trafast,
        hasTracomfort: !!data.route?.tracomfort,
        trafastPathCount: data.route?.trafast?.[0]?.path?.length || 0,
        tracomfortPathCount: data.route?.tracomfort?.[0]?.path?.length || 0,
      });
      return [];
    }
    
    // path[0]만 사용하여 RouteResult 생성
    const converted = buildRouteFromPath(targetPath, targetSummary, 0);
    
    if (!converted) {
      logger.warn('네이버 지도 API: 경로 변환 실패');
      return [];
    }
    
    logger.info('네이버 지도 API: 경로 탐색 완료 (path[0]만 사용)', {
      routeCount: 1,
      startStation,
      endStation,
      route: {
        time: converted.totalTravelMinutes,
        transfers: converted.transfers,
        fare: converted.fare,
        lines: converted.lines,
      }
    });

    return [converted];
  } catch (error) {
    logger.error('네이버 지도 API: 경로 탐색 중 오류', error as Error, {
      startStation,
      endStation,
    });
    return [];
  }
}

/**
 * 같은 지하철 호선(또는 같은 버스 노선)이 연속되는 subPath를 하나로 병합
 */
function mergeSubPaths(subPaths: NaverSubPath[]): NaverSubPath[] {
  if (subPaths.length === 0) return [];
  
  const merged: NaverSubPath[] = [];
  let current: NaverSubPath | null = null;
  
  for (const subPath of subPaths) {
    if (!current) {
      current = { ...subPath };
      continue;
    }
    
    // 같은 trafficType인지 확인
    if (current.trafficType !== subPath.trafficType) {
      merged.push(current);
      current = { ...subPath };
      continue;
    }
    
    // 지하철인 경우: subwayCode 또는 name이 같은지 확인
    if (subPath.trafficType === 1) {
      const currentSubwayCode = current.lane?.[0]?.subwayCode;
      const currentName = current.lane?.[0]?.name;
      const nextSubwayCode = subPath.lane?.[0]?.subwayCode;
      const nextName = subPath.lane?.[0]?.name;
      
      const isSameLine = 
        (currentSubwayCode && nextSubwayCode && currentSubwayCode === nextSubwayCode) ||
        (currentName && nextName && currentName === nextName);
      
      if (isSameLine) {
        // 병합: sectionTime 합산, 역 목록 합치기
        current.sectionTime += subPath.sectionTime;
        current.distance += subPath.distance;
        current.endName = subPath.endName || current.endName;
        
        // 역 목록 병합
        if (subPath.passStopList?.stations) {
          const currentStations = current.passStopList?.stations || [];
          const newStations = subPath.passStopList.stations.filter(
            newStation => !currentStations.some(
              existing => existing.stationName === newStation.stationName
            )
          );
          current.passStopList = {
            stations: [...currentStations, ...newStations]
          };
        }
        continue;
      }
    }
    
    // 버스인 경우: busNo가 같은지 확인
    if (subPath.trafficType === 2) {
      const currentBusNo = current.lane?.[0]?.busNo;
      const nextBusNo = subPath.lane?.[0]?.busNo;
      
      if (currentBusNo && nextBusNo && currentBusNo === nextBusNo) {
        // 병합
        current.sectionTime += subPath.sectionTime;
        current.distance += subPath.distance;
        current.endName = subPath.endName || current.endName;
        continue;
      }
    }
    
    // 도보는 항상 별도로 유지
    // 병합할 수 없으면 현재 것을 저장하고 새로 시작
    merged.push(current);
    current = { ...subPath };
  }
  
  if (current) {
    merged.push(current);
  }
  
  return merged;
}

/**
 * 가짜 환승 제거 및 왕복 경로 제거
 * - 같은 노선으로 되돌아오는 경우 제거
 * - 불필요한 환승 제거
 */
function removeFakeTransfers(segments: Array<{
  from: string;
  to: string;
  line: string;
  travelTime: number;
  durationMinutes: number;
  minutes?: number;
  segmentMinutes?: number;
  congestion: number;
  isTransfer: boolean;
  stationCount?: number;
}>): Array<{
  from: string;
  to: string;
  line: string;
  travelTime: number;
  durationMinutes: number;
  minutes?: number;
  segmentMinutes?: number;
  congestion: number;
  isTransfer: boolean;
  stationCount?: number;
}> {
  if (segments.length <= 1) return segments;

  const result: typeof segments = [];
  const lineHistory: string[] = []; // 지나온 노선 기록

  for (let i = 0; i < segments.length; i++) {
    const current = segments[i];
    const prev = i > 0 ? segments[i - 1] : null;
    const next = i < segments.length - 1 ? segments[i + 1] : null;

    // 도보 구간은 항상 유지
    if (current.line === '도보' || current.line.startsWith('버스')) {
      result.push(current);
      continue;
    }

    // 가짜 환승 체크: 이전 구간과 다음 구간이 같은 노선이면 현재 구간 제거
    if (prev && next && prev.line === next.line && prev.line === current.line) {
      // 같은 노선으로 되돌아오는 경우 - 현재 구간 제거하고 이전 구간을 다음 구간과 병합
      continue;
    }

    // 왕복 체크: 이미 지나온 노선으로 다시 돌아오는 경우
    if (lineHistory.includes(current.line)) {
      // 같은 노선을 다시 타는 경우 - 이전 구간과 병합 시도
      const lastIndex = result.length - 1;
      if (lastIndex >= 0 && result[lastIndex].line === current.line) {
        // 마지막 구간과 같은 노선이면 병합
        result[lastIndex].to = current.to;
        result[lastIndex].travelTime += current.travelTime;
        result[lastIndex].durationMinutes += current.durationMinutes;
        result[lastIndex].minutes = (result[lastIndex].minutes ?? 0) + (current.minutes ?? 0);
        result[lastIndex].segmentMinutes = (result[lastIndex].segmentMinutes ?? 0) + (current.segmentMinutes ?? 0);
        continue;
      }
    }

    // 정상 구간 추가
    result.push(current);
    if (!lineHistory.includes(current.line)) {
      lineHistory.push(current.line);
    }
  }

  // 환승 플래그 재설정
  return result.map((seg, idx) => ({
    ...seg,
    isTransfer: idx > 0 && seg.line !== '도보' && !seg.line.startsWith('버스'),
  }));
}

/**
 * 네이버 path 하나를 RouteResult로 변환 (간단한 버전)
 * mergeSubPaths로 병합된 subPath를 기반으로 RouteResult 생성
 */
function buildRouteFromPath(
  path: { subPath: NaverSubPath[] },
  summary: NaverRoute['summary'],
  index: number
): RouteResult | null {
  try {
    if (!path || !path.subPath || path.subPath.length === 0) {
      return null;
    }

    // 1. 같은 노선이 연속되는 subPath 병합
    const mergedSubPaths = mergeSubPaths(path.subPath);
    
    // 2. RouteResult의 subPaths 배열 생성
    const routeSubPaths: Array<{
      index: number;
      type: "subway" | "bus" | "walk";
      label: string;
      minutes: number;
      stations: string[];
    }> = [];
    
    const allStations: string[] = [];
    const allStationIds: string[] = [];
    
    mergedSubPaths.forEach((subPath, idx) => {
      const sectionTimeMinutes = Math.round(subPath.sectionTime / 60);
      const stations: string[] = [];
      
      // 역 목록 추출
      if (subPath.passStopList?.stations) {
        for (const station of subPath.passStopList.stations) {
          if (station.stationName) {
            stations.push(station.stationName);
            if (!allStations.includes(station.stationName)) {
              allStations.push(station.stationName);
            }
            if (station.stationId && !allStationIds.includes(station.stationId)) {
              allStationIds.push(station.stationId);
            }
          }
        }
      } else {
        // passStopList가 없으면 startName, endName만 사용
        if (subPath.startName) {
          stations.push(subPath.startName);
          if (!allStations.includes(subPath.startName)) {
            allStations.push(subPath.startName);
          }
        }
        if (subPath.endName && !stations.includes(subPath.endName)) {
          stations.push(subPath.endName);
          if (!allStations.includes(subPath.endName)) {
            allStations.push(subPath.endName);
          }
        }
      }
      
      let type: "subway" | "bus" | "walk";
      let label: string;
      
      if (subPath.trafficType === 1) {
        // 지하철
        type = "subway";
        const lineName = subPath.lane?.[0]?.name || '지하철';
        label = lineName.includes('호선') ? lineName : extractLineNumber(lineName) + '호선';
      } else if (subPath.trafficType === 2) {
        // 버스
        type = "bus";
        const busNo = subPath.lane?.[0]?.busNo || '';
        label = busNo ? `버스 ${busNo}` : '버스';
      } else {
        // 도보
        type = "walk";
        label = "도보";
      }
      
      routeSubPaths.push({
        index: idx,
        type,
        label,
        minutes: sectionTimeMinutes,
        stations,
      });
    });
    
    // 3. RouteResult 생성
    const totalMinutes = Math.round(summary.duration / 60);
    const fare = summary.fare?.regular?.totalFare || 0;
    const transfers = (summary.subwayTransitCount || 0) + (summary.busTransitCount || 0);
    
    // 사용한 노선 목록
    const lines = routeSubPaths
      .filter(sp => sp.type === 'subway')
      .map(sp => sp.label)
      .filter((line, index, arr) => arr.indexOf(line) === index); // 중복 제거
    
    // detail.perSegment 생성 (기존 구조 호환)
    const perSegment = routeSubPaths.map((sp, idx) => ({
      from: sp.stations[0] || '',
      to: sp.stations[sp.stations.length - 1] || '',
      line: sp.type === 'subway' ? extractLineNumber(sp.label) : (sp.type === 'bus' ? sp.label : '도보'),
      travelTime: sp.minutes,
      durationMinutes: sp.minutes,
      minutes: sp.minutes,
      segmentMinutes: sp.minutes,
      congestion: 2,
      isTransfer: idx > 0 && sp.type !== 'walk',
      stationCount: sp.stations.length > 1 ? sp.stations.length - 1 : 0,
    }));
    
    // 원본 subPath 보존 (정규화용)
    const rawSubPath = mergedSubPaths.map((sp: NaverSubPath) => ({
      trafficType: sp.trafficType,
      sectionTime: sp.sectionTime,
      startName: sp.startName,
      endName: sp.endName,
      lane: sp.lane?.map(l => ({
        name: l.name,
        busNo: l.busNo,
      })),
    }));
    
    const result: RouteResult = {
      type: 'fastest', // 기본값
      stations: allStations,
      stationIds: allStationIds.length > 0 ? allStationIds : allStations,
      travelTime: totalMinutes,
      totalTravelMinutes: totalMinutes,
      transfers,
      congestionScore: 50,
      fare,
      lines: lines as any,
      detail: {
        perSegment,
      },
      rawSubPath,
    };
    
    console.log('[BUILD ROUTE FROM PATH]', {
      id: `naver-${index}`,
      totalMinutes,
      fare,
      transfers,
      subPathsCount: routeSubPaths.length,
      subPaths: routeSubPaths.map(sp => ({
        type: sp.type,
        label: sp.label,
        minutes: sp.minutes,
        stationCount: sp.stations.length,
      })),
    });
    
    return result;
  } catch (error) {
    logger.error('네이버 경로 변환 실패', error as Error);
    return null;
  }
}


/**
 * 노선명에서 호선 번호 추출 (예: "5호선" -> "5")
 */
function extractLineNumber(lineName: string): string {
  const match = lineName.match(/(\d+)호선/);
  if (match) {
    return match[1];
  }
  // 숫자만 있는 경우
  const numMatch = lineName.match(/(\d+)/);
  if (numMatch) {
    return numMatch[1];
  }
  return '1'; // 기본값
}

