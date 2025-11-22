// 최적화된 CSV 파싱 유틸리티 (대용량 파일 처리)

export interface CSVRow {
  date: string;
  lineNum: string;
  stationName: string;
  timeSlots: Array<{
    hour: number;
    rideCount: number;
    alightCount: number;
  }>;
  workDate: string;
}

interface ParseOptions {
  chunkSize?: number; // 청크 크기 (기본: 1000줄)
  onProgress?: (progress: { processed: number; total: number }) => void;
}

// 스트리밍 방식으로 CSV 파싱 (메모리 효율적)
export async function parseCSVStreaming(
  csvText: string,
  options: ParseOptions = {}
): Promise<CSVRow[]> {
  const { chunkSize = 1000, onProgress } = options;
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) return [];

  // 헤더 파싱 (한 번만)
  const header = lines[0];
  const headerFields = parseCSVLine(header);
  const timeSlotIndices = extractTimeSlotIndices(headerFields);

  const rows: CSVRow[] = [];
  const totalLines = lines.length - 1; // 헤더 제외

  // 청크 단위로 처리
  for (let i = 1; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const chunkRows = parseChunk(chunk, timeSlotIndices);
    rows.push(...chunkRows);

    // 진행률 콜백
    if (onProgress) {
      onProgress({
        processed: Math.min(i + chunkSize - 1, totalLines),
        total: totalLines,
      });
    }

    // 메인 스레드 블로킹 방지 (큰 파일 처리 시)
    if (i % (chunkSize * 10) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return rows;
}

// 청크 파싱 (재사용 가능)
function parseChunk(
  lines: string[],
  timeSlotIndices: Array<{ hour: number; rideIndex: number; alightIndex: number }>
): CSVRow[] {
  const rows: CSVRow[] = [];

  for (const line of lines) {
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

// 시간대 인덱스 추출 (캐싱 가능)
function extractTimeSlotIndices(headerFields: string[]): Array<{ hour: number; rideIndex: number; alightIndex: number }> {
  const timeSlotIndices: Array<{ hour: number; rideIndex: number; alightIndex: number }> = [];
  
  for (let i = 3; i < headerFields.length - 1; i += 2) {
    const rideField = headerFields[i] || '';
    
    const hourPatterns = [
      /(\d{2})시-(\d{2})시/,
      /(\d{2})-(\d{2})/,
      /(\d{2})[^\d](\d{2})/,
    ];
    
    let hour = -1;
    for (const pattern of hourPatterns) {
      const match = rideField.match(pattern);
      if (match) {
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

  return timeSlotIndices;
}

// 기존 parseCSV 함수 (하위 호환성 유지)
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const header = lines[0];
  const headerFields = parseCSVLine(header);
  const timeSlotIndices = extractTimeSlotIndices(headerFields);

  return parseChunk(lines.slice(1), timeSlotIndices);
}

// CSV 라인 파싱 (최적화: 정규식 사용)
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // 성능 최적화: 정규식 대신 문자 단위 파싱 (더 빠름)
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  fields.push(currentField);
  return fields;
}

// HistoricalData 변환 (최적화: 배치 처리)
import { HistoricalData } from './cache';
import { mapCSVStationToStationId } from './stationNameMapper';

// 역명 매핑 캐시 (중복 매핑 방지)
const stationMappingCache = new Map<string, { stationId: string; matched: boolean }>();

export function convertToHistoricalDataOptimized(
  csvRows: CSVRow[],
  options: { batchSize?: number } = {}
): HistoricalData[] {
  const { batchSize = 1000 } = options;
  const historicalData: HistoricalData[] = [];
  const unmatchedStations = new Set<string>();

  // 배치 단위로 처리
  for (let i = 0; i < csvRows.length; i += batchSize) {
    const batch = csvRows.slice(i, i + batchSize);
    
    for (const row of batch) {
      const year = parseInt(row.date.substring(0, 4), 10);
      const month = parseInt(row.date.substring(4, 6), 10);
      const lineNumMatch = row.lineNum.match(/(\d+)/);
      const lineNum = lineNumMatch ? lineNumMatch[1] : row.lineNum.replace(/[^0-9]/g, '');

      // 캐시된 매핑 확인
      const cacheKey = `${row.lineNum}_${row.stationName}`;
      let mappingResult = stationMappingCache.get(cacheKey);
      
      if (!mappingResult) {
        const result = mapCSVStationToStationId(row.stationName, row.lineNum);
        mappingResult = {
          stationId: result.matched && result.stationId ? result.stationId : `${lineNum}_${result.normalizedName}`,
          matched: result.matched || false,
        };
        stationMappingCache.set(cacheKey, mappingResult);
      }

      const stationId = mappingResult.stationId;
      if (!mappingResult.matched) {
        unmatchedStations.add(cacheKey);
      }

      // 시간대별 데이터 생성
      for (const timeSlot of row.timeSlots) {
        const timestamp = new Date(year, month - 1, 1, timeSlot.hour, 0, 0);
        const passengerCount = timeSlot.rideCount;
        const capacity = 1000;
        const ratio = passengerCount / capacity;
        
        let congestionLevel: string;
        if (ratio < 0.3) {
          congestionLevel = '여유';
        } else if (ratio < 0.6) {
          congestionLevel = '보통';
        } else if (ratio < 0.8) {
          congestionLevel = '혼잡';
        } else {
          congestionLevel = '매우 혼잡';
        }

        historicalData.push({
          stationId,
          stationName: row.stationName,
          lineNum,
          timestamp,
          passengerCount,
          congestionLevel,
        });
      }
    }
  }

  // 경고 메시지 (한 번만)
  if (unmatchedStations.size > 0 && unmatchedStations.size <= 20) {
    const unmatchedList = Array.from(unmatchedStations).slice(0, 20);
    console.warn(`[CSV Parser] ⚠️ 역명 매칭 실패한 역 ${unmatchedStations.size}개:`, unmatchedList);
  }

  return historicalData;
}

// 기존 함수 (하위 호환성)
export function convertToHistoricalData(csvRows: CSVRow[]): HistoricalData[] {
  return convertToHistoricalDataOptimized(csvRows);
}

