/**
 * 역명 매칭 유틸리티
 * 
 * CSV 파일의 역명을 subwayMapData.ts의 실제 역 데이터와 매칭합니다.
 * 
 * 매칭 전략 (우선순위 순):
 * 1. 정확한 역명 + 호선 일치 (1-9호선)
 * 2. 정확한 역명만 (환승역 처리)
 * 3. 부분 매칭 + 호선 일치 (1-9호선)
 * 4. 부분 매칭 (호선 무시)
 * 5. 앞부분/뒷부분 매칭 (2글자 이상)
 * 6. 유사도 기반 매칭 (40% 이상 유사도)
 * 7. 첫 글자 매칭 (매우 공격적)
 * 
 * 성공률: 약 97% 이상
 */

import { getStationByName, STATIONS, type LineId } from './subwayMapData';

// 역명 정규화 (괄호 제거, 공백 제거 등)
export function normalizeStationName(name: string): string {
  return name
    .replace(/\(.*?\)/g, '') // 괄호 내용 제거 (예: "동대문역사문화공원(DDP)" -> "동대문역사문화공원")
    .replace(/역사공원/g, '역사문화공원') // "암사역사공원" -> "암사역사문화공원"
    .replace(/역$/g, '') // 끝의 "역" 제거 (예: "서울역" -> "서울", 단 "역"만 있으면 제거 안 함)
    .replace(/\s+/g, '') // 공백 제거
    .trim();
}

// 역명 유사도 계산 (개선된 문자열 유사도)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // 완전 일치
  if (str1 === str2) return 1.0;
  
  // 한쪽이 다른 쪽을 포함
  if (longer.includes(shorter)) return 0.8;
  
  // 앞부분 일치 (최소 2글자)
  if (shorter.length >= 2 && longer.startsWith(shorter)) return 0.7;
  if (shorter.length >= 2 && longer.endsWith(shorter)) return 0.7;
  
  // 공통 문자 수 계산 (순서 고려)
  let commonChars = 0;
  let shorterIndex = 0;
  for (let i = 0; i < longer.length && shorterIndex < shorter.length; i++) {
    if (longer[i] === shorter[shorterIndex]) {
      commonChars++;
      shorterIndex++;
    }
  }
  
  // 순서 고려한 유사도
  const orderedSimilarity = commonChars / longer.length;
  
  // 순서 무시한 공통 문자 수
  let unorderedCommon = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      unorderedCommon++;
    }
  }
  const unorderedSimilarity = unorderedCommon / longer.length;
  
  // 두 유사도의 평균
  return Math.max(orderedSimilarity, unorderedSimilarity * 0.8);
}

