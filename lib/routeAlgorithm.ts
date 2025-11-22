// 고도화된 경로 탐색 알고리즘 (다익스트라 + A* 하이브리드)

import { STATIONS, getStationById, type LineId } from './subwayMapData';
import { STATION_COORDINATES } from './stationCoordinates';
import { logger } from './logger';
import { getStationCongestionLevel } from './api';

export interface RouteNode {
  stationId: string;
  path: string[];
  totalCost: number; // 총 비용 (시간 + 혼잡도 + 환승 페널티)
  totalTime: number; // 총 소요 시간 (분)
  totalCongestion: number; // 총 혼잡도 점수
  transferCount: number;
  lines: LineId[];
  estimatedRemainingCost?: number; // A* 휴리스틱 (남은 예상 비용)
}

export interface RouteSearchOptions {
  maxTransfers?: number;
  preferLessCrowded?: boolean;
  preferMinTime?: boolean;
  preferLessTransfer?: boolean;
  maxRoutes?: number;
  useAStar?: boolean; // A* 알고리즘 사용 여부
}

// 가중치 상수
const WEIGHTS = {
  TIME: 1.0, // 시간 가중치 (분당)
  CONGESTION: 2.0, // 혼잡도 가중치 (레벨당)
  TRANSFER: 10.0, // 환승 페널티
  DISTANCE: 0.1, // 거리 가중치 (km당)
};

// 역 간 이동 시간 계산 (거리 기반)
function calculateTravelTime(
  stationId1: string,
  stationId2: string,
  lineNum: string
): number {
  const station1 = getStationById(stationId1);
  const station2 = getStationById(stationId2);
  
  if (!station1 || !station2) {
    return 2; // 기본값: 2분
  }
  
  // 좌표 기반 거리 계산
  const coord1 = STATION_COORDINATES.find(c => c.name === station1.name && c.lineNum === lineNum);
  const coord2 = STATION_COORDINATES.find(c => c.name === station2.name && c.lineNum === lineNum);
  
  let distance = 1.2; // 기본값: 평균 역간 거리 (km)
  
  if (coord1 && coord2) {
    // Haversine 공식으로 거리 계산
    const R = 6371; // 지구 반지름 (km)
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance = R * c;
  } else {
    // 좌표가 없으면 기본값 사용
    distance = 1.2; // 기본값: 평균 역간 거리
  }
  
  // 평균 지하철 속도: 35km/h = 약 0.58km/min
  // 역간 정차 시간: 0.5분
  const travelTime = (distance / 0.58) + 0.5;
  
  return Math.max(1, Math.round(travelTime));
}

// 환승 시간 계산
function calculateTransferTime(transferStationId: string): number {
  // 환승 시간: 평균 3-5분
  return 4;
}

// A* 휴리스틱: 목적지까지의 예상 비용 (직선 거리 기반)
function calculateHeuristic(
  currentStationId: string,
  endStationId: string
): number {
  const currentStation = getStationById(currentStationId);
  const endStation = getStationById(endStationId);
  
  if (!currentStation || !endStation) {
    return 0;
  }
  
  // 좌표 기반 직선 거리 계산
  const coord1 = STATION_COORDINATES.find(c => c.name === currentStation.name);
  const coord2 = STATION_COORDINATES.find(c => c.name === endStation.name);
  
  let distance = 0;
  
  if (coord1 && coord2) {
    // Haversine 공식으로 직선 거리 계산
    const R = 6371; // 지구 반지름 (km)
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance = R * c;
  } else {
    // 좌표가 없으면 기본값 사용
    distance = 10; // 기본값: 10km
  }
  
  // 예상 시간 = 거리 / 평균 속도
  const estimatedTime = distance / 0.58; // 0.58km/min (35km/h)
  
  return estimatedTime * WEIGHTS.TIME;
}

// 경로 비용 계산
async function calculateEdgeCost(
  fromStationId: string,
  toStationId: string,
  lineNum: string,
  isTransfer: boolean,
  currentTime: Date,
  options: RouteSearchOptions
): Promise<{ time: number; congestion: number; cost: number }> {
  const travelTime = calculateTravelTime(fromStationId, toStationId, lineNum);
  const transferTime = isTransfer ? calculateTransferTime(toStationId) : 0;
  const totalTime = travelTime + transferTime;
  
  // 혼잡도 조회
  const toStation = getStationById(toStationId);
  let congestionLevel = 2; // 기본값: 보통
  let congestionScore = 0;
  
  if (toStation) {
    try {
      const congestion = await getStationCongestionLevel(
        toStationId,
        toStation.name,
        lineNum,
        currentTime
      );
      congestionLevel = congestion.level;
      congestionScore = congestionLevel;
    } catch (error) {
      logger.warn('혼잡도 조회 실패', { toStationId, error });
    }
  }
  
  // 비용 계산
  let cost = totalTime * WEIGHTS.TIME;
  
  if (options.preferLessCrowded) {
    cost += congestionScore * WEIGHTS.CONGESTION;
  }
  
  if (isTransfer) {
    cost += WEIGHTS.TRANSFER;
  }
  
  // totalTime 안전하게 보장
  const safeTotalTime = (() => {
    const n = Number(totalTime);
    if (Number.isFinite(n) && n > 0) return n;
    return 0;
  })();
  
  return {
    time: safeTotalTime,
    congestion: congestionScore,
    cost,
  };
}

