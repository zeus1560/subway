// 고도화된 경로 탐색 알고리즘 (네이버/카카오 스타일)

// - SubwayGraph 기반
// - 다익스트라(필요시 A* 휴리스틱 추가 가능하지만 일단 OFF)
// - 우선순위: 기본은 [환승 → 시간 → 혼잡도]

import { getStationById, type LineId } from './subwayMapData';
import { STATION_COORDINATES } from './stationCoordinates';
import { logger } from './logger';
import { getStationCongestionLevel } from './api';
import { SubwayGraph } from './graph/types';
import { getSubwayGraph } from './graph/buildSubwayGraph';

// =========================
// 타입 정의
// =========================

export interface RouteNode {
  stationId: string;
  path: string[];
  totalCost: number;        // 최종 점수 (가중치 적용된 스칼라)
  totalTime: number;        // 총 소요 시간 (분)
  totalCongestion: number;  // 혼잡도 누적 점수
  transferCount: number;    // 환승 횟수
  lines: LineId[];          // 경로에서 사용한 노선들 (환승 지점 추적용)
  edgeLines: LineId[];       // 각 엣지의 노선 정보 (path와 동일 길이 - 1)
  estimatedRemainingCost?: number; // A* 휴리스틱 (선택적)
}

export interface RouteSearchOptions {
  // chips 에 대응되는 옵션들
  preferLessCrowded?: boolean;  // 혼잡도 낮음
  preferLessTransfer?: boolean; // 환승 적음
  preferMinTime?: boolean;      // 최소 시간
  // 요금은 일단 미구현 (서울 기본 1250/1350 고정이라 실질 영향 적어서)
  maxTransfers?: number;
  maxRoutes?: number;
}

// =========================
// 내부 유틸
// =========================

function safeTime(n: number): number {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return x;
}

// 좌표 기반 이동 시간 (fallback)
// (SubwayGraph의 GraphEdge.travelTime 이 없는 경우에만 사용)
function calculateTravelTimeFallback(
  stationId1: string,
  stationId2: string,
  lineNum: string
): number {
  const station1 = getStationById(stationId1);
  const station2 = getStationById(stationId2);
  if (!station1 || !station2) return 2; // 안전 기본값

  const coord1 = STATION_COORDINATES.find(
    (c) => c.name === station1.name && c.lineNum === lineNum
  );
  const coord2 = STATION_COORDINATES.find(
    (c) => c.name === station2.name && c.lineNum === lineNum
  );

  let distance = 1.2; // km, 평균 역간 거리

  if (coord1 && coord2) {
    const R = 6371;
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.latitude * Math.PI) / 180) *
        Math.cos((coord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance = R * c;
  }

  // 35km/h ≒ 0.58km/min + 정차 0.5분
  const travelTime = distance / 0.58 + 0.5;
  return Math.max(1, Math.round(travelTime));
}

// 환승 시간 (역 크기에 따라 조정 가능하지만 일단 고정 4분)
function calculateTransferTime(): number {
  return 4;
}

// 혼잡도 + 시간 계산 (간선 단위)
// GraphEdge.travelTime 이 있으면 그걸 우선 사용하고, 없으면 위의 Fallback 사용
async function calcEdgeTimeAndCongestion(
  fromStationId: string,
  toStationId: string,
  lineNum: LineId,
  isTransfer: boolean,
  currentTime: Date,
  options: RouteSearchOptions,
  edgeTravelTime?: number
): Promise<{ time: number; congestion: number }> {
  const baseTravel = edgeTravelTime ?? calculateTravelTimeFallback(
    fromStationId,
    toStationId,
    lineNum
  );

  const transferTime = isTransfer ? calculateTransferTime() : 0;
  const totalTime = safeTime(baseTravel + transferTime);

  let congestionScore = 0;
  
  // 혼잡도 낮음 모드일 때만 혼잡도 API 호출
  const useCongestionApi = options.preferLessCrowded === true;
  
  if (useCongestionApi) {
    const toStation = getStationById(toStationId);
    if (toStation) {
      try {
        const congestion = await getStationCongestionLevel(
          toStationId,
          toStation.name,
          lineNum,
          currentTime
        );
        // level 자체를 그대로 점수로 사용 (0~3 정도라고 가정)
        congestionScore = Number(congestion.level) || 0;
      } catch (err) {
        logger.warn('혼잡도 조회 실패', { stationId: toStationId, err });
      }
    }
  }

  return { time: totalTime, congestion: congestionScore };
}

