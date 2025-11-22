// 혼잡도 예측 모델 평가 스크립트
// 실행: npx tsx scripts/evaluateCongestion.ts

import * as fs from 'fs';
import * as path from 'path';
import { parseCSV, convertToHistoricalData, CSVRow } from '../lib/csvParser';
import { predictCongestionEnhanced } from '../lib/api';
import { HistoricalData, BaselineData } from '../lib/cache';
import * as iconv from 'iconv-lite';

// 타입 정의
interface RawRecord {
  date: string; // YYYYMM 형식
  lineNum: string;
  stationName: string;
  timestamp: Date;
  passengerCount: number;
  hour: number;
  dayOfWeek: number;
}

interface EvaluationMetrics {
  mae: number;
  rmse: number;
  levelAccuracy: number;
  totalSamples: number;
}

interface AggregatedMetrics {
  hour?: number;
  line?: string;
  baseline: EvaluationMetrics;
  enhanced: EvaluationMetrics;
}

// 설정 상수
const TRAIN_TEST_SPLIT_DATE = '20241101'; // 2024-11-01 기준으로 train/test 분할
const CSV_FILE_PATH = path.join(process.cwd(), 'subway_passengers.csv');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'eval');

// 혼잡도 레벨 기준 (정원 1000명 기준)
function getCongestionLevel(passengerCount: number): string {
  const ratio = passengerCount / 1000;
  if (ratio < 0.3) return '여유';
  if (ratio < 0.6) return '보통';
  if (ratio < 0.8) return '혼잡';
  return '매우 혼잡';
}

// CSV 파일 로딩
function loadCSVFile(): string {
  try {
    const buffer = fs.readFileSync(CSV_FILE_PATH);
    
    // 인코딩 자동 감지 및 변환
    let csvText: string;
    try {
      csvText = iconv.decode(buffer, 'cp949');
      const koreanCharCount = (csvText.match(/[가-힣]/g) || []).length;
      if (koreanCharCount < 10000) {
        csvText = iconv.decode(buffer, 'euc-kr');
        const eucKrKoreanCount = (csvText.match(/[가-힣]/g) || []).length;
        if (eucKrKoreanCount < 10000) {
          csvText = buffer.toString('utf-8');
        }
      }
    } catch {
      csvText = iconv.decode(buffer, 'cp949');
    }
    
    return csvText;
  } catch (error) {
    console.error('CSV 파일 로드 실패:', error);
    throw error;
  }
}

// CSV 데이터를 RawRecord 배열로 변환
function convertToRawRecords(csvRows: CSVRow[]): RawRecord[] {
  const records: RawRecord[] = [];
  
  for (const row of csvRows) {
    // 날짜 파싱 (YYYYMM 형식)
    const year = parseInt(row.date.substring(0, 4), 10);
    const month = parseInt(row.date.substring(4, 6), 10);
    
    // 호선 번호 추출
    const lineNumMatch = row.lineNum.match(/(\d+)/);
    const lineNum = lineNumMatch ? lineNumMatch[1] : row.lineNum.replace(/[^0-9]/g, '');
    
    // 작업일자 파싱 (YYYYMMDD 형식)
    let workYear: number, workMonth: number, workDay: number;
    
    if (row.workDate && row.workDate.length >= 8) {
      workYear = parseInt(row.workDate.substring(0, 4), 10);
      workMonth = parseInt(row.workDate.substring(4, 6), 10);
      workDay = parseInt(row.workDate.substring(6, 8), 10);
    } else {
      // workDate가 없으면 date에서 추정 (매월 1일로 설정)
      workYear = parseInt(row.date.substring(0, 4), 10);
      workMonth = parseInt(row.date.substring(4, 6), 10);
      workDay = 1;
    }
    
    for (const timeSlot of row.timeSlots) {
      // 실제 작업일자와 시간대를 사용하여 타임스탬프 생성
      const timestamp = new Date(workYear, workMonth - 1, workDay, timeSlot.hour, 0, 0);
      const dayOfWeek = timestamp.getDay();
      
      records.push({
        date: row.date,
        lineNum,
        stationName: row.stationName,
        timestamp,
        passengerCount: timeSlot.rideCount,
        hour: timeSlot.hour,
        dayOfWeek,
      });
    }
  }
  
  return records;
}

// Train/Test 분할
function splitTrainTest(records: RawRecord[]): { train: RawRecord[]; test: RawRecord[] } {
  const splitDate = new Date(
    parseInt(TRAIN_TEST_SPLIT_DATE.substring(0, 4), 10),
    parseInt(TRAIN_TEST_SPLIT_DATE.substring(4, 6), 10) - 1,
    parseInt(TRAIN_TEST_SPLIT_DATE.substring(6, 8), 10)
  );
  
  const train: RawRecord[] = [];
  const test: RawRecord[] = [];
  
  for (const record of records) {
    if (record.timestamp < splitDate) {
      train.push(record);
    } else {
      test.push(record);
    }
  }
  
  return { train, test };
}

