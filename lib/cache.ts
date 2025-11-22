// 캐시 시스템: 과거 데이터 및 기준선 데이터 관리

export interface HistoricalData {
  stationId: string;
  stationName: string;
  lineNum: string;
  timestamp: Date;
  passengerCount: number;
  congestionLevel: string;
}

export interface BaselineData {
  stationId: string;
  stationName: string;
  lineNum: string;
  hour: number; // 0-23
  dayOfWeek: number; // 0-6 (일-토)
  averagePassengerCount: number;
  standardDeviation: number;
}

// 메모리 기반 캐시 (실제 프로덕션에서는 Redis 등 사용 권장)
const historicalCache = new Map<string, HistoricalData[]>();
const baselineCache = new Map<string, BaselineData>();

// 캐시 키 생성
// stationId는 실제 역 ID (예: "1026") 또는 호선_역명 형식 (예: "1_노량진")
function getHistoricalCacheKey(stationId: string, lineNum: string): string {
  // stationId가 이미 호선_역명 형식이면 lineNum을 포함한 키로 변환
  // 같은 역이라도 다른 노선의 데이터를 구분하기 위해 항상 lineNum을 포함
  if (stationId.includes('_')) {
    // 이미 호선_역명 형식이면, lineNum을 확인하여 일치하면 그대로 사용, 아니면 lineNum을 포함한 새 키 생성
    const parts = stationId.split('_');
    if (parts.length >= 2 && parts[0] === lineNum) {
      return stationId;
    }
    // lineNum이 다르면 새로운 키 생성 (역명만 추출)
    const stationName = parts.slice(1).join('_');
    return `${lineNum}_${stationName}`;
  }
  // 숫자 형식의 역 ID면 호선_역ID 형식으로 변환
  return `${lineNum}_${stationId}`;
}

function getBaselineCacheKey(stationId: string, lineNum: string, hour: number, dayOfWeek: number): string {
  return `${lineNum}_${stationId}_${hour}_${dayOfWeek}`;
}

// 과거 데이터 캐시 관리
export function setHistoricalData(stationId: string, lineNum: string, data: HistoricalData[]): void {
  const key = getHistoricalCacheKey(stationId, lineNum);
  historicalCache.set(key, data);
}

export function getHistoricalData(stationId: string, lineNum: string): HistoricalData[] {
  const key = getHistoricalCacheKey(stationId, lineNum);
  return historicalCache.get(key) || [];
}

export function clearHistoricalCache(): void {
  historicalCache.clear();
}

// 기준선 데이터 캐시 관리
export function setBaselineData(
  stationId: string,
  lineNum: string,
  hour: number,
  dayOfWeek: number,
  data: BaselineData
): void {
  const key = getBaselineCacheKey(stationId, lineNum, hour, dayOfWeek);
  baselineCache.set(key, data);
}

export function getBaselineData(
  stationId: string,
  lineNum: string,
  hour: number,
  dayOfWeek: number
): BaselineData | null {
  const key = getBaselineCacheKey(stationId, lineNum, hour, dayOfWeek);
  return baselineCache.get(key) || null;
}

export function clearBaselineCache(): void {
  baselineCache.clear();
}

// CSV 파일 경로 (public 폴더 또는 프로젝트 루트)
const CSV_FILE_PATH = '/subway_passengers.csv';

// 캐시 초기화 (서버 시작 시 호출)
export async function initializeCache(): Promise<void> {
  clearHistoricalCache();
  clearBaselineCache();
  
  try {
    // CSV 파일 로드 (브라우저 환경에서는 fetch 사용)
    if (typeof window !== 'undefined') {
      // 클라이언트 사이드
      const response = await fetch(CSV_FILE_PATH);
      if (!response.ok) {
        console.warn('[Cache] CSV 파일을 로드할 수 없습니다. 모의 데이터를 사용합니다.');
        initializeMockData();
        return;
      }
      
      const csvText = await response.text();
      await loadCSVData(csvText);
    } else {
      // 서버 사이드 (Node.js)
      const fs = await import('fs');
      const path = await import('path');
      const csvPath = path.join(process.cwd(), 'subway_passengers.csv');
      
      if (fs.existsSync(csvPath)) {
        // 인코딩 자동 감지 및 변환 (CP949 우선)
        const iconv = await import('iconv-lite');
        const buffer = fs.readFileSync(csvPath);
        
        let csvText: string;
        try {
          // CP949 (Windows 한국어 인코딩)로 먼저 시도
          csvText = iconv.decode(buffer, 'cp949');
          const koreanCharCount = (csvText.match(/[가-힣]/g) || []).length;
          // 한글 문자가 충분히 많으면 (헤더 + 데이터에 한글이 많음)
          if (koreanCharCount < 10000) {
            // EUC-KR로 시도
            csvText = iconv.decode(buffer, 'euc-kr');
            const eucKrKoreanCount = (csvText.match(/[가-힣]/g) || []).length;
            if (eucKrKoreanCount < 10000) {
              // UTF-8로 시도
              csvText = buffer.toString('utf-8');
            }
          }
        } catch {
          // 인코딩 변환 실패 시 CP949로 기본 시도
          csvText = iconv.decode(buffer, 'cp949');
        }
        await loadCSVData(csvText);
      } else {
        console.warn('[Cache] CSV 파일을 찾을 수 없습니다. 모의 데이터를 사용합니다.');
        initializeMockData();
      }
    }
  } catch (error) {
    console.error('[Cache] CSV 데이터 로드 실패:', error);
    initializeMockData();
  }
}