// "최적" 경로 정렬용: 환승 1회를 몇 분 정도로 볼 것인지
const TRANSFER_IMPORTANCE_MINUTES = 6; // 환승 1회를 약 6분 정도로 패널티
const TRANSFER_TIME_TOLERANCE = 5;     // 시간 5분 이내면 환승 적은 쪽 우선

// 검색 모드별 가중치 결정 (튜닝됨)
function getWeights(options: RouteSearchOptions) {
  // 기본(최적): 환승 << 시간 << 혼잡도 순서로 강하게 우선
  // 하지만 환승 차이가 1 이상이고 시간 차이가 5분 미만이면 환승 적은 쪽 우선
  let W_TRANSFER = 50000;  // 환승 1번 차이 = 약 50분 시간 차이와 동등
  let W_TIME = 100;
  let W_CONG = 1;

  if (options.preferMinTime) {
    // 최소 시간: 시간을 가장 크게, 그 다음 환승
    W_TRANSFER = 300;      // 환승보다 시간 우선
    W_TIME = 100000;
    W_CONG = 10;
  } else if (options.preferLessTransfer) {
    // 환승 적음: 환승을 극단적으로 크게, 시간/혼잡도는 서브
    W_TRANSFER = 150000;   // 환승 1번 차이 = 약 1500분 시간 차이와 동등
    W_TIME = 30;
    W_CONG = 3;
  } else if (options.preferLessCrowded) {
    // 혼잡도 낮음: 혼잡도 우선, 그 다음 환승, 마지막이 시간
    W_TRANSFER = 30000;
    W_TIME = 50;
    W_CONG = 5000;
  }

  return { W_TRANSFER, W_TIME, W_CONG };
}

// ============================================================
// 경로 비교 함수 (직관적인 우선순위 기준)
// ============================================================
// 정렬 우선순위:
//   1순위: 총 소요 시간(분) 최소
//   2순위: 시간이 거의 같다면(0.1분 이내), 환승 횟수 최소
//   3순위: 환승 횟수도 같다면, 사용하는 노선 개수 최소
//   4순위: 그것도 같다면, 역 개수(path 길이) 최소
//   5순위: 위 조건들로 비교해서도 완전히 같을 때만 cost(가중합 점수) 사용
// ============================================================
export function compareRouteNode(a: RouteNode, b: RouteNode): number {
  const timeDiff = a.totalTime - b.totalTime;
  if (Math.abs(timeDiff) > 0.1) {
    return timeDiff;
  }

  const transferDiff = a.transferCount - b.transferCount;
  if (transferDiff !== 0) {
    return transferDiff;
  }

  const lineDiff = a.lines.length - b.lines.length;
  if (lineDiff !== 0) {
    return lineDiff;
  }

  const hopDiff = a.path.length - b.path.length;
  if (hopDiff !== 0) {
    return hopDiff;
  }

  const costDiff = (a.totalCost ?? 0) - (b.totalCost ?? 0);
  return costDiff;
}

// 경로가 다른 경로에 지배되는지 확인 (직관적인 기준)
function isDominatedRoute(target: RouteNode, others: RouteNode[]): boolean {
  return others.some(o => {
    if (o === target) return false;
    
    const timeBetter = o.totalTime <= target.totalTime;
    const transferBetter = o.transferCount <= target.transferCount;
    const hopBetter = o.path.length <= target.path.length;
    const lineBetter = o.lines.length <= target.lines.length;

    const strictlyBetter =
      o.totalTime < target.totalTime ||
      o.transferCount < target.transferCount ||
      o.path.length < target.path.length ||
      o.lines.length < target.lines.length;

    return timeBetter && transferBetter && hopBetter && lineBetter && strictlyBetter;
  });
}

// 다익스트라에서 사용할 PQ
class PriorityQueue<T> {
  private items: T[] = [];
  constructor(private compare: (a: T, b: T) => number) {}

