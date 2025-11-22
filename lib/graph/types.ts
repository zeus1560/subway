// 지하철 그래프 타입 정의

import { LineId, Station } from '../subwayMapData';

// 그래프 엣지 (역 간 연결)
export interface GraphEdge {
  from: string;        // 출발 역 ID
  to: string;          // 도착 역 ID
  line: LineId;        // 사용하는 노선
  travelTime: number;  // 이동 시간 (분)
  isTransfer: boolean; // 환승 여부
  transferTime?: number; // 환승 시간 (분, 환승인 경우만)
}

// 그래프 노드 (역)
export interface GraphNode {
  stationId: string;
  stationName: string;
  lines: LineId[];
  isTransfer: boolean;
  neighbors: GraphEdge[]; // 연결된 역들과 엣지 정보
}

// 전체 그래프
export interface SubwayGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

// 경로 탐색 결과
export interface RouteResult {
  type: 'fastest' | 'lessTransfer' | 'lessCrowded';
  stations: string[];              // 역 이름 배열
  stationIds: string[];             // 역 ID 배열
  travelTime: number;               // 총 소요 시간 (분) - 하위 호환성
  totalTravelMinutes: number;       // 총 소요 시간 (분) - 명시적 필드
  transfers: number;                // 환승 횟수
  congestionScore: number;           // 혼잡도 점수 (0~100)
  fare: number;                      // 요금 (원)
  lines: LineId[];                  // 사용한 노선들
  detail: {
    perSegment: Array<{
      from: string;
      to: string;
      line: LineId;
      travelTime: number;           // 하위 호환성
      durationMinutes: number;      // 구간 소요 시간 (분) - 명시적 필드
      congestion: number;            // 구간 혼잡도 (1~4)
      isTransfer: boolean;
    }>;
  };
}

// 경로 탐색 옵션
export interface RouteSearchOptions {
  timestamp?: Date;                  // 출발 시간 (없으면 현재 시간)
  maxTransfers?: number;             // 최대 환승 횟수
  maxRoutes?: number;                // 최대 경로 수
}

