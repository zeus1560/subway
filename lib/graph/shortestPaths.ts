// 최단 경로 알고리즘 (Dijkstra, Yen's K-Shortest Paths)

import { SubwayGraph, GraphNode, GraphEdge, RouteResult, RouteSearchOptions } from './types';
import { STATIONS, getStationById } from '../subwayMapData';
import { calculateEdgeCostWithCongestion, calculateRouteCongestionScore, calculateEdgeCostFast, calculateRouteCongestionScoreFromSegments } from './crowdingWeight';
import { logger } from '../logger';

// 경로 노드 (다익스트라 알고리즘용)
interface PathNode {
  stationId: string;
  cost: number;              // 총 비용 (시간 + 혼잡도)
  time: number;              // 총 소요 시간
  transfers: number;         // 환승 횟수
  path: string[];            // 경로 (역 ID 배열)
  edges: GraphEdge[];        // 사용한 엣지들
  lines: Set<string>;        // 사용한 노선들
}

// 우선순위 큐 (최소 힙)
class PriorityQueue<T extends { cost: number }> {
  private items: T[] = [];
  
  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort((a, b) => a.cost - b.cost);
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

// 다익스트라 알고리즘: 최단 시간 경로
export async function findFastestRoute(
  graph: SubwayGraph,
  startId: string,
  endId: string,
  timestamp: Date,
  options: RouteSearchOptions = {}
): Promise<RouteResult | null> {
  const maxTransfers = options.maxTransfers ?? 5;
  const maxIterations = 10000; // 최대 반복 횟수 제한
  
  const queue = new PriorityQueue<PathNode>();
  const visited = new Map<string, PathNode>(); // stationId -> 최적 경로
  let iterations = 0;
  
  // 시작 노드 확인
  if (!graph.nodes.has(startId)) {
    logger.warn('시작 역이 그래프에 없음', { startId });
    return null;
  }
  
  if (!graph.nodes.has(endId)) {
    logger.warn('도착 역이 그래프에 없음', { endId });
    return null;
  }
  
  // 시작 노드
  queue.enqueue({
    stationId: startId,
    cost: 0,
    time: 0,
    transfers: 0,
    path: [startId],
    edges: [],
    lines: new Set(),
  });
  
  while (!queue.isEmpty() && iterations < maxIterations) {
    iterations++;
    const current = queue.dequeue()!;
    
    // 목적지 도달
    if (current.stationId === endId) {
      return await buildRouteResult(current, graph, timestamp, 'fastest');
    }
    
    // 환승 횟수 제한
    if (current.transfers > maxTransfers) continue;
    
    // 방문 체크: 더 나은 경로가 있으면 스킵
    const existing = visited.get(current.stationId);
    if (existing && existing.cost < current.cost) continue;
    visited.set(current.stationId, current);
    
    // 이웃 노드 탐색
    const node = graph.nodes.get(current.stationId);
    if (!node) {
      logger.warn('노드를 찾을 수 없음', { stationId: current.stationId });
      continue;
    }
    
    if (node.neighbors.length === 0) {
      logger.warn('노드에 이웃이 없음', { stationId: current.stationId, stationName: node.stationName });
      continue;
    }
    
    for (const edge of node.neighbors) {
      // 순환 방지
      if (current.path.includes(edge.to)) continue;
      
      // 엣지 비용 계산 (빠른 버전 - 혼잡도 조회 생략)
      const edgeCost = calculateEdgeCostFast(edge);
      const newTransfers = edge.isTransfer ? current.transfers + 1 : current.transfers;
      const newLines = new Set(current.lines);
      newLines.add(edge.line);
      
      const newNode: PathNode = {
        stationId: edge.to,
        cost: current.cost + edgeCost,
        time: current.time + (edge.isTransfer ? (edge.transferTime || edge.travelTime) : edge.travelTime),
        transfers: newTransfers,
        path: [...current.path, edge.to],
        edges: [...current.edges, edge],
        lines: newLines,
      };
      
      // 더 나은 경로가 아니면 스킵
      const existingPath = visited.get(edge.to);
      if (existingPath && existingPath.cost <= newNode.cost) continue;
      
      queue.enqueue(newNode);
    }
  }
  
  if (iterations >= maxIterations) {
    logger.warn('경로 탐색 최대 반복 횟수 도달', { startId, endId, iterations, visitedCount: visited.size });
  } else {
    const startNode = graph.nodes.get(startId);
    logger.warn('경로를 찾을 수 없음', { 
      startId, 
      endId, 
      visitedCount: visited.size,
      iterations,
      startNodeNeighbors: startNode?.neighbors.length ?? 0,
      queueSize: queue.size(),
    });
  }
  
  return null; // 경로를 찾을 수 없음
}

// 최소 환승 경로 (환승 횟수 우선, 시간은 보조)
export async function findLessTransferRoute(
  graph: SubwayGraph,
  startId: string,
  endId: string,
  timestamp: Date,
  options: RouteSearchOptions = {}
): Promise<RouteResult | null> {
  const maxTransfers = options.maxTransfers ?? 5;
  const maxIterations = 10000;
  
  const queue = new PriorityQueue<PathNode>();
  const visited = new Map<string, PathNode>();
  let iterations = 0;
  
  // 시작 노드 확인
  if (!graph.nodes.has(startId) || !graph.nodes.has(endId)) {
    return null;
  }
  
  // 시작 노드
  queue.enqueue({
    stationId: startId,
    cost: 0,
    time: 0,
    transfers: 0,
    path: [startId],
    edges: [],
    lines: new Set(),
  });
  
  while (!queue.isEmpty() && iterations < maxIterations) {
    iterations++;
    const current = queue.dequeue()!;
    
    if (current.stationId === endId) {
      return await buildRouteResult(current, graph, timestamp, 'lessTransfer');
    }
    
    if (current.transfers > maxTransfers) continue;
    
    // 방문 체크: 환승 횟수가 더 적거나, 같으면 시간이 더 짧은 경로만 허용
    const existing = visited.get(current.stationId);
    if (existing) {
      if (existing.transfers < current.transfers) continue;
      if (existing.transfers === current.transfers && existing.time < current.time) continue;
    }
    visited.set(current.stationId, current);
    
    const node = graph.nodes.get(current.stationId);
    if (!node) continue;
    
            for (const edge of node.neighbors) {
              if (current.path.includes(edge.to)) continue;
              
              const edgeCost = calculateEdgeCostFast(edge);
              const newTransfers = edge.isTransfer ? current.transfers + 1 : current.transfers;
      const newLines = new Set(current.lines);
      newLines.add(edge.line);
      
      // 환승 횟수에 큰 페널티 부여 (환승 횟수 우선)
      const transferPenalty = newTransfers * 1000; // 환승 1회당 1000분 페널티
      const newNode: PathNode = {
        stationId: edge.to,
        cost: current.cost + edgeCost + transferPenalty,
        time: current.time + (edge.isTransfer ? (edge.transferTime || edge.travelTime) : edge.travelTime),
        transfers: newTransfers,
        path: [...current.path, edge.to],
        edges: [...current.edges, edge],
        lines: newLines,
      };
      
      const existingPath = visited.get(edge.to);
      if (existingPath) {
        if (existingPath.transfers < newNode.transfers) continue;
        if (existingPath.transfers === newNode.transfers && existingPath.cost <= newNode.cost) continue;
      }
      
      queue.enqueue(newNode);
    }
  }
  
  if (iterations >= maxIterations) {
    logger.warn('최소 환승 경로 탐색 최대 반복 횟수 도달', { startId, endId });
  }
  
  return null;
}

// 혼잡도 낮은 경로 (혼잡도 우선, 시간은 보조)
export async function findLessCrowdedRoute(
  graph: SubwayGraph,
  startId: string,
  endId: string,
  timestamp: Date,
  options: RouteSearchOptions = {}
): Promise<RouteResult | null> {
  const maxTransfers = options.maxTransfers ?? 5;
  const maxIterations = 10000;
  
  const queue = new PriorityQueue<PathNode>();
  const visited = new Map<string, PathNode>();
  let iterations = 0;
  
  // 시작 노드 확인
  if (!graph.nodes.has(startId) || !graph.nodes.has(endId)) {
    return null;
  }
  
  queue.enqueue({
    stationId: startId,
    cost: 0,
    time: 0,
    transfers: 0,
    path: [startId],
    edges: [],
    lines: new Set(),
  });
  
while (!queue.isEmpty() && iterations < maxIterations) {
    iterations++;
    const current = queue.dequeue()!;
    
    if (current.stationId === endId) {
      return await buildRouteResult(current, graph, timestamp, 'lessCrowded');
    }
    
    if (current.transfers > maxTransfers) continue;
    
    const existing = visited.get(current.stationId);
    if (existing && existing.cost < current.cost) continue;
    visited.set(current.stationId, current);
    
    const node = graph.nodes.get(current.stationId);
    if (!node) continue;
    
            for (const edge of node.neighbors) {
              if (current.path.includes(edge.to)) continue;
              
              // 빠른 비용 계산 (혼잡도는 나중에 반영)
              const edgeCost = calculateEdgeCostFast(edge);
              const congestionMultiplier = 1.0; // 기본 가중치 (혼잡도는 나중에 반영)
              const newTransfers = edge.isTransfer ? current.transfers + 1 : current.transfers;
      const newLines = new Set(current.lines);
      newLines.add(edge.line);
      
      const newNode: PathNode = {
        stationId: edge.to,
        cost: current.cost + edgeCost * congestionMultiplier, // 혼잡도 비용에 큰 가중치
        time: current.time + (edge.isTransfer ? (edge.transferTime || edge.travelTime) : edge.travelTime),
        transfers: newTransfers,
        path: [...current.path, edge.to],
        edges: [...current.edges, edge],
        lines: newLines,
      };
      
      const existingPath = visited.get(edge.to);
      if (existingPath && existingPath.cost <= newNode.cost) continue;
      
      queue.enqueue(newNode);
    }
  }
  
  return null;
}

// 경로 결과 생성
async function buildRouteResult(
  pathNode: PathNode,
  graph: SubwayGraph,
  timestamp: Date,
  type: 'fastest' | 'lessTransfer' | 'lessCrowded'
): Promise<RouteResult> {
  const stations = pathNode.path.map(id => {
    const station = getStationById(id);
    return station ? station.name : id;
  });
  
  // 혼잡도 점수는 perSegment 계산 후 업데이트
  let congestionScore = 50; // 임시값
  
  // 요금 계산
  const fare = calculateFare(pathNode.path.length - 1, pathNode.transfers);
  
  // 구간별 상세 정보 (배치로 혼잡도 조회)
  const perSegment = [];
  const congestionPromises: Array<Promise<{ level: number }>> = [];
  
  // edges가 비어있으면 path 기반으로 perSegment 생성
  if (pathNode.edges.length === 0 && pathNode.path.length > 1) {
    logger.warn('edges가 비어있어 path 기반으로 perSegment 생성', { pathLength: pathNode.path.length });
    for (let i = 0; i < pathNode.path.length - 1; i++) {
      const fromStation = getStationById(pathNode.path[i]);
      const toStation = getStationById(pathNode.path[i + 1]);
      const fromName = fromStation?.name || pathNode.path[i];
      const toName = toStation?.name || pathNode.path[i + 1];
      
      // 공통 노선 찾기
      const commonLine = fromStation && toStation 
        ? fromStation.lines.find(l => toStation.lines.includes(l)) || fromStation.lines[0] || '1'
        : '1';
      
      // 환승 여부 확인 (같은 역 이름이지만 다른 ID인 경우)
      const isTransfer = fromStation && toStation && fromStation.name === toStation.name && fromStation.id !== toStation.id;
      
      const defaultTime = isTransfer ? 4 : 2;
      perSegment.push({
        from: fromName,
        to: toName,
        line: commonLine,
        travelTime: defaultTime, // 환승은 4분, 일반은 2분
        durationMinutes: defaultTime, // 명시적으로 추가
        congestion: 2,
        isTransfer: isTransfer,
      });
    }
  } else {
    // edges가 있으면 edges 기반으로 perSegment 생성
    try {
      for (let i = 0; i < pathNode.edges.length; i++) {
        const edge = pathNode.edges[i];
        const fromStation = getStationById(edge.from);
        const toStation = getStationById(edge.to);
        
        // travelTime 계산 (기본값 보장)
        let finalTravelTime: number;
        if (edge.isTransfer) {
          finalTravelTime = (typeof edge.transferTime === 'number' && !isNaN(edge.transferTime) && edge.transferTime > 0)
            ? edge.transferTime
            : (typeof edge.travelTime === 'number' && !isNaN(edge.travelTime) && edge.travelTime > 0)
            ? edge.travelTime
            : 4; // 환승 기본값: 4분
        } else {
          finalTravelTime = (typeof edge.travelTime === 'number' && !isNaN(edge.travelTime) && edge.travelTime > 0)
            ? edge.travelTime
            : 2; // 일반 기본값: 2분
        }
      
        
        if (!fromStation || !toStation) {
          // 역을 찾을 수 없어도 기본 정보는 추가
          perSegment.push({
            from: edge.from,
            to: edge.to,
            line: edge.line,
            travelTime: finalTravelTime,
            durationMinutes: finalTravelTime, // 명시적으로 추가
            congestion: 2, // 기본값: 보통
            isTransfer: edge.isTransfer,
          });
          continue;
        }
        
        // 혼잡도 조회를 Promise로 수집 (병렬 처리, 에러 처리 포함)
        try {
          const { getStationCongestionLevel } = await import('../api');
          congestionPromises.push(
            getStationCongestionLevel(
              edge.to,
              toStation.name,
              edge.line,
              timestamp
            ).then(c => ({ level: c.level })).catch(() => ({ level: 2 })) // 기본값: 보통
          );
        } catch (error) {
          // 혼잡도 조회 실패 시 기본값 사용
          congestionPromises.push(Promise.resolve({ level: 2 }));
        }
        
        perSegment.push({
          from: fromStation.name,
          to: toStation.name,
          line: edge.line,
          travelTime: finalTravelTime,
          durationMinutes: finalTravelTime, // 명시적으로 추가
          congestion: 2, // 임시값, 나중에 업데이트
          isTransfer: edge.isTransfer,
        });
      }
    
      // 모든 혼잡도를 병렬로 조회 (에러 처리 포함)
      if (congestionPromises.length > 0) {
        try {
          const congestionResults = await Promise.all(congestionPromises);
          congestionResults.forEach((result, i) => {
            if (perSegment[i]) {
              perSegment[i].congestion = result.level;
            }
          });
        } catch (error) {
          logger.warn('혼잡도 조회 실패, 기본값 사용', { error });
          // 기본값으로 유지
        }
      }
    } catch (error) {
      logger.error('구간별 정보 생성 실패', error as Error);
      // 에러 발생 시 기본 perSegment 생성
      if (perSegment.length === 0 && pathNode.path.length > 1) {
        for (let i = 0; i < pathNode.path.length - 1; i++) {
          const fromStation = getStationById(pathNode.path[i]);
          const toStation = getStationById(pathNode.path[i + 1]);
          const fromName = fromStation?.name || pathNode.path[i];
          const toName = toStation?.name || pathNode.path[i + 1];
          
          // 공통 노선 찾기
          const commonLine = fromStation && toStation 
            ? fromStation.lines.find(l => toStation.lines.includes(l)) || fromStation.lines[0] || '1'
            : '1';
          
          const fallbackTime = 2;
          perSegment.push({
            from: fromName,
            to: toName,
            line: commonLine,
            travelTime: fallbackTime, // 기본값
            durationMinutes: fallbackTime, // 명시적으로 추가
            congestion: 2,
            isTransfer: false,
          });
        }
      }
    }
  }
  
  // 실제 혼잡도 점수 계산
  congestionScore = calculateRouteCongestionScoreFromSegments(perSegment);
  
  // 총 소요 시간 계산 (안전하게)
  const safeTotalTime = (() => {
    // pathNode.time이 유효한 숫자인지 확인
    if (typeof pathNode.time === 'number' && !isNaN(pathNode.time) && isFinite(pathNode.time) && pathNode.time >= 0) {
      return Math.round(pathNode.time);
    }
    
    // perSegment의 travelTime 합산으로 계산
    const sumFromSegments = perSegment.reduce((sum, seg) => {
      const segTime = typeof seg.travelTime === 'number' && !isNaN(seg.travelTime) && isFinite(seg.travelTime) && seg.travelTime > 0
        ? seg.travelTime
        : (seg.isTransfer ? 4 : 2);
      return sum + segTime;
    }, 0);
    
    return sumFromSegments > 0 ? Math.round(sumFromSegments) : 0;
  })();
  
  // perSegment에 durationMinutes 추가 및 travelTime 안전하게 보장
  const safePerSegment = perSegment.map(seg => {
    // durationMinutes가 이미 있으면 사용, 없으면 travelTime에서 가져오기
    const rawDuration = seg.durationMinutes ?? seg.travelTime;
    const durationMinutes = (() => {
      if (typeof rawDuration === 'number' && !isNaN(rawDuration) && isFinite(rawDuration) && rawDuration > 0) {
        return Math.round(rawDuration);
      }
      // 기본값: 환승이면 4분, 일반은 2분
      return seg.isTransfer ? 4 : 2;
    })();
    
    return {
      ...seg,
      travelTime: durationMinutes, // 기존 필드도 안전하게 보장
      durationMinutes, // 명시적 필드 (항상 숫자 보장)
    };
  });
  
  return {
    type,
    stations,
    stationIds: pathNode.path,
    travelTime: safeTotalTime, // 하위 호환성
    totalTravelMinutes: safeTotalTime, // 명시적 필드
    transfers: pathNode.transfers,
    congestionScore,
    fare,
    lines: Array.from(pathNode.lines),
    detail: {
      perSegment: safePerSegment,
    },
  };
}

// 요금 계산 (서울 지하철 요금 체계)
function calculateFare(stationCount: number, transferCount: number): number {
  // 기본 요금: 1,400원 (10km 이내)
  // 추가 요금: 10km 초과 시 5km마다 100원 추가
  // 최대 요금: 2,000원
  
  // 역 수 기반 거리 추정 (평균 역간 거리 1.2km)
  const estimatedDistance = stationCount * 1.2;
  
  let fare = 1400;
  if (estimatedDistance > 10) {
    const extraDistance = estimatedDistance - 10;
    const extraFare = Math.ceil(extraDistance / 5) * 100;
    fare += extraFare;
  }
  
  return Math.min(fare, 2000);
}

// Yen's K-Shortest Paths 알고리즘 (대체 경로 찾기)
export async function findKShortestPaths(
  graph: SubwayGraph,
  startId: string,
  endId: string,
  timestamp: Date,
  k: number = 3,
  options: RouteSearchOptions = {}
): Promise<RouteResult[]> {
  const results: RouteResult[] = [];
  
  // 시작 노드와 도착 노드 확인
  const startNode = graph.nodes.get(startId);
  const endNode = graph.nodes.get(endId);
  
  if (!startNode) {
    logger.error('시작 노드를 찾을 수 없음', { startId });
    return [];
  }
  
  if (!endNode) {
    logger.error('도착 노드를 찾을 수 없음', { endId });
    return [];
  }
  
  logger.info('경로 탐색 시작 - 노드 정보', {
    startId,
    startName: startNode.stationName,
    startNeighbors: startNode.neighbors.length,
    endId,
    endName: endNode.stationName,
    endNeighbors: endNode.neighbors.length,
  });
  
  // 1. 최단 경로 찾기
  const fastest = await findFastestRoute(graph, startId, endId, timestamp, options);
  if (fastest) {
    logger.info('최단 경로 찾음', { stations: fastest.stations.length, time: fastest.totalTravelMinutes });
    results.push(fastest);
  } else {
    logger.warn('최단 경로를 찾을 수 없음', { startId, endId });
  }
  
  // 2. 최소 환승 경로 찾기
  const lessTransfer = await findLessTransferRoute(graph, startId, endId, timestamp, options);
  if (lessTransfer) {
    const pathKey = lessTransfer.stationIds.join(',');
    if (!results.find(r => r.stationIds.join(',') === pathKey)) {
      logger.info('최소 환승 경로 찾음', { stations: lessTransfer.stations.length, transfers: lessTransfer.transfers });
      results.push(lessTransfer);
    }
  } else {
    logger.warn('최소 환승 경로를 찾을 수 없음', { startId, endId });
  }
  
  // 3. 혼잡도 낮은 경로 찾기
  const lessCrowded = await findLessCrowdedRoute(graph, startId, endId, timestamp, options);
  if (lessCrowded) {
    const pathKey = lessCrowded.stationIds.join(',');
    if (!results.find(r => r.stationIds.join(',') === pathKey)) {
      logger.info('혼잡도 낮은 경로 찾음', { stations: lessCrowded.stations.length, congestionScore: lessCrowded.congestionScore });
      results.push(lessCrowded);
    }
  } else {
    logger.warn('혼잡도 낮은 경로를 찾을 수 없음', { startId, endId });
  }
  
  // 4. 추가 대체 경로 찾기 (Yen's Algorithm 변형)
  // 이미 찾은 경로와 다른 경로를 찾기 위해 일부 엣지를 제거하고 다시 탐색
  if (results.length < k) {
    const foundPaths = new Set(results.map(r => r.stationIds.join(',')));
    
    // 각 결과 경로에서 일부 엣지를 제거하고 다시 탐색
    for (const result of results) {
      if (results.length >= k) break;
      
      // 경로의 중간 역들을 하나씩 제거하고 다시 탐색
      for (let i = 1; i < result.stationIds.length - 1; i++) {
        if (results.length >= k) break;
        
        const modifiedGraph = { ...graph };
        const removedStationId = result.stationIds[i];
        const node = modifiedGraph.nodes.get(removedStationId);
        
        if (node) {
          // 해당 역의 일부 엣지만 제거 (완전히 제거하지 않음)
          const originalNeighbors = [...node.neighbors];
          node.neighbors = node.neighbors.filter(e => 
            e.to !== result.stationIds[i + 1] && e.from !== result.stationIds[i - 1]
          );
          
          // 다시 탐색
          const alternative = await findFastestRoute(
            modifiedGraph,
            startId,
            endId,
            timestamp,
            options
          );
          
          if (alternative) {
            const pathKey = alternative.stationIds.join(',');
            if (!foundPaths.has(pathKey)) {
              foundPaths.add(pathKey);
              results.push(alternative);
            }
          }
          
          // 원래 상태로 복구
          node.neighbors = originalNeighbors;
        }
      }
    }
  }
  
  return results.slice(0, k);
}