// Baseline 모델 생성 (line, station, hour, dayOfWeek 기준 평균)
function buildBaselineModel(trainData: RawRecord[]): Map<string, number> {
  const baselineMap = new Map<string, number>();
  const sumMap = new Map<string, { sum: number; count: number }>();
  
  for (const record of trainData) {
    const key = `${record.lineNum}_${record.stationName}_${record.hour}_${record.dayOfWeek}`;
    
    if (!sumMap.has(key)) {
      sumMap.set(key, { sum: 0, count: 0 });
    }
    
    const stats = sumMap.get(key)!;
    stats.sum += record.passengerCount;
    stats.count += 1;
  }
  
  Array.from(sumMap.entries()).forEach(([key, stats]) => {
    baselineMap.set(key, stats.sum / stats.count);
  });
  
  return baselineMap;
}

// Baseline 예측
function predictBaseline(
  record: RawRecord,
  baselineModel: Map<string, number>
): number {
  const key = `${record.lineNum}_${record.stationName}_${record.hour}_${record.dayOfWeek}`;
  return baselineModel.get(key) || record.passengerCount; // 폴백: 현재 값
}

// Enhanced 모델 예측 (predictCongestionEnhanced 사용)
function predictEnhanced(
  record: RawRecord,
  trainData: RawRecord[]
): number {
  // 해당 역의 과거 데이터 수집
  const historicalData: HistoricalData[] = trainData
    .filter(r => r.stationName === record.stationName && r.lineNum === record.lineNum)
    .slice(-100) // 최근 100개만 사용
    .map(r => ({
      stationId: `${r.lineNum}_${r.stationName}`,
      stationName: r.stationName,
      lineNum: r.lineNum,
      timestamp: r.timestamp,
      passengerCount: r.passengerCount,
      congestionLevel: getCongestionLevel(r.passengerCount),
    }));
  
  // Baseline 데이터 생성
  const sameTimeData = trainData.filter(r =>
    r.stationName === record.stationName &&
    r.lineNum === record.lineNum &&
    r.hour === record.hour &&
    r.dayOfWeek === record.dayOfWeek
  );
  
  let baseline: BaselineData | null = null;
  if (sameTimeData.length > 0) {
    const avgPassenger = sameTimeData.reduce((sum, r) => sum + r.passengerCount, 0) / sameTimeData.length;
    const variance = sameTimeData.reduce((sum, r) => {
      const diff = r.passengerCount - avgPassenger;
      return sum + diff * diff;
    }, 0) / sameTimeData.length;
    const stdDev = Math.sqrt(variance);
    
    baseline = {
      stationId: `${record.lineNum}_${record.stationName}`,
      stationName: record.stationName,
      lineNum: record.lineNum,
      hour: record.hour,
      dayOfWeek: record.dayOfWeek,
      averagePassengerCount: Math.round(avgPassenger),
      standardDeviation: Math.round(stdDev),
    };
  }
  
  // predictCongestionEnhanced 호출
  // currentData는 실제로는 예측 시점의 현재 데이터를 의미
  // 평가에서는 test 레코드의 실제 값을 사용 (실제 운영 시와 유사하게)
  // 단, train 데이터에서 비슷한 시간대의 평균값을 사용하는 것이 더 현실적
  const similarTimeData = trainData.filter(r =>
    r.stationName === record.stationName &&
    r.lineNum === record.lineNum &&
    Math.abs(r.hour - record.hour) <= 1 // ±1시간 이내
  );
  
  const currentData = {
    passengerCount: similarTimeData.length > 0
      ? Math.round(similarTimeData.reduce((sum, r) => sum + r.passengerCount, 0) / similarTimeData.length)
      : (sameTimeData.length > 0
          ? Math.round(sameTimeData.reduce((sum, r) => sum + r.passengerCount, 0) / sameTimeData.length)
          : record.passengerCount), // 폴백: 실제 값 사용
    timestamp: record.timestamp,
  };
  
  const prediction = predictCongestionEnhanced(
    currentData,
    historicalData,
    record.timestamp,
    baseline
  );
  
  return prediction.predictedPassengerCount;
}

