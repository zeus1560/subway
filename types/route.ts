// 경로 결과 UI용 타입 정의

export type TrafficType = "walk" | "subway" | "bus";

export interface SubPathSummary {
  type: TrafficType;           // walk / subway / bus
  label: string;               // "도보", "5호선", "버스 702" 등
  minutes: number | null;      // 유효한 시간(분), 없으면 null
  stationCount?: number;        // 정거장 수 (지하철/버스 구간만)
}

export interface StationInfo {
  name: string;
}

export interface RouteSummary {
  id: string;
  totalMinutes: number | null; // 전체 소요 시간
  fare: number | null;         // 요금
  transfers: number;           // 환승 횟수
  isBest: boolean;             // 최적 여부
  congestionScore?: number;    // 혼잡도 점수 (0~100, 선택적)
  subPaths: SubPathSummary[];  // 도보 / 지하철 / 버스 단위
  stations: StationInfo[];     // 역 리스트
}

// 숫자 처리 헬퍼 함수
export function safeMinutes(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function safeFare(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

