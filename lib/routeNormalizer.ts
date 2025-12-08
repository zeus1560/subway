// 백엔드 RouteResult를 프론트 RouteSummary로 변환

import { RouteResult } from './api';
import { RouteSummary, SubPathSummary, StationInfo, safeMinutes, safeFare } from '@/types/route';

/**
 * 원본 ODsay/Naver subPath 배열을 요약용 subPaths로 변환
 * - 도보 구간은 모두 합쳐서 "도보 X분" 칩 1개로만 표시
 * - 같은 label이 연속으로 나오면 minutes를 합쳐서 하나로 합침
 */
function buildSummarySubPaths(rawSubPath: any[]): SubPathSummary[] {
  if (!Array.isArray(rawSubPath) || rawSubPath.length === 0) {
    return [];
  }

  let totalWalk = 0;
  const transitSegments: SubPathSummary[] = [];

  rawSubPath.forEach((sp) => {
    if (!sp || typeof sp !== 'object') {
      return;
    }

    // sectionTime은 초 단위이므로 분으로 변환
    const rawMinutes = sp.sectionTime ? Math.round(sp.sectionTime / 60) : null;
    const minutes = safeMinutes(rawMinutes);
    const t = sp.trafficType as number;

    if (t === 3) {
      // 도보: 나중에 하나로 합치기 위해 합계만 모아 둔다
      if (minutes != null) {
        totalWalk += minutes;
      }
      return;
    }

    if (t === 1) {
      // 지하철
      const lane = sp.lane?.[0];
      let label = "지하철"; // 기본값
      
      if (lane) {
        if (lane.name) {
          // "5호선" 형식이면 그대로 사용
          const nameStr = String(lane.name).trim();
          label = nameStr.length > 0 ? nameStr : "지하철";
        }
      }
      
      // label이 확실히 채워진 경우에만 추가
      // label이 비어있지 않거나 minutes가 있으면 추가
      if ((label && label.trim().length > 0) || minutes != null) {
        transitSegments.push({
          type: "subway",
          label: (label && label.trim().length > 0) ? label : "지하철",
          minutes,
        });
      }
    } else if (t === 2) {
      // 버스
      const lane = sp.lane?.[0];
      let label = "버스"; // 기본값
      
      if (lane && lane.busNo) {
        const busNo = String(lane.busNo).trim();
        label = busNo.length > 0 ? `버스 ${busNo}` : "버스";
      }
      
      transitSegments.push({
        type: "bus",
        label,
        minutes,
      });
    }
  });

  const result: SubPathSummary[] = [];

  // 도보 합산이 있으면 제일 앞에 "도보 X분" 칩 하나 추가
  if (totalWalk > 0) {
    result.push({
      type: "walk",
      label: "도보",
      minutes: totalWalk,
    });
  }

  // 지하철/버스 구간은 순서대로 그대로 나열하되,
  // 같은 label이 연속으로 나오면 minutes를 합쳐서 하나로 합친다.
  transitSegments.forEach((seg) => {
    // label이 비어있으면 스킵
    if (!seg.label || seg.label.trim().length === 0) {
      return;
    }

    const last = result[result.length - 1];
    if (last && last.type === seg.type && last.label === seg.label) {
      // 같은 타입, 같은 label이면 시간 합산
      const a = last.minutes ?? 0;
      const b = seg.minutes ?? 0;
      const sum = a + b;
      last.minutes = Number.isFinite(sum) && sum > 0 ? sum : last.minutes;
    } else {
      // 다른 타입이거나 다른 label이면 새로 추가
      result.push(seg);
    }
  });

  return result;
}

/**
 * perSegment 기반으로 요약용 subPaths 생성
 * 라인 단위로 묶어서 반환 (연속된 같은 라인 구간을 하나로 합침)
 */
function buildSummarySubPathsFromSegments(segments: any[]): SubPathSummary[] {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const result: SubPathSummary[] = [];
  let current: SubPathSummary | null = null;

  for (const seg of segments) {
    if (!seg || typeof seg !== 'object') {
      continue;
    }

    // 환승 구간은 건너뛰기 (isTransfer가 true인 경우)
    if (seg.isTransfer === true) {
      continue;
    }

    const minutes = safeMinutes(seg.durationMinutes ?? seg.travelTime ?? seg.minutes ?? seg.segmentMinutes);
    const rawLine = seg.line;
    
    // line 필드 처리 및 정규화
    let normalizedLine: string = '';
    if (rawLine != null) {
      if (typeof rawLine === 'number') {
        normalizedLine = String(rawLine);
      } else if (typeof rawLine === 'string') {
        // "5", "5호선", "지하철 5호선" 등 다양한 형식 처리
        normalizedLine = rawLine.replace(/호선/g, '').replace(/[^0-9]/g, '').trim();
      } else {
        normalizedLine = String(rawLine).replace(/호선/g, '').replace(/[^0-9]/g, '').trim();
      }
    }
    
    // 도보 구간은 별도 처리 (현재는 지하철만 처리)
    if (normalizedLine === '' || rawLine === '도보' || rawLine === 'undefined' || rawLine === 'null') {
      continue;
    }
    
    // 노선 번호로 label 생성
    const label = normalizedLine.length > 0 ? `${normalizedLine}호선` : "지하철";
    
    // 같은 라인인지 확인 (normalizedLine으로 비교)
    const currentLine: string = current ? (() => {
      const currentLabel = current.label || '';
      return currentLabel.replace(/호선/g, '').replace(/[^0-9]/g, '').trim();
    })() : '';
    
    if (current && currentLine === normalizedLine && current.type === 'subway') {
      // 같은 라인 계속 - 구간 확장
      current.to = seg.to;
      const a = current.minutes ?? 0;
      const b = minutes ?? 0;
      current.minutes = Number.isFinite(a + b) && (a + b) > 0 ? a + b : current.minutes;
      
      // 정거장 수 합산
      if (typeof seg.stationCount === 'number') {
        current.stationCount = (current.stationCount ?? 0) + seg.stationCount;
      }
      
      // stations 배열은 생성하지 않음 (from → to만 표시하기 위해)
    } else {
      // 이전 subPath 종료
      if (current) {
        result.push(current);
      }
      
      // 새 subPath 시작
      current = {
        type: "subway",
        label,
        minutes,
        stationCount: typeof seg.stationCount === 'number' ? seg.stationCount : undefined,
        from: seg.from,
        to: seg.to,
        // stations 배열은 생성하지 않음 (from → to만 표시하기 위해)
        line: normalizedLine || undefined,
      };
    }
  }

  // 마지막 subPath 추가
  if (current) {
    result.push(current);
  }

  return result;
}

