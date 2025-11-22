// CSV 파일 파싱 유틸리티

export interface CSVRow {
  date: string; // YYYYMM 형식
  lineNum: string; // 호선 번호
  stationName: string; // 역명
  timeSlots: Array<{
    hour: number; // 시간 (0-23)
    rideCount: number; // 승차 인원
    alightCount: number; // 하차 인원
  }>;
  workDate: string; // 작업일자
}

// CSV 텍스트를 파싱하여 데이터 배열로 변환
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // 헤더 파싱 (첫 번째 줄)
  const header = lines[0];
  const headerFields = parseCSVLine(header);
  
  // 시간대 컬럼 인덱스 찾기
  const timeSlotIndices: Array<{ hour: number; rideIndex: number; alightIndex: number }> = [];
  
  // 헤더에서 시간대 패턴 찾기 (예: "04시-05시 승차인원", "04시-05시 하차인원")
  // 인코딩 문제로 한글이 깨질 수 있으므로 숫자 패턴으로 찾기
  for (let i = 3; i < headerFields.length - 1; i += 2) {
    const rideField = headerFields[i] || '';
    
    // 시간 추출 (다양한 패턴 시도)
    // "04시-05시", "04-05" 등 인코딩 문제 대응
    const hourPatterns = [
      /(\d{2})시-(\d{2})시/,  // 정상: "04시-05시"
      /(\d{2})-(\d{2})/,  // 깨짐: "04-05"
      /(\d{2})[^\d](\d{2})/,   // 일반: 숫자2자리-숫자2자리
    ];
    
    let hour = -1;
    for (const pattern of hourPatterns) {
      const match = rideField.match(pattern);
      if (match) {
        // 시작 시간 사용 (04시-05시면 4시)
        hour = parseInt(match[1], 10);
        break;
      }
    }
    
    if (hour >= 0 && hour <= 23) {
      timeSlotIndices.push({
        hour,
        rideIndex: i,
        alightIndex: i + 1,
      });
    }
  }

  // 데이터 줄 파싱
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 4) continue;

    const date = fields[0]?.replace(/"/g, '') || '';
    const lineNum = fields[1]?.replace(/"/g, '') || '';
    const stationName = fields[2]?.replace(/"/g, '') || '';
    const workDate = fields[fields.length - 1]?.replace(/"/g, '') || '';

    const timeSlots = timeSlotIndices.map(({ hour, rideIndex, alightIndex }) => {
      const rideCount = parseInt(fields[rideIndex]?.replace(/"/g, '') || '0', 10) || 0;
      const alightCount = parseInt(fields[alightIndex]?.replace(/"/g, '') || '0', 10) || 0;
      return { hour, rideCount, alightCount };
    });

    rows.push({
      date,
      lineNum,
      stationName,
      timeSlots,
      workDate,
    });
  }

  return rows;
}

// CSV 라인 파싱 (쉼표와 따옴표 처리)
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 이스케이프된 따옴표
        currentField += '"';
        i++; // 다음 문자 건너뛰기
      } else {
        // 따옴표 시작/끝
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 필드 구분자
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // 마지막 필드 추가
  fields.push(currentField);

  return fields;
}

// CSV 데이터를 HistoricalData 형식으로 변환
import { HistoricalData } from './cache';
import { mapCSVStationToStationId } from './stationNameMapper';

export function convertToHistoricalData(csvRows: CSVRow[]): HistoricalData[] {
  const historicalData: HistoricalData[] = [];
  const unmatchedStations = new Set<string>(); // 매칭 실패한 역 추적

  for (const row of csvRows) {
    // 날짜 파싱 (YYYYMM 형식)
    const year = parseInt(row.date.substring(0, 4), 10);
    const month = parseInt(row.date.substring(4, 6), 10);

    // 호선 번호 추출
    const lineNumMatch = row.lineNum.match(/(\d+)/);
    const lineNum = lineNumMatch ? lineNumMatch[1] : row.lineNum.replace(/[^0-9]/g, '');

    // 역 ID 찾기 (실제 역 데이터와 매칭)
    const mappingResult = mapCSVStationToStationId(row.stationName, row.lineNum);
    
    // 매칭 실패 시 폴백 ID 생성
    let stationId: string;
    if (!mappingResult.matched || !mappingResult.stationId) {
      unmatchedStations.add(`${row.lineNum}_${row.stationName}`);
      // 매칭 실패 시에도 폴백 ID 생성하여 데이터는 저장 (나중에 수동 매핑 가능)
      const fallbackStationId = `${lineNum}_${mappingResult.normalizedName}`;
      stationId = fallbackStationId;
      
      // 경고 메시지 (첫 10개만 출력)
      if (unmatchedStations.size <= 10) {
        console.warn(`[CSV Parser] 역명 매칭 실패: "${row.stationName}" (${row.lineNum}) -> 정규화: "${mappingResult.normalizedName}"`);
      }
    } else {
      // 매칭 성공: 실제 역 ID 사용
      stationId = mappingResult.stationId;
    }

    for (const timeSlot of row.timeSlots) {
      // 날짜 객체 생성 (매월 1일로 설정, 실제로는 더 정확한 날짜 필요)
      const timestamp = new Date(year, month - 1, 1, timeSlot.hour, 0, 0);

      // 혼잡도 레벨 계산 (표준 기준: 정원 1000명 대비 비율)
      // lib/api.ts의 calculateCongestionLevel과 동일한 기준 사용
      const passengerCount = timeSlot.rideCount;
      const capacity = 1000; // 지하철 차량 정원 (기본값)
      const ratio = passengerCount / capacity;
      
      let congestionLevel: string;
      if (ratio < 0.3) {
        congestionLevel = '여유'; // 300명 미만
      } else if (ratio < 0.6) {
        congestionLevel = '보통'; // 300-600명
      } else if (ratio < 0.8) {
        congestionLevel = '혼잡'; // 600-800명
      } else {
        congestionLevel = '매우 혼잡'; // 800명 이상
      }

      historicalData.push({
        stationId, // 실제 역 ID (예: "1026") 또는 폴백 ID (예: "1_노량진")
        stationName: row.stationName,
        lineNum: lineNum, // 숫자만 추출된 호선 번호
        timestamp,
        passengerCount,
        congestionLevel,
      });
    }
  }

  // 매칭 실패한 역 목록 출력 (디버깅용)
  if (unmatchedStations.size > 0) {
    const unmatchedList = Array.from(unmatchedStations).slice(0, 20);
    console.warn(`[CSV Parser] ⚠️ 역명 매칭 실패한 역 ${unmatchedStations.size}개 (처음 20개만 표시):`, unmatchedList);
    console.warn(`[CSV Parser] 💡 해결 방법: CSV의 역명과 subwayMapData.ts의 역명이 정확히 일치하는지 확인하세요.`);
  }

  return historicalData;
}

