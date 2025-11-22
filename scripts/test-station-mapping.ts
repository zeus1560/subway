// 역명 매칭 테스트 스크립트
// 실행 방법:
//   1. npm install -D tsx (필요시)
//   2. npx tsx scripts/test-station-mapping.ts
//   또는
//   node --loader tsx scripts/test-station-mapping.ts

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV, convertToHistoricalData } from '../lib/csvParser';
import { collectStationMappingStats } from '../lib/stationNameMapper';

async function testStationMapping() {
  console.log('🚇 역명 매칭 테스트 시작...\n');

  try {
    // CSV 파일 읽기
    const csvPath = join(process.cwd(), 'subway_passengers.csv');
    console.log(`📂 CSV 파일 읽기: ${csvPath}`);
    const csvText = readFileSync(csvPath, 'utf-8');
    console.log(`✅ CSV 파일 로드 완료 (${(csvText.length / 1024).toFixed(2)} KB)\n`);

    // CSV 파싱
    console.log('📊 CSV 파싱 중...');
    const csvRows = parseCSV(csvText);
    console.log(`✅ ${csvRows.length}개 행 파싱 완료\n`);

    // 역명 매칭 통계 수집
    console.log('🔍 역명 매칭 통계 수집 중...');
    const stats = collectStationMappingStats(csvRows);
    
    console.log('\n📈 역명 매칭 결과:');
    console.log(`   ✅ 매칭 성공: ${stats.matched}개`);
    console.log(`   ❌ 매칭 실패: ${stats.unmatched}개`);
    console.log(`   📊 성공률: ${((stats.matched / (stats.matched + stats.unmatched)) * 100).toFixed(2)}%\n`);

    // 매칭 실패한 역 목록 출력
    if (stats.unmatchedStations.length > 0) {
      console.log('⚠️  매칭 실패한 역 목록 (최대 30개):');
      const uniqueUnmatched = Array.from(
        new Map(stats.unmatchedStations.map(s => [`${s.lineNum}_${s.name}`, s])).values()
      ).slice(0, 30);
      
      uniqueUnmatched.forEach((station, index) => {
        console.log(`   ${index + 1}. ${station.lineNum}호선 - "${station.name}" (정규화: "${station.normalized}")`);
      });
      
      if (stats.unmatchedStations.length > 30) {
        console.log(`   ... 외 ${stats.unmatchedStations.length - 30}개 더 있음`);
      }
      console.log('');
    }

    // HistoricalData 변환 테스트
    console.log('🔄 HistoricalData 변환 테스트 중...');
    const historicalData = convertToHistoricalData(csvRows.slice(0, 100)); // 처음 100개만 테스트
    console.log(`✅ ${historicalData.length}개 HistoricalData 생성 완료\n`);

    // 샘플 데이터 출력
    if (historicalData.length > 0) {
      console.log('📋 샘플 데이터 (처음 5개):');
      historicalData.slice(0, 5).forEach((data, index) => {
        console.log(`   ${index + 1}. 역ID: ${data.stationId}, 역명: ${data.stationName}, 호선: ${data.lineNum}, 승객수: ${data.passengerCount}, 혼잡도: ${data.congestionLevel}`);
      });
      console.log('');
    }

    console.log('✅ 테스트 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    if (error instanceof Error) {
      console.error('   메시지:', error.message);
      console.error('   스택:', error.stack);
    }
    process.exit(1);
  }
}

// 스크립트 실행
testStationMapping();