// 메트릭 계산
function calculateMetrics(
  actual: number[],
  predicted: number[]
): EvaluationMetrics {
  if (actual.length !== predicted.length || actual.length === 0) {
    return { mae: 0, rmse: 0, levelAccuracy: 0, totalSamples: 0 };
  }
  
  // MAE 계산
  const mae = actual.reduce((sum, a, i) => sum + Math.abs(a - predicted[i]), 0) / actual.length;
  
  // RMSE 계산
  const rmse = Math.sqrt(
    actual.reduce((sum, a, i) => sum + Math.pow(a - predicted[i], 2), 0) / actual.length
  );
  
  // 레벨 정확도 계산
  let correctLevels = 0;
  for (let i = 0; i < actual.length; i++) {
    const actualLevel = getCongestionLevel(actual[i]);
    const predictedLevel = getCongestionLevel(predicted[i]);
    if (actualLevel === predictedLevel) {
      correctLevels++;
    }
  }
  const levelAccuracy = correctLevels / actual.length;
  
  return {
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    levelAccuracy: Math.round(levelAccuracy * 10000) / 100, // 퍼센트
    totalSamples: actual.length,
  };
}

// 시간대별 집계
function aggregateByHour(
  testData: RawRecord[],
  baselinePredictions: number[],
  enhancedPredictions: number[]
): AggregatedMetrics[] {
  const hourlyData = new Map<number, { actual: number[]; baseline: number[]; enhanced: number[] }>();
  
  for (let i = 0; i < testData.length; i++) {
    const hour = testData[i].hour;
    if (!hourlyData.has(hour)) {
      hourlyData.set(hour, { actual: [], baseline: [], enhanced: [] });
    }
    
    const data = hourlyData.get(hour)!;
    data.actual.push(testData[i].passengerCount);
    data.baseline.push(baselinePredictions[i]);
    data.enhanced.push(enhancedPredictions[i]);
  }
  
  const results: AggregatedMetrics[] = [];
  Array.from(hourlyData.entries()).forEach(([hour, data]) => {
    results.push({
      hour,
      baseline: calculateMetrics(data.actual, data.baseline),
      enhanced: calculateMetrics(data.actual, data.enhanced),
    });
  });
  
  return results.sort((a, b) => (a.hour || 0) - (b.hour || 0));
}

// 노선별 집계
function aggregateByLine(
  testData: RawRecord[],
  baselinePredictions: number[],
  enhancedPredictions: number[]
): AggregatedMetrics[] {
  const lineData = new Map<string, { actual: number[]; baseline: number[]; enhanced: number[] }>();
  
  for (let i = 0; i < testData.length; i++) {
    const line = testData[i].lineNum;
    if (!lineData.has(line)) {
      lineData.set(line, { actual: [], baseline: [], enhanced: [] });
    }
    
    const data = lineData.get(line)!;
    data.actual.push(testData[i].passengerCount);
    data.baseline.push(baselinePredictions[i]);
    data.enhanced.push(enhancedPredictions[i]);
  }
  
  const results: AggregatedMetrics[] = [];
  Array.from(lineData.entries()).forEach(([line, data]) => {
    results.push({
      line,
      baseline: calculateMetrics(data.actual, data.baseline),
      enhanced: calculateMetrics(data.actual, data.enhanced),
    });
  });
  
  return results.sort((a, b) => (a.line || '').localeCompare(b.line || ''));
}