/**
 * 라인 번호 정규화 헬퍼 함수
 */
function normalizeLineId(line: any): string {
  if (line == null) return '';
  if (typeof line === 'number') {
    return String(line);
  }
  if (typeof line === 'string') {
    return line.replace(/호선/g, '').replace(/[^0-9]/g, '').trim();
  }
  return String(line).replace(/호선/g, '').replace(/[^0-9]/g, '').trim();
}

/**
 * perSegment 기반으로 역 리스트 생성
 * 출발역, 모든 환승역, 도착역을 포함
 */
function buildSummaryStationsFromSegments(segments: any[]): StationInfo[] {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const stations: StationInfo[] = [];
  const first = segments[0];
  const last = segments[segments.length - 1];

  // 1) 출발역
  if (first && first.from) {
    const lineNum = normalizeLineId(first.line);
    
    stations.push({
      name: first.from,
      line: lineNum || undefined,
      type: 'start',
    });
  }

  // 2) 환승역들
  for (let i = 0; i < segments.length - 1; i++) {
    const cur = segments[i];
    const next = segments[i + 1];

    if (!cur || !next) continue;

    // 라인이 다르면 환승역
    const curLineNormalized = normalizeLineId(cur.line);
    const nextLineNormalized = normalizeLineId(next.line);

    // 라인이 다르고, cur.to와 next.from이 같은 역이면 환승역
    if (curLineNormalized !== nextLineNormalized && cur.to === next.from && cur.to) {
      const transferName = cur.to; // or next.from (둘은 같아야 함)
      
      // 중복 방지 (name + line 기준)
      const exists = stations.some(s => s.name === transferName && s.line === nextLineNormalized);
      if (!exists) {
        stations.push({
          name: transferName,
          line: nextLineNormalized || undefined, // 환승 후 라인 기준
          type: 'transfer',
        });
      }
    }
  }

  // 3) 도착역
  if (last && last.to) {
    const lineNum = normalizeLineId(last.line);
    const exists = stations.some(s => s.name === last.to && s.line === lineNum);
    if (!exists) {
      stations.push({
        name: last.to,
        line: lineNum || undefined,
        type: 'end',
      });
    }
  }

  return stations;
}

/**
 * RouteResult를 RouteSummary로 정규화
 * 
 * 이제는 perSegment만 사용합니다. rawSubPath는 더 이상 사용하지 않습니다.
 * 새로운 routeAlgorithm.ts 기반 경로 탐색 결과를 처리합니다.
 */
export function normalizeRoute(raw: RouteResult, index: number): RouteSummary {
  // 총 소요 시간: RouteResult의 필드 직접 사용
  const totalMinutes = safeMinutes(raw.totalTravelMinutes ?? raw.travelTime);
  
  // 요금: RouteResult의 필드 직접 사용
  const fare = safeFare(raw.fare);
  
  // 환승 횟수: RouteResult의 필드 직접 사용
  const transfers = typeof raw.transfers === 'number' && raw.transfers >= 0 ? raw.transfers : 0;
  
  // perSegment를 유일한 데이터 소스로 사용
  const segments = raw.detail?.perSegment || [];
  
  // ★ subPaths 생성: perSegment 기반으로만 생성
  // rawSubPath는 더 이상 사용하지 않음 (옛날 네이버 API용)
  const subPaths: SubPathSummary[] = buildSummarySubPathsFromSegments(segments);
  
  // ★ stations 생성: perSegment 기반으로 출발역, 환승역, 도착역 추출
  const stations: StationInfo[] = buildSummaryStationsFromSegments(segments);
  
  // ID: naver-${index} 형식 사용
  const id = `naver-${index}`;
  const isBest = index === 0;
  
  // 혼잡도 점수 (정렬에 사용)
  const congestionScore = typeof raw.congestionScore === 'number' && 
    Number.isFinite(raw.congestionScore) && raw.congestionScore >= 0
    ? raw.congestionScore
    : undefined;

  const summary = {
    id,
    totalMinutes,
    fare,
    transfers,
    isBest,
    congestionScore,
    subPaths,
    stations,
  };

  // 디버그 로그: normalizeRoute 결과 확인
  console.debug('[normalizeRoute] result', {
    totalMinutes: summary.totalMinutes,
    subPathsLength: summary.subPaths?.length || 0,
    stationsLength: summary.stations?.length || 0,
    subPaths: summary.subPaths?.map(sp => ({
      type: sp.type,
      label: sp.label,
      from: sp.from,
      to: sp.to,
      minutes: sp.minutes,
      stations: sp.stations,
      stationsCount: sp.stations?.length || 0,
    })),
    stations: summary.stations,
  });

  return summary;
}