  enqueue(item: T) {
    this.items.push(item);
    this.items.sort(this.compare);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

// =========================
// 핵심: 단일 최적 경로 탐색 (다익스트라)
// =========================

interface SearchState {
  stationId: string;
  path: string[];
  totalTime: number;
  totalCongestion: number;
  transferCount: number;
  lastLine: LineId | null;
  totalCost: number;
  edgeLines: LineId[];  // 각 엣지의 노선 정보
}

async function findBestRouteCore(
  startStationId: string,
  endStationId: string,
  graph: SubwayGraph,
  currentTime: Date,
  options: RouteSearchOptions,
  returnMultiple: boolean = false,
  maxRoutes: number = 3
): Promise<RouteNode | RouteNode[] | null> {
  const { W_TRANSFER, W_TIME, W_CONG } = getWeights(options);
  const maxTransfers = options.maxTransfers ?? 5;

  const pq = new PriorityQueue<SearchState>((a, b) => {
    // 시간 우선 정렬 (다익스트라 효율성을 위해)
    const timeDiff = a.totalTime - b.totalTime;
    if (Math.abs(timeDiff) > 0.1) {
      return timeDiff;
    }
    // 시간이 거의 같으면 환승 횟수로 비교
    const transferDiff = a.transferCount - b.transferCount;
    if (transferDiff !== 0) {
      return transferDiff;
    }
    // 그것도 같으면 cost로 비교
    return a.totalCost - b.totalCost;
  });

  const startState: SearchState = {
    stationId: startStationId,
    path: [startStationId],
    totalTime: 0,
    totalCongestion: 0,
    transferCount: 0,
    lastLine: null,
    totalCost: 0,
    edgeLines: [],
  };

  // 각 역까지의 "최고(가장 낮은) cost" - 여러 경로를 찾기 위해 완화
  const bestCost = new Map<string, number>();
  bestCost.set(startStationId, 0);
  
  // 여러 경로를 찾기 위한 변수
  const foundRoutes: RouteNode[] = [];
  const visitedPaths = new Set<string>();

  pq.enqueue(startState);

  let iterations = 0;
  const MAX_ITER = 10000;

  while (!pq.isEmpty() && iterations < MAX_ITER) {
    iterations++;
    const cur = pq.dequeue()!;

    // 경로 키 생성 (중복 체크용)
    const pathKey = cur.path.join(',');
    
    if (returnMultiple) {
      // 여러 경로를 찾는 경우: 이미 방문한 경로는 스킵하되, 비슷한 점수면 허용
      const pathScore = cur.totalTime + cur.transferCount * TRANSFER_IMPORTANCE_MINUTES;
      const recorded = bestCost.get(cur.stationId);
      if (recorded !== undefined && recorded < pathScore - 10) continue; // 10분 이상 차이나면 스킵
    } else {
      // 단일 경로를 찾는 경우: 기존 로직
      const recorded = bestCost.get(cur.stationId);
      if (recorded !== undefined && recorded < cur.totalCost) continue;
    }

    if (cur.stationId === endStationId) {
      // 경로에서 사용한 노선 추출
      const routeLines: LineId[] = [];
      if (cur.edgeLines && cur.edgeLines.length > 0) {
        routeLines.push(cur.edgeLines[0]);
        for (let i = 1; i < cur.edgeLines.length; i++) {
          if (cur.edgeLines[i] !== cur.edgeLines[i - 1]) {
            routeLines.push(cur.edgeLines[i]);
          }
        }
      }

      const route: RouteNode = {
        stationId: cur.stationId,
        path: cur.path,
        totalCost: cur.totalCost,
        totalTime: cur.totalTime,
        totalCongestion: cur.totalCongestion,
        transferCount: cur.transferCount,
        lines: routeLines,
        edgeLines: cur.edgeLines || [],
      };

      // ============================================================
      // 방화(5001) → 강남(2021) 경로 분석용 상세 로그
      // ============================================================
      if (startStationId === '5001' && endStationId === '2021') {
        // 경로를 역 이름으로 변환
        const pathWithNames = cur.path.map(id => {
          const station = getStationById(id);
          return station ? `${station.name}(${id})` : id;
        });
        
        // 구간별 노선 정보 추출
        const segments: string[] = [];
        if (cur.edgeLines && cur.edgeLines.length > 0) {
          let currentLine = cur.edgeLines[0];
          let segmentStart = 0;
          
          for (let i = 1; i < cur.edgeLines.length; i++) {
            if (cur.edgeLines[i] !== currentLine) {
              const startStation = getStationById(cur.path[segmentStart]);
              const endStation = getStationById(cur.path[i]);
              segments.push(
                `${currentLine}호선 ${startStation?.name || cur.path[segmentStart]} → ${endStation?.name || cur.path[i]}`
              );
              segmentStart = i;
              currentLine = cur.edgeLines[i];
            }
          }
          // 마지막 구간
          const startStation = getStationById(cur.path[segmentStart]);
          const endStation = getStationById(cur.path[cur.path.length - 1]);
          segments.push(
            `${currentLine}호선 ${startStation?.name || cur.path[segmentStart]} → ${endStation?.name || cur.path[cur.path.length - 1]}`
          );
        }
        
        // 가중합 점수 계산
        const weightedScore = cur.totalTime + cur.transferCount * TRANSFER_IMPORTANCE_MINUTES;
        
        // 경로 유형 분류
        let routeType = 'UNKNOWN';
        const hasLine5 = cur.edgeLines?.includes('5') || false;
        const hasLine1 = cur.edgeLines?.includes('1') || false;
        const hasLine2 = cur.edgeLines?.includes('2') || false;
        const hasLine9 = cur.edgeLines?.includes('9') || false;
        
        if (hasLine5 && hasLine1 && !hasLine2) {
          routeType = 'TYPE_A: 5호선→1호선 (신길 환승)';
        } else if (hasLine5 && hasLine2) {
          routeType = 'TYPE_B: 5호선→2호선 (신도림/대림 경유)';
        } else if (hasLine5 && hasLine9) {
          routeType = 'TYPE_C: 5호선→9호선';
        } else {
          routeType = `OTHER: ${routeLines.join('→')}`;
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`[경로 후보 발견] ${routeType}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`경로 (${cur.path.length}개 역):`, pathWithNames.join(' → '));
        console.log(`구간별 노선:`, segments.join(' → '));
        console.log(`총 소요 시간: ${cur.totalTime.toFixed(1)}분`);
        console.log(`환승 횟수: ${cur.transferCount}회`);
        console.log(`혼잡도 합계: ${cur.totalCongestion}`);
        console.log(`totalCost (가중치 적용): ${cur.totalCost.toFixed(1)}`);
        console.log(`가중합 점수 (시간 + 환승×6분): ${weightedScore.toFixed(1)}`);
        console.log(`사용 노선: ${routeLines.join(', ')}호선`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // ============================================================
        // 경로 유형별 비교 분석
        // ============================================================
        // TYPE_A (5호선→1호선, 신길 환승):
        //   - 예상 경로: 방화(5) → 신길(5) → 신길(1) → 강남(1)
        //   - 장점: 환승 1회, 직선 경로
        //   - 단점: 1호선이 느릴 수 있음
        //
        // TYPE_B (5호선→2호선, 신도림/대림 경유):
        //   - 예상 경로: 방화(5) → 까치산(5) → 까치산(2) → 신도림(2) → 대림(2) → 강남(2)
        //   - 장점: 2호선이 빠를 수 있음
        //   - 단점: 환승 1회 + 2호선으로 우회 (거리 증가)
        //
        // 현재 정렬 기준 (compareRouteNode):
        //   1순위: 가중합 점수 = 시간 + 환승×6분
        //   2순위: 시간 차이 5분 이내면 환승 적은 쪽 우선
        //   3순위: 혼잡도
        //
        // 문제점 분석:
        //   - 만약 TYPE_B가 시간이 5분 정도 더 빠르면 (예: 50분 vs 55분)
        //     가중합 점수: TYPE_B = 50 + 1×6 = 56, TYPE_A = 55 + 1×6 = 61
        //     → TYPE_B가 우선 선택됨 (올바름)
        //   
        //   - 하지만 TYPE_B가 시간이 비슷하거나 더 길면 (예: 60분 vs 55분)
        //     가중합 점수: TYPE_B = 60 + 1×6 = 66, TYPE_A = 55 + 1×6 = 61
        //     → TYPE_A가 우선 선택됨 (올바름)
        //
        //   - 만약 TYPE_B가 환승 2회이고 시간이 5분 더 빠르면 (예: 50분 vs 55분)
        //     가중합 점수: TYPE_B = 50 + 2×6 = 62, TYPE_A = 55 + 1×6 = 61
        //     → TYPE_A가 우선 선택됨 (올바름, 환승 1회 차이 = 6분 패널티)
        //
        //   - 문제 상황: TYPE_B가 환승 2회인데 시간이 7분 더 빠르면 (예: 48분 vs 55분)
        //     가중합 점수: TYPE_B = 48 + 2×6 = 60, TYPE_A = 55 + 1×6 = 61
        //     → TYPE_B가 우선 선택됨 (네이버/카카오 기준으로는 TYPE_A가 더 나을 수 있음)
        //     이유: 실제로는 환승 1회 차이가 시간 7분보다 중요할 수 있음
        // ============================================================
      }

      if (returnMultiple) {
        // 중복 경로 체크
        if (!visitedPaths.has(pathKey)) {
          visitedPaths.add(pathKey);
          foundRoutes.push(route);
          
          if (foundRoutes.length >= maxRoutes) {
            // 새로운 기준으로 정렬 후 반환
            foundRoutes.sort((a, b) => compareRouteNode(a, b));
            logger.info('여러 경로 탐색 완료', {
              iterations,
              routeCount: foundRoutes.length,
            });
            return foundRoutes;
          }
        }
        // 여러 경로를 찾는 경우 계속 탐색
        continue;
      } else {
        // 단일 경로를 찾는 경우 즉시 반환
        logger.info('최적 경로 탐색 완료', {
          iterations,
          totalTime: cur.totalTime,
          transfers: cur.transferCount,
          cost: cur.totalCost,
          hops: cur.path.length,
        });
        return route;
      }
    }

    const node = graph.nodes.get(cur.stationId);
    if (!node) continue;

    for (const edge of node.neighbors) {
      const nextId = edge.to;

      // 간단한 순환 방지: 동일 역 재방문 금지
      if (cur.path.includes(nextId)) continue;

      const lineNum = edge.line as LineId;
      const isTransferEdge = edge.isTransfer === true;

      // 환승 카운트: isTransfer edge가 있으면 무조건 환승 1회
      // isTransfer edge가 없지만 노선이 바뀌었으면 환승 1회
      // 둘 다 해당되면 중복 카운트 방지 (1회만 카운트)
      let transferIncrement = 0;
      if (isTransferEdge) {
        transferIncrement = 1;
      } else if (cur.lastLine && cur.lastLine !== lineNum) {
        // 노선이 바뀌었지만 isTransfer edge가 아닌 경우 (같은 ID 내 노선 변경)
        transferIncrement = 1;
      }
      
      const nextTransferCount = cur.transferCount + transferIncrement;

      if (nextTransferCount > maxTransfers) continue;

      const { time: edgeTime, congestion: edgeCong } =
        await calcEdgeTimeAndCongestion(
          cur.stationId,
          nextId,
          lineNum,
          isTransferEdge,
          currentTime,
          options,
          edge.travelTime
        );

      const nextTime = cur.totalTime + edgeTime;
      const nextCong = cur.totalCongestion + edgeCong;
      const nextCost =
        nextTransferCount * W_TRANSFER +
        nextTime * W_TIME +
        nextCong * W_CONG;

      // 가중합 점수 계산 (시간 + 환승 패널티)
      const nextScore = nextTime + nextTransferCount * TRANSFER_IMPORTANCE_MINUTES;
      
      if (returnMultiple) {
        // 여러 경로를 찾는 경우: 비슷한 점수면 허용
        const prevBest = bestCost.get(nextId);
        if (prevBest !== undefined && prevBest < nextScore - 10) {
          // 10분 이상 차이나면 스킵
          continue;
        }
        if (prevBest === undefined || nextScore < prevBest) {
          bestCost.set(nextId, nextScore);
        }
      } else {
        // 단일 경로를 찾는 경우: 기존 로직
        const prevBest = bestCost.get(nextId);
        if (prevBest !== undefined && prevBest <= nextCost) {
          continue;
        }
        bestCost.set(nextId, nextCost);
      }

      pq.enqueue({
        stationId: nextId,
        path: [...cur.path, nextId],
        totalTime: nextTime,
        totalCongestion: nextCong,
        transferCount: nextTransferCount,
        lastLine: lineNum,
        totalCost: nextCost,
        edgeLines: [...(cur.edgeLines || []), lineNum],
      });
    }
  }

  if (returnMultiple && foundRoutes.length > 0) {
    // 새로운 기준으로 정렬
    foundRoutes.sort((a, b) => compareRouteNode(a, b));
    logger.info('여러 경로 탐색 완료 (부분)', {
      iterations,
      routeCount: foundRoutes.length,
    });
    return foundRoutes;
  }
  
  logger.warn('경로를 찾지 못함', { iterations, startStationId, endStationId });
  return null;
}

// =========================
// 공개 API
// =========================

// 1) 전역 그래프 래퍼 (여러 경로를 반환하진 않고, "최적 1개"를 배열로 감싸서 반환)
export async function findOptimalRoutesUsingGlobalGraph(
  startStationId: string,
  endStationId: string,
  currentTime: Date,
  options: RouteSearchOptions = {}
): Promise<RouteNode[]> {
  const graph = getSubwayGraph();
  const best = await findBestRouteCore(
    startStationId,
    endStationId,
    graph,
    currentTime,
    options,
    false // returnMultiple = false
  );
  if (Array.isArray(best)) {
    return best;
  }
  return best ? [best] : [];
}

// 2) 최단 시간/환승 기준 "대표 경로 1개"
export async function findFastestRoute(
  startStationId: string,
  endStationId: string,
  currentTime: Date,
  options: RouteSearchOptions = {}
): Promise<RouteNode | null> {
  logger.info('DEBUG_ROUTE_CALL', {
    startStationId,
    endStationId,
    options,
  });
  
  // chips 에 따라 weights 가 바뀜
  const graph = getSubwayGraph();
  const result = await findBestRouteCore(startStationId, endStationId, graph, currentTime, {
    ...options,
  }, false); // returnMultiple = false
  
  if (Array.isArray(result)) {
    return result[0] || null;
  }
  return result;
}

// 경로를 문자열 키로 변환 (중복 체크용)
function routeToKey(route: RouteNode): string {
  return route.path.join(',');
}

// 디버그용 경로 출력 함수
function debugLogRoute(
  route: RouteNode,
  index: number,
  startName: string,
  endName: string
): void {
  const stationNames = route.path.map(id => {
    const station = getStationById(id);
    return station ? `${station.name}(${station.lines.join(',')})` : id;
  });
  
  const segments: string[] = [];
  if (route.edgeLines && route.edgeLines.length > 0) {
    let currentLine = route.edgeLines[0];
    let segmentStart = 0;
    
    for (let i = 1; i < route.edgeLines.length; i++) {
      if (route.edgeLines[i] !== currentLine) {
        const startStation = getStationById(route.path[segmentStart]);
        const endStation = getStationById(route.path[i]);
        segments.push(
          `${currentLine}호선 ${startStation?.name || route.path[segmentStart]} → ${endStation?.name || route.path[i]}`
        );
        segmentStart = i;
        currentLine = route.edgeLines[i];
      }
    }
    // 마지막 구간
    const startStation = getStationById(route.path[segmentStart]);
    const endStation = getStationById(route.path[route.path.length - 1]);
    segments.push(
      `${currentLine}호선 ${startStation?.name || route.path[segmentStart]} → ${endStation?.name || route.path[route.path.length - 1]}`
    );
  }
  
  logger.info(`[ROUTE DEBUG] 경로 ${index + 1}`, {
    start: startName,
    end: endName,
    환승횟수: route.transferCount,
    총시간: `${route.totalTime}분`,
    혼잡도합: route.totalCongestion,
    경로: segments.join(' → '),
    역수: route.path.length,
  });
}

// RouteNode에서 segments 정보 생성 (로그용)
function buildSegmentsFromRouteNode(route: RouteNode): Array<{
  from: string;
  to: string;
  line: string;
  travelTime: number;
  durationMinutes: number;
  isTransfer: boolean;
}> {
  const segments: Array<{
    from: string;
    to: string;
    line: string;
    travelTime: number;
    durationMinutes: number;
    isTransfer: boolean;
  }> = [];
  
  if (!route.edgeLines || route.edgeLines.length === 0 || route.path.length < 2) {
    return segments;
  }
  
  const graph = getSubwayGraph();
  let currentLine = route.edgeLines[0];
  let segmentStartIdx = 0;
  
  for (let i = 1; i <= route.edgeLines.length; i++) {
    const isLast = i === route.edgeLines.length;
    const nextLine = isLast ? null : route.edgeLines[i];
    
    // 노선이 바뀌거나 마지막 엣지인 경우
    if (nextLine !== currentLine || isLast) {
      const fromId = route.path[segmentStartIdx];
      const toId = route.path[isLast ? route.path.length - 1 : i];
      
      const fromStation = getStationById(fromId);
      const toStation = getStationById(toId);
      
      // 구간 시간 계산
      let segmentTime = 0;
      const endIdx = isLast ? route.path.length - 1 : i;
      for (let j = segmentStartIdx; j < endIdx; j++) {
        const edgeFromId = route.path[j];
        const edgeToId = route.path[j + 1];
        const node = graph.nodes.get(edgeFromId);
        if (node) {
          const edge = node.neighbors.find(e => e.to === edgeToId);
          if (edge) {
            segmentTime += edge.travelTime || 2;
          } else {
            segmentTime += 2; // 기본값
          }
        } else {
          segmentTime += 2; // 기본값
        }
      }
      
      // 환승 여부 확인 (이전 구간과 노선이 다름)
      const isTransfer = segmentStartIdx > 0 && 
                        route.edgeLines[segmentStartIdx - 1] !== currentLine;
      
      segments.push({
        from: fromStation?.name || fromId,
        to: toStation?.name || toId,
        line: currentLine,
        travelTime: segmentTime,
        durationMinutes: segmentTime,
        isTransfer: isTransfer || false,
      });
      
      if (!isLast) {
        segmentStartIdx = i;
        currentLine = nextLine!;
      }
    }
  }
  
  return segments;
}

// 3) K개의 후보 경로 (여러 옵션으로 경로 탐색)
export async function findKShortestPaths(
  startStationId: string,
  endStationId: string,
  currentTime: Date,
  k: number = 3,
  options: RouteSearchOptions = {}
): Promise<RouteNode[]> {
  const startStation = getStationById(startStationId);
  const endStation = getStationById(endStationId);
  const startName = startStation?.name || startStationId;
  const endName = endStation?.name || endStationId;
  
  logger.info(`[ROUTE DEBUG] 경로 탐색 시작`, {
    start: `${startName}(${startStationId})`,
    end: `${endName}(${endStationId})`,
    k,
    options,
  });
  
  const foundRoutes: RouteNode[] = [];
  const routeKeys = new Set<string>();
  
  // 여러 경로를 한 번에 찾기 (가중합 점수 기준)
  const graph = getSubwayGraph();
  const multipleRoutes = await findBestRouteCore(
    startStationId,
    endStationId,
    graph,
    currentTime,
    {
      ...options,
      preferLessTransfer: false, // 기본 옵션으로 여러 경로 찾기
    },
    true, // returnMultiple = true
    k * 2 // 더 많이 찾아서 필터링
  );
  
  if (Array.isArray(multipleRoutes)) {
    multipleRoutes.forEach(route => {
      const key = routeToKey(route);
      if (!routeKeys.has(key)) {
        routeKeys.add(key);
        foundRoutes.push(route);
        debugLogRoute(route, foundRoutes.length - 1, startName, endName);
      }
    });
  } else if (multipleRoutes) {
    // 단일 경로인 경우
    const key = routeToKey(multipleRoutes);
    if (!routeKeys.has(key)) {
      routeKeys.add(key);
      foundRoutes.push(multipleRoutes);
      debugLogRoute(multipleRoutes, foundRoutes.length - 1, startName, endName);
    }
  }
  
  // 추가로 다른 옵션으로도 찾기
  if (foundRoutes.length < k) {
    const fastestRoute = await findFastestRoute(
      startStationId,
      endStationId,
      currentTime,
      {
        ...options,
        preferMinTime: true,
        preferLessTransfer: false,
      }
    );
    if (fastestRoute) {
      const key = routeToKey(fastestRoute);
      if (!routeKeys.has(key)) {
        routeKeys.add(key);
        foundRoutes.push(fastestRoute);
        debugLogRoute(fastestRoute, foundRoutes.length - 1, startName, endName);
      }
    }
  }
  
  // ============================================================
  // 1단계: 필터링/정렬 전 모든 후보 경로 상세 로그 출력
  // ============================================================
  const isTestCase = (startName === '방화' && endName === '서울역') || 
                     (startName === '방화' && endName === '신논현');
  
  if (isTestCase) {
    console.log('\n\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║  [1단계] 필터링/정렬 전 모든 후보 경로 분석: ${startName} → ${endName}`);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log(`\n총 ${foundRoutes.length}개의 후보 경로를 찾았습니다.\n`);
    
    foundRoutes.forEach((route, idx) => {
      const segments = buildSegmentsFromRouteNode(route);
      const pathNames = route.path.map(id => getStationById(id)?.name ?? id);
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`[후보 경로 #${idx + 1}]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`총 소요 시간: ${route.totalTime.toFixed(1)}분`);
      console.log(`환승 횟수: ${route.transferCount}회`);
      console.log(`사용 노선 개수: ${route.lines.length}개 (${route.lines.join(', ')}호선)`);
      console.log(`역 개수: ${route.path.length}개`);
      console.log(`totalCost: ${route.totalCost?.toFixed(1) ?? 'N/A'}`);
      console.log(`\n경로 (역 이름): ${pathNames.join(' → ')}`);
      console.log(`\n구간별 상세 정보:`);
      segments.forEach((seg, segIdx) => {
        console.log(`  ${segIdx + 1}. ${seg.line}호선: ${seg.from} → ${seg.to} (${seg.travelTime.toFixed(1)}분${seg.isTransfer ? ', 환승' : ''})`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  }
  
  // 5. Pareto 필터링: 지배되는 경로 제거
  const filteredRoutes = foundRoutes.filter(route => !isDominatedRoute(route, foundRoutes));
  
  if (isTestCase) {
    console.log(`\n[필터링 결과]`);
    console.log(`  필터링 전: ${foundRoutes.length}개`);
    console.log(`  필터링 후: ${filteredRoutes.length}개`);
    console.log(`  제거된 경로: ${foundRoutes.length - filteredRoutes.length}개\n`);
  }
  
  // 6. 정렬: compareRouteNode 기준으로 정렬
  filteredRoutes.sort((a, b) => {
    const result = compareRouteNode(a, b);
    if (isTestCase && Math.abs(result) > 0) {
      const aSegments = buildSegmentsFromRouteNode(a);
      const bSegments = buildSegmentsFromRouteNode(b);
      console.log(`\n[정렬 비교]`);
      console.log(`  경로 A: ${a.totalTime.toFixed(1)}분, 환승 ${a.transferCount}회, 노선 ${a.lines.length}개, 역 ${a.path.length}개`);
      console.log(`  경로 B: ${b.totalTime.toFixed(1)}분, 환승 ${b.transferCount}회, 노선 ${b.lines.length}개, 역 ${b.path.length}개`);
      console.log(`  compareRouteNode 결과: ${result > 0 ? 'B가 우선' : 'A가 우선'}`);
    }
    return result;
  });
  
  // 7. 상위 k개만 반환
  const result = filteredRoutes.slice(0, k);
  
  if (isTestCase) {
    console.log(`\n[최종 선택된 경로]`);
    result.forEach((route, idx) => {
      const segments = buildSegmentsFromRouteNode(route);
      const pathNames = route.path.map(id => getStationById(id)?.name ?? id);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`[최종 순위 #${idx + 1}]`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`총 소요 시간: ${route.totalTime.toFixed(1)}분`);
      console.log(`환승 횟수: ${route.transferCount}회`);
      console.log(`사용 노선 개수: ${route.lines.length}개 (${route.lines.join(', ')}호선)`);
      console.log(`역 개수: ${route.path.length}개`);
      console.log(`경로: ${pathNames.join(' → ')}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  }
  
  // 상세 로그 출력 (방화→강남, 방화→서울역, 방화→신논현 테스트용)
  // isTestCase는 위에서 이미 선언됨
  if (isTestCase) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[경로 탐색 결과] ${startName} → ${endName}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`총 ${result.length}개의 경로를 찾았습니다.\n`);
    
    result.slice(0, 3).forEach((route, idx) => {
      const routeLines: string[] = [];
      if (route.edgeLines && route.edgeLines.length > 0) {
        let currentLine = route.edgeLines[0];
        let segmentStart = 0;
        
        for (let i = 1; i < route.edgeLines.length; i++) {
          if (route.edgeLines[i] !== currentLine) {
            const startStation = getStationById(route.path[segmentStart]);
            const endStation = getStationById(route.path[i]);
            routeLines.push(
              `${currentLine}호선 ${startStation?.name || route.path[segmentStart]} → ${endStation?.name || route.path[i]}`
            );
            segmentStart = i;
            currentLine = route.edgeLines[i];
          }
        }
        // 마지막 구간
        const startStation = getStationById(route.path[segmentStart]);
        const endStation = getStationById(route.path[route.path.length - 1]);
        routeLines.push(
          `${currentLine}호선 ${startStation?.name || route.path[segmentStart]} → ${endStation?.name || route.path[route.path.length - 1]}`
        );
      } else {
        // edgeLines가 없으면 path만 출력
        route.path.forEach((id) => {
          const station = getStationById(id);
          if (station) {
            routeLines.push(`${station.name}(${station.lines.join(',')}호선)`);
          }
        });
      }
      
      console.log(`경로 ${idx + 1}:`);
      console.log(`  총 시간: ${safeTime(route.totalTime).toFixed(1)}분`);
      console.log(`  환승 수: ${route.transferCount}회`);
      console.log(`  노선 수: ${route.lines.length}개`);
      console.log(`  역 개수: ${route.path.length}개`);
      console.log(`  혼잡도 합계: ${route.totalCongestion}`);
      console.log(`  경로: ${routeLines.join(' → ')}`);
      console.log('');
    });
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }
  
  logger.info(`[ROUTE DEBUG] 경로 탐색 완료`, {
    start: startName,
    end: endName,
    찾은경로수: foundRoutes.length,
    필터링후: filteredRoutes.length,
    최종반환: result.length,
    경로요약: result.map((r, idx) => ({
      순위: idx + 1,
      시간: `${safeTime(r.totalTime).toFixed(1)}분`,
      환승: r.transferCount,
      노선수: r.lines.length,
      역개수: r.path.length,
      혼잡도: r.totalCongestion,
    })),
  });
  
  return result;
}
