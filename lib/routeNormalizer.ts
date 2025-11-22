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
 * perSegment 기반으로 요약용 subPaths 생성 (fallback)
 */
function buildSummarySubPathsFromSegments(segments: any[]): SubPathSummary[] {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  let totalWalk = 0;
  const transitSegments: SubPathSummary[] = [];

  segments.forEach((seg: any) => {
    if (!seg || typeof seg !== 'object') {
      return;
    }

    const minutes = safeMinutes(seg.durationMinutes ?? seg.travelTime ?? seg.minutes ?? seg.segmentMinutes);
    const stationCount = typeof seg.stationCount === 'number' ? seg.stationCount : undefined;
    const rawLine = seg.line;
    
    // line 필드가 숫자일 수도 있고 문자열일 수도 있음
    // 예: "5", "5호선", "1", "2" 등
    let lineStr = '';
    if (rawLine != null) {
      if (typeof rawLine === 'number') {
        lineStr = String(rawLine);
      } else if (typeof rawLine === 'string') {
        lineStr = rawLine.trim();
      } else {
        lineStr = String(rawLine).trim();
      }
    }
    
    // 디버깅: line 값 확인
    if (process.env.NODE_ENV === 'development' && segments.indexOf(seg) < 3) {
      console.log('[buildSummarySubPathsFromSegments] seg:', { 
        rawLine, 
        lineStr, 
        from: seg.from, 
        to: seg.to,
        minutes,
        stationCount
      });
    }
    
    if (lineStr === '도보' || lineStr === '' || lineStr === 'undefined' || lineStr === 'null') {
      // 도보: 합산
      if (minutes != null) {
        totalWalk += minutes;
      }
      return;
    }
    
    let type: "walk" | "subway" | "bus";
    let label: string;
    
    if (lineStr.toLowerCase().includes('버스') || lineStr.toLowerCase().startsWith('bus')) {
      type = "bus";
      label = lineStr.includes('버스') ? lineStr : `버스 ${lineStr}`;
    } else {
      type = "subway";
      // 노선 번호 추출 (예: "5" -> "5호선", "5호선" -> "5호선", "1" -> "1호선")
      const lineNum = lineStr.replace(/호선/g, '').replace(/[^0-9]/g, '').trim();
      if (lineNum.length > 0) {
        label = `${lineNum}호선`;
      } else {
        // 숫자가 없으면 원본 문자열 사용 (이미 "5호선" 형식일 수 있음)
        label = lineStr.length > 0 ? lineStr : "지하철";
      }
    }
    
    // label이 비어있지 않은 경우에만 추가
    if (label && label.length > 0 && label !== "지하철") {
      transitSegments.push({
        type,
        label,
        minutes,
        stationCount, // 정거장 수 포함
      });
    }
  });

  const result: SubPathSummary[] = [];

  // 도보 합산이 있으면 제일 앞에 추가
  if (totalWalk > 0) {
    result.push({
      type: "walk",
      label: "도보",
      minutes: totalWalk,
    });
  }

  // 같은 label이 연속으로 나오면 합치기
  transitSegments.forEach((seg) => {
    // label이 비어있으면 스킵
    if (!seg.label || seg.label.trim().length === 0) {
      return;
    }

    const last = result[result.length - 1];
    if (last && last.type === seg.type && last.label === seg.label) {
      // 같은 타입, 같은 label이면 시간과 정거장 수 합산
      const a = last.minutes ?? 0;
      const b = seg.minutes ?? 0;
      const sum = a + b;
      last.minutes = Number.isFinite(sum) && sum > 0 ? sum : last.minutes;
      
      // 정거장 수도 합산
      if (seg.stationCount != null) {
        last.stationCount = (last.stationCount ?? 0) + seg.stationCount;
      }
    } else {
      result.push(seg);
    }
  });

  return result;
}

/**
 * RouteResult를 RouteSummary로 정규화
 * 
 * 이 함수가 유일하게 subPaths를 생성하는 곳입니다.
 * 다른 곳에서는 subPaths를 생성하거나 수정하지 않습니다.
 */
export function normalizeRoute(raw: RouteResult, index: number): RouteSummary {
  // 총 소요 시간
  const totalMinutes = safeMinutes(raw.totalTravelMinutes ?? raw.travelTime);
  
  // 요금
  const fare = safeFare(raw.fare);
  
  // 환승 횟수
  const transfers = typeof raw.transfers === 'number' && raw.transfers >= 0 ? raw.transfers : 0;
  
  // perSegment는 역 리스트 추출에도 사용되므로 미리 선언
  const segments = raw.detail?.perSegment || [];
  
  // ★ subPaths 생성: rawSubPath 우선 사용, 없으면 perSegment 기반
  // 이 부분이 유일한 subPaths 생성 지점입니다.
  let subPaths: SubPathSummary[] = [];
  
  // 네이버 API 원본 subPath가 있으면 사용
  if (raw.rawSubPath && Array.isArray(raw.rawSubPath) && raw.rawSubPath.length > 0) {
    subPaths = buildSummarySubPaths(raw.rawSubPath);
  } else {
    // fallback: perSegment 기반
    subPaths = buildSummarySubPathsFromSegments(segments);
  }
  
  // 디버깅: subPaths 생성 결과 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('[normalizeRoute] subPaths 생성됨:', JSON.stringify(subPaths, null, 2));
    console.log('[normalizeRoute] segments 샘플:', segments.slice(0, 3).map(s => ({ line: s.line, from: s.from, to: s.to })));
  }
  
  
  // 간결한 역 리스트 생성 (출발역, 환승역, 도착역만)
  // raw.stations가 이미 간결화되어 있으면 그대로 사용
  const stations: StationInfo[] = [];
  
  if (raw.stations && Array.isArray(raw.stations) && raw.stations.length > 0) {
    // 이미 간결화된 역 리스트 사용
    raw.stations.forEach((stationName: string) => {
      if (stationName) {
        stations.push({ name: stationName });
      }
    });
  } else {
    // fallback: perSegment에서 출발역, 환승역, 도착역만 추출
    if (segments.length > 0) {
      // 출발역
      if (segments[0].from) {
        stations.push({ name: segments[0].from });
      }
      
      // 환승역만 추가
      for (let i = 0; i < segments.length - 1; i++) {
        const current = segments[i];
        const next = segments[i + 1];
        
        if (current.to === next.from && current.to) {
          const exists = stations.some(s => s.name === current.to);
          if (!exists) {
            stations.push({ name: current.to });
          }
        }
      }
      
      // 도착역
      const lastSegment = segments[segments.length - 1];
      if (lastSegment.to) {
        const exists = stations.some(s => s.name === lastSegment.to);
        if (!exists) {
          stations.push({ name: lastSegment.to });
        }
      }
    }
  }
  
  // ID: naver-${index} 형식 사용
  const id = `naver-${index}`;
  const isBest = index === 0;
  
  // 혼잡도 점수 (정렬에 사용)
  const congestionScore = typeof raw.congestionScore === 'number' && 
    Number.isFinite(raw.congestionScore) && raw.congestionScore >= 0
    ? raw.congestionScore
    : undefined;
  
  return {
    id,
    totalMinutes,
    fare,
    transfers,
    isBest,
    congestionScore,
    subPaths,
    stations,
  };
}