// CSV 데이터를 캐시에 로드 (최적화된 버전)
async function loadCSVData(csvText: string): Promise<void> {
  // 대용량 파일인 경우 스트리밍 파싱 사용
  const isLargeFile = csvText.length > 5 * 1024 * 1024; // 5MB 이상
  
  let csvRows;
  if (isLargeFile) {
    const { parseCSVStreaming, convertToHistoricalDataOptimized } = await import('./csvParserOptimized');
    csvRows = await parseCSVStreaming(csvText, {
      chunkSize: 1000,
      onProgress: (progress) => {
        if (progress.processed % 10000 === 0) {
          console.log(`[Cache] CSV 파싱 진행률: ${Math.round((progress.processed / progress.total) * 100)}%`);
        }
      },
    });
    const { convertToHistoricalDataOptimized: convert } = await import('./csvParserOptimized');
    const historicalData = convert(csvRows, { batchSize: 1000 });
    
    // 캐시 저장 로직
    const dataByStation = new Map<string, HistoricalData[]>();
    for (const data of historicalData) {
      const key = getHistoricalCacheKey(data.stationId, data.lineNum);
      if (!dataByStation.has(key)) {
        dataByStation.set(key, []);
      }
      dataByStation.get(key)!.push(data);
    }
    
    for (const [key, data] of dataByStation.entries()) {
      historicalCache.set(key, data);
    }
    
    console.log(`[Cache] ${dataByStation.size}개 역의 데이터가 캐시에 저장되었습니다.`);
    
    // 기준선 데이터 생성
    generateBaselineData(dataByStation);
    console.log(`[Cache] ${historicalData.length}개의 과거 데이터 로드 완료`);
    return;
  }
  
  // 작은 파일은 기존 방식 사용
  const { parseCSV, convertToHistoricalData } = await import('./csvParser');
  csvRows = parseCSV(csvText);
  const historicalData = convertToHistoricalData(csvRows);
  
  // 역별로 그룹화하여 캐시에 저장
  const dataByStation = new Map<string, HistoricalData[]>();
  
  for (const data of historicalData) {
    // 캐시 키 생성 (호선_역ID 또는 호선_역명 형식)
    const key = getHistoricalCacheKey(data.stationId, data.lineNum);
    if (!dataByStation.has(key)) {
      dataByStation.set(key, []);
    }
    dataByStation.get(key)!.push(data);
  }
  
  // 캐시에 저장
  for (const [key, data] of dataByStation.entries()) {
    historicalCache.set(key, data);
  }
  
  console.log(`[Cache] ${dataByStation.size}개 역의 데이터가 캐시에 저장되었습니다.`);
  
  // 기준선 데이터 생성
  generateBaselineData(dataByStation);
  
  console.log(`[Cache] ${historicalData.length}개의 과거 데이터 로드 완료`);
}

// 기준선 데이터 생성 (분리하여 재사용)
function generateBaselineData(dataByStation: Map<string, HistoricalData[]>): void {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  
  for (const [key, data] of dataByStation.entries()) {
    if (data.length === 0) continue;
    
    const firstData = data[0];
    const stationId = firstData.stationId;
    const lineNum = firstData.lineNum;
    
    // 같은 시간대의 데이터로 평균 계산
    const sameHourData = data.filter(d => {
      const dDate = new Date(d.timestamp);
      return dDate.getHours() === currentHour;
    });
    
    if (sameHourData.length > 0) {
      const avgPassenger = sameHourData.reduce((sum, d) => sum + d.passengerCount, 0) / sameHourData.length;
      const variance = sameHourData.reduce((sum, d) => {
        const diff = d.passengerCount - avgPassenger;
        return sum + diff * diff;
      }, 0) / sameHourData.length;
      const stdDev = Math.sqrt(variance);
      
      const baseline: BaselineData = {
        stationId,
        stationName: firstData.stationName,
        lineNum,
        hour: currentHour,
        dayOfWeek: currentDay,
        averagePassengerCount: Math.round(avgPassenger),
        standardDeviation: Math.round(stdDev),
      };
      
      setBaselineData(stationId, lineNum, currentHour, currentDay, baseline);
    }
  }
}

// 모의 데이터 초기화 (CSV 로드 실패 시)
function initializeMockData(): void {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  
  const majorStations = [
    { id: '1026', name: '노량진', lineNum: '1' },
    { id: '2021', name: '강남', lineNum: '2' },
    { id: '1023', name: '서울역', lineNum: '1' },
  ];
  
  majorStations.forEach((station) => {
    const baseline: BaselineData = {
      stationId: station.id,
      stationName: station.name,
      lineNum: station.lineNum,
      hour: currentHour,
      dayOfWeek: currentDay,
      averagePassengerCount: 500,
      standardDeviation: 100,
    };
    setBaselineData(station.id, station.lineNum, currentHour, currentDay, baseline);
  });
}

// 캐시 갱신 (주기적으로 호출)
export function updateCache(): void {
  // 실제 구현에서는 최신 데이터를 가져와서 캐시 업데이트
  // 현재는 기본 구조만 제공
  console.log('[Cache] Cache update triggered');
}