// 우선순위 큐 (최소 힙)
class PriorityQueue<T extends { totalCost: number; estimatedRemainingCost?: number }> {
  private items: T[] = [];
  
  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort((a, b) => {
      const costA = a.totalCost + (a.estimatedRemainingCost || 0);
      const costB = b.totalCost + (b.estimatedRemainingCost || 0);
      return costA - costB;
    });
  }
  
  dequeue(): T | undefined {
    return this.items.shift();
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  size(): number {
    return this.items.length;
  }
}

// 다익스트라 알고리즘 기반 경로 탐색
export async function findOptimalRoutes(
  startStationId: string,
  endStationId: string,
  graph: Map<string, Set<string>>,
  currentTime: Date,
  options: RouteSearchOptions = {}
): Promise<RouteNode[]> {
  const maxTransfers = options.maxTransfers ?? 3;
  const maxRoutes = options.maxRoutes ?? 5;
  const useAStar = options.useAStar ?? true;
  
  const priorityQueue = new PriorityQueue<RouteNode>();
  const visited = new Map<string, RouteNode[]>(); // stationId -> 최적 경로들
  const foundRoutes: RouteNode[] = [];
  
  // 시작 노드
  const startNode: RouteNode = {
    stationId: startStationId,
    path: [startStationId],
    totalCost: 0,
    totalTime: 0,
    totalCongestion: 0,
    transferCount: 0,
    lines: [],
    estimatedRemainingCost: useAStar ? calculateHeuristic(startStationId, endStationId) : 0,
  };
  
  priorityQueue.enqueue(startNode);
  visited.set(startStationId, [startNode]);
  
  let iterations = 0;
  const maxIterations = 5000;
  
  while (!priorityQueue.isEmpty() && foundRoutes.length < maxRoutes && iterations < maxIterations) {
    iterations++;
    const current = priorityQueue.dequeue()!;
    
    // 목적지 도달
    if (current.stationId === endStationId) {
      foundRoutes.push(current);
      logger.debug('최적 경로 발견', {
        cost: current.totalCost,
        time: current.totalTime,
        transfers: current.transferCount,
        pathLength: current.path.length,
      });
      continue;
    }
    
    // 환승 횟수 제한
    if (current.transferCount > maxTransfers) {
      continue;
    }
    
    // 이웃 노드 탐색
    const neighbors = graph.get(current.stationId) || new Set();
    
    for (const neighborId of neighbors) {
      // 순환 방지
      if (current.path.includes(neighborId)) continue;
      
      const neighborStation = getStationById(neighborId);
      const currentStation = getStationById(current.stationId);
      
      if (!neighborStation || !currentStation) continue;
      
      // 노선 확인
      const commonLines = currentStation.lines.filter(line => neighborStation.lines.includes(line));
      const isTransfer = commonLines.length === 0;
      const lineNum = commonLines.length > 0 ? commonLines[0] : neighborStation.lines[0];
      
      // 비용 계산
      const edgeCost = await calculateEdgeCost(
        current.stationId,
        neighborId,
        lineNum,
        isTransfer,
        currentTime,
        options
      );
      
      const newTransferCount = isTransfer ? current.transferCount + 1 : current.transferCount;
      const newLines = commonLines.length > 0 ? commonLines : neighborStation.lines;
      
      const newNode: RouteNode = {
        stationId: neighborId,
        path: [...current.path, neighborId],
        totalCost: current.totalCost + edgeCost.cost,
        totalTime: current.totalTime + edgeCost.time,
        totalCongestion: current.totalCongestion + edgeCost.congestion,
        transferCount: newTransferCount,
        lines: newLines,
        estimatedRemainingCost: useAStar ? calculateHeuristic(neighborId, endStationId) : 0,
      };
      
      // 방문 체크: 더 나은 경로가 있으면 추가
      const existingRoutes = visited.get(neighborId) || [];
      const isBetterRoute = existingRoutes.every(existing => {
        // totalTime 안전하게 비교
        const newNodeTime = Number(newNode.totalTime);
        const existingTime = Number(existing.totalTime);
        const newNodeTimeSafe = Number.isFinite(newNodeTime) && newNodeTime >= 0 ? newNodeTime : 0;
        const existingTimeSafe = Number.isFinite(existingTime) && existingTime >= 0 ? existingTime : 0;
        
        // 비용이 더 낮거나, 같은 비용이지만 환승이 더 적거나, 시간이 더 짧으면 더 나은 경로
        return newNode.totalCost >= existing.totalCost &&
               newNode.transferCount >= existing.transferCount &&
               newNodeTimeSafe >= existingTimeSafe;
      });
      
      if (isBetterRoute || existingRoutes.length === 0) {
        visited.set(neighborId, [...existingRoutes, newNode]);
        priorityQueue.enqueue(newNode);
      }
    }
  }
  
  logger.info('경로 탐색 완료', {
    foundRoutes: foundRoutes.length,
    iterations,
    visitedStations: visited.size,
  });
  
  // 경로 정렬
  foundRoutes.sort((a, b) => {
    if (options.preferMinTime) {
      // totalTime 안전하게 비교
      const aTime = Number(a.totalTime);
      const bTime = Number(b.totalTime);
      const aTimeSafe = Number.isFinite(aTime) && aTime > 0 ? aTime : 0;
      const bTimeSafe = Number.isFinite(bTime) && bTime > 0 ? bTime : 0;
      return aTimeSafe - bTimeSafe;
    }
    if (options.preferLessTransfer) {
      if (a.transferCount !== b.transferCount) {
        return a.transferCount - b.transferCount;
      }
    }
    if (options.preferLessCrowded) {
      if (a.totalCongestion !== b.totalCongestion) {
        return a.totalCongestion - b.totalCongestion;
      }
    }
    return a.totalCost - b.totalCost;
  });
  
  return foundRoutes.slice(0, maxRoutes);
}

