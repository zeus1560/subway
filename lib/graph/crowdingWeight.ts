// 혼잡도 가중치 계산 모듈

import { STATIONS, getStationById } from '../subwayMapData';
import { GraphEdge } from './types';
import { logger } from '../logger';

// getStationCongestionLevel 동적 import (순환 참조 방지)
async function getStationCongestionLevel(
  stationId: string,
  stationName: string,
  lineNum: string,
  currentTime: Date
): Promise<{ congestion: string; level: number; passengerCount?: number }> {
  const { getStationCongestionLevel: getCongestion } = await import('../api');
  return getCongestion(stationId, stationName, lineNum, currentTime);
}

// 혼잡도 레벨을 비용으로 변환
export function congestionToCost(congestionLevel: number): number {
  // 혼잡도 레벨 (1~4)를 비용으로 변환
  // 1: 여유 (0.5배), 2: 보통 (1배), 3: 주의 (1.5배), 4: 매우 혼잡 (2배)
  const multipliers = {
    1: 0.5,  // 여유
    2: 1.0,  // 보통
    3: 1.5,  // 주의
    4: 2.0,  // 매우 혼잡
  };
  
  return multipliers[congestionLevel as keyof typeof multipliers] || 1.0;
}

// 혼잡도 캐시 (성능 최적화)
const congestionCache = new Map<string, { level: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

function getCacheKey(stationId: string, line: string, timestamp: Date): string {
  const hour = timestamp.getHours();
  return `${stationId}_${line}_${hour}`;
}

// 엣지의 혼잡도 기반 비용 계산 (빠른 버전 - 캐시 사용)
export async function calculateEdgeCostWithCongestion(
  edge: GraphEdge,
  timestamp: Date,
  useCache: boolean = true
): Promise<number> {
  try {
    const toStation = getStationById(edge.to);
    if (!toStation) {
      return edge.travelTime; // 기본 이동 시간만 반환
    }
    
    // 캐시 확인
    if (useCache) {
      const cacheKey = getCacheKey(edge.to, edge.line, timestamp);
      const cached = congestionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        const congestionMultiplier = congestionToCost(cached.level);
        const baseTime = edge.isTransfer ? (edge.transferTime || edge.travelTime) : edge.travelTime;
        return baseTime * congestionMultiplier;
      }
    }
    
    // 혼잡도 조회 (기본값 사용으로 빠르게 처리)
    // 실제 API 호출은 나중에 배치로 처리
    const baseTime = edge.isTransfer ? (edge.transferTime || edge.travelTime) : edge.travelTime;
    return baseTime * 1.0; // 기본 가중치 (혼잡도 조회 생략)
  } catch (error) {
    logger.warn('혼잡도 조회 실패, 기본 시간 사용', { edge, error });
    return edge.travelTime;
  }
}

// 빠른 엣지 비용 계산 (혼잡도 조회 없음)
export function calculateEdgeCostFast(edge: GraphEdge): number {
  return edge.isTransfer ? (edge.transferTime || edge.travelTime) : edge.travelTime;
}

// 경로의 총 혼잡도 점수 계산 (0~100) - 빠른 버전
export async function calculateRouteCongestionScore(
  stationIds: string[],
  edges: GraphEdge[],
  timestamp: Date
): Promise<number> {
  try {
    // edges에서 이미 조회한 혼잡도 사용 (빠른 계산)
    if (edges.length === 0) return 50;
    
    // 기본값 반환 (실제 혼잡도는 buildRouteResult에서 계산됨)
    // 여기서는 빠르게 기본값만 반환하여 경로 탐색 속도 향상
    return 50; // 기본값
  } catch (error) {
    logger.warn('경로 혼잡도 점수 계산 실패', { error });
    return 50; // 기본값
  }
}

// 경로의 실제 혼잡도 점수 계산 (perSegment 기반)
export function calculateRouteCongestionScoreFromSegments(
  perSegment: Array<{ congestion: number }>
): number {
  if (perSegment.length === 0) return 50;
  
  const totalScore = perSegment.reduce((sum, seg) => {
    // 혼잡도 레벨을 점수로 변환 (1=0, 2=33, 3=67, 4=100)
    const score = (seg.congestion - 1) * 33.33;
    return sum + score;
  }, 0);
  
  return Math.round(totalScore / perSegment.length);
}