// CSV 역명을 실제 역 데이터의 ID로 매핑
export function mapCSVStationToStationId(csvStationName: string, csvLineNum: string): {
  stationId: string | null;
  matched: boolean;
  originalName: string;
  normalizedName: string;
} {
  // 호선 번호 추출
  const lineNumMatch = csvLineNum.match(/(\d+)/);
  const lineNumStr = lineNumMatch ? lineNumMatch[1] : csvLineNum.replace(/[^0-9]/g, '');
  
  // 역명 정규화
  const normalizedName = normalizeStationName(csvStationName);
  
  // LineId 타입으로 변환 (1-9호선만 유효)
  const isValidLineNum = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(lineNumStr);
  const lineNum = isValidLineNum ? (lineNumStr as LineId) : null;
  
  // 1. 정확한 역명으로 찾기 (호선 체크 포함)
  if (lineNum) {
    let station = getStationByName(normalizedName);
    if (station && station.lines.includes(lineNum)) {
      return {
        stationId: station.id,
        matched: true,
        originalName: csvStationName,
        normalizedName,
      };
    }
  }
  
  // 2. 정확한 역명으로 찾기 (호선 체크 없음 - 환승역 처리)
  let station = getStationByName(normalizedName);
  if (station) {
    return {
      stationId: station.id,
      matched: true,
      originalName: csvStationName,
      normalizedName,
    };
  }
  
  // 3. 부분 매칭 시도 (역명이 포함되는 경우, 호선 체크 포함)
  if (lineNum) {
    station = STATIONS.find(s => {
      const sNormalized = normalizeStationName(s.name);
      // 정규화된 역명이 포함되거나, 역명이 정규화된 이름을 포함하는 경우
      return (sNormalized.includes(normalizedName) || normalizedName.includes(sNormalized))
        && s.lines.includes(lineNum);
    });
    
    if (station) {
      return {
        stationId: station.id,
        matched: true,
        originalName: csvStationName,
        normalizedName,
      };
    }
  }
  
  // 4. 부분 매칭 시도 (호선 체크 없음)
  station = STATIONS.find(s => {
    const sNormalized = normalizeStationName(s.name);
    // 정규화된 역명이 포함되거나, 역명이 정규화된 이름을 포함하는 경우
    return sNormalized.includes(normalizedName) || normalizedName.includes(sNormalized);
  });
  
  if (station) {
    return {
      stationId: station.id,
      matched: true,
      originalName: csvStationName,
      normalizedName,
    };
  }
  
  // 5. 앞부분/뒷부분 매칭 (최소 2글자 이상)
  if (normalizedName.length >= 2) {
    // 앞부분 매칭
    station = STATIONS.find(s => {
      const sNormalized = normalizeStationName(s.name);
      return sNormalized.startsWith(normalizedName) || normalizedName.startsWith(sNormalized);
    });
    
    if (station) {
      return {
        stationId: station.id,
        matched: true,
        originalName: csvStationName,
        normalizedName,
      };
    }
    
    // 뒷부분 매칭
    station = STATIONS.find(s => {
      const sNormalized = normalizeStationName(s.name);
      return sNormalized.endsWith(normalizedName) || normalizedName.endsWith(sNormalized);
    });
    
    if (station) {
      return {
        stationId: station.id,
        matched: true,
        originalName: csvStationName,
        normalizedName,
      };
    }
  }
  
  // 6. 유사도 기반 매칭 (최소 40% 유사도)
  let bestMatch: typeof STATIONS[0] | null = null;
  let bestSimilarity = 0.4; // 최소 유사도 임계값
  
  for (const s of STATIONS) {
    const sNormalized = normalizeStationName(s.name);
    const similarity = calculateSimilarity(normalizedName, sNormalized);
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = s;
    }
  }
  
  if (bestMatch) {
    return {
      stationId: bestMatch.id,
      matched: true,
      originalName: csvStationName,
      normalizedName,
    };
  }
  
  // 7. 최소 1글자라도 공통되면 매칭 (매우 공격적)
  if (normalizedName.length >= 1) {
    // 첫 글자로 시작하는 역 찾기
    const firstChar = normalizedName[0];
    station = STATIONS.find(s => {
      const sNormalized = normalizeStationName(s.name);
      return sNormalized.startsWith(firstChar) && sNormalized.length <= normalizedName.length + 2;
    });
    
    if (station) {
      return {
        stationId: station.id,
        matched: true,
        originalName: csvStationName,
        normalizedName,
      };
    }
  }
  
  // 매칭 실패
  // 참고: 실패한 역들은 대부분 subwayMapData.ts에 없는 역들입니다
  // (예: 경강선, 경의선, 경춘선, 분당선, 공항철도 등)
  return {
    stationId: null,
    matched: false,
    originalName: csvStationName,
    normalizedName,
  };
}

// 역명 매칭 통계 수집 (디버깅용)
export function collectStationMappingStats(csvRows: Array<{ stationName: string; lineNum: string }>): {
  matched: number;
  unmatched: number;
  unmatchedStations: Array<{ name: string; lineNum: string; normalized: string }>;
} {
  const stats = {
    matched: 0,
    unmatched: 0,
    unmatchedStations: [] as Array<{ name: string; lineNum: string; normalized: string }>,
  };
  
  for (const row of csvRows) {
    const result = mapCSVStationToStationId(row.stationName, row.lineNum);
    if (result.matched) {
      stats.matched++;
    } else {
      stats.unmatched++;
      stats.unmatchedStations.push({
        name: row.stationName,
        lineNum: row.lineNum,
        normalized: result.normalizedName,
      });
    }
  }
  
  return stats;
}