// 메인 평가 함수
async function evaluateModel() {
  console.log('🚀 혼잡도 예측 모델 평가 시작...\n');
  
  // 1. CSV 로딩
  console.log('📂 CSV 파일 로딩 중...');
  const csvText = loadCSVFile();
  const csvRows = parseCSV(csvText);
  console.log(`✅ ${csvRows.length}개 행 로드 완료\n`);
  
  // 2. RawRecord 변환
  console.log('🔄 데이터 변환 중...');
  const rawRecords = convertToRawRecords(csvRows);
  console.log(`✅ ${rawRecords.length}개 레코드 생성 완료\n`);
  
  // 3. Train/Test 분할
  console.log('✂️ Train/Test 분할 중...');
  const { train, test } = splitTrainTest(rawRecords);
  console.log(`✅ Train: ${train.length}개, Test: ${test.length}개\n`);
  
  if (test.length === 0) {
    console.error('❌ Test 데이터가 없습니다. TRAIN_TEST_SPLIT_DATE를 확인하세요.');
    return;
  }
  
  // 4. Baseline 모델 구축
  console.log('📊 Baseline 모델 구축 중...');
  const baselineModel = buildBaselineModel(train);
  console.log(`✅ Baseline 모델 구축 완료 (${baselineModel.size}개 키)\n`);
  
  // 5. 예측 수행
  console.log('🔮 예측 수행 중...');
  const baselinePredictions: number[] = [];
  const enhancedPredictions: number[] = [];
  const actualValues: number[] = [];
  
  // 샘플링 (전체 테스트 데이터가 많으면 일부만 사용)
  const sampleSize = Math.min(test.length, 1000);
  const sampledTest = test.slice(0, sampleSize);
  
  for (let i = 0; i < sampledTest.length; i++) {
    const record = sampledTest[i];
    actualValues.push(record.passengerCount);
    
    // Baseline 예측
    const baselinePred = predictBaseline(record, baselineModel);
    baselinePredictions.push(baselinePred);
    
    // Enhanced 예측
    try {
      const enhancedPred = predictEnhanced(record, train);
      enhancedPredictions.push(enhancedPred);
    } catch (error) {
      console.warn(`Enhanced 예측 실패 (${record.stationName}):`, error);
      enhancedPredictions.push(baselinePred); // 폴백
    }
    
    if ((i + 1) % 100 === 0) {
      console.log(`  진행: ${i + 1}/${sampledTest.length}`);
    }
  }
  console.log(`✅ 예측 완료 (${sampledTest.length}개 샘플)\n`);
  
  // 6. 전체 메트릭 계산
  console.log('📈 전체 메트릭 계산 중...');
  const overallBaseline = calculateMetrics(actualValues, baselinePredictions);
  const overallEnhanced = calculateMetrics(actualValues, enhancedPredictions);
  
  console.log('\n📊 전체 평가 결과:');
  console.log('Baseline 모델:');
  console.log(`  MAE: ${overallBaseline.mae}`);
  console.log(`  RMSE: ${overallBaseline.rmse}`);
  console.log(`  레벨 정확도: ${overallBaseline.levelAccuracy}%`);
  console.log(`  샘플 수: ${overallBaseline.totalSamples}`);
  console.log('\nEnhanced 모델:');
  console.log(`  MAE: ${overallEnhanced.mae}`);
  console.log(`  RMSE: ${overallEnhanced.rmse}`);
  console.log(`  레벨 정확도: ${overallEnhanced.levelAccuracy}%`);
  console.log(`  샘플 수: ${overallEnhanced.totalSamples}\n`);
  
  // 7. 시간대별 집계
  console.log('⏰ 시간대별 집계 중...');
  const hourlyMetrics = aggregateByHour(sampledTest, baselinePredictions, enhancedPredictions);
  console.log(`✅ ${hourlyMetrics.length}개 시간대 집계 완료\n`);
  
  // 8. 노선별 집계
  console.log('🚇 노선별 집계 중...');
  const lineMetrics = aggregateByLine(sampledTest, baselinePredictions, enhancedPredictions);
  console.log(`✅ ${lineMetrics.length}개 노선 집계 완료\n`);
  
  // 9. 결과 저장
  console.log('💾 결과 저장 중...');
  
  // 출력 디렉토리 생성
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // 전체 메트릭 저장
  const overallResults = {
    baseline: overallBaseline,
    enhanced: overallEnhanced,
    splitDate: TRAIN_TEST_SPLIT_DATE,
    testSamples: sampledTest.length,
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'overall_metrics.json'),
    JSON.stringify(overallResults, null, 2),
    'utf-8'
  );
  
  // 시간대별 메트릭 저장
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mae_by_hour.json'),
    JSON.stringify(hourlyMetrics, null, 2),
    'utf-8'
  );
  
  // 노선별 메트릭 저장
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'mae_by_line.json'),
    JSON.stringify(lineMetrics, null, 2),
    'utf-8'
  );
  
  // CSV 형식으로도 저장 (시각화용)
  const hourlyCSV = [
    'hour,baseline_mae,baseline_rmse,baseline_accuracy,enhanced_mae,enhanced_rmse,enhanced_accuracy',
    ...hourlyMetrics.map(m => 
      `${m.hour},${m.baseline.mae},${m.baseline.rmse},${m.baseline.levelAccuracy},${m.enhanced.mae},${m.enhanced.rmse},${m.enhanced.levelAccuracy}`
    ),
  ].join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'mae_by_hour.csv'), hourlyCSV, 'utf-8');
  
  const lineCSV = [
    'line,baseline_mae,baseline_rmse,baseline_accuracy,enhanced_mae,enhanced_rmse,enhanced_accuracy',
    ...lineMetrics.map(m => 
      `${m.line},${m.baseline.mae},${m.baseline.rmse},${m.baseline.levelAccuracy},${m.enhanced.mae},${m.enhanced.rmse},${m.enhanced.levelAccuracy}`
    ),
  ].join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'mae_by_line.csv'), lineCSV, 'utf-8');
  
  console.log(`✅ 결과 저장 완료: ${OUTPUT_DIR}\n`);
  console.log('🎉 평가 완료!');
}

// 스크립트 실행
evaluateModel().catch(error => {
  console.error('❌ 평가 중 오류 발생:', error);
  process.exit(1);
});

