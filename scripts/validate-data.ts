// 데이터 검증 스크립트 실행 파일
// 실행: npx tsx scripts/validate-data.ts

import { validateSubwayData, validateStation } from '../lib/validateSubwayData';

// 명령줄 인자 확인
const args = process.argv.slice(2);

if (args.length > 0 && args[0] === '--station') {
  // 특정 역 검증
  const stationName = args[1];
  if (!stationName) {
    console.error('역 이름을 입력해주세요: npx tsx scripts/validate-data.ts --station <역이름>');
    process.exit(1);
  }
  
  console.log(`\n🔍 역 "${stationName}" 검증 중...\n`);
  const issues = validateStation(stationName);
  
  if (issues.length === 0) {
    console.log('✅ 문제가 없습니다!');
  } else {
    issues.forEach((issue, idx) => {
      console.log(`\n[${idx + 1}] ${issue.severity.toUpperCase()}: ${issue.message}`);
      if (issue.details) {
        console.log('   상세:', JSON.stringify(issue.details, null, 2));
      }
    });
  }
} else {
  // 전체 검증
  const result = validateSubwayData();
  
  if (result.totalIssues === 0) {
    console.log('\n✅ 모든 검증을 통과했습니다!');
  } else {
    console.log('\n\n📋 상세 리포트:\n');
    
    // 오류 먼저 출력
    const errors = result.issues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      console.log('❌ 오류:');
      errors.forEach((issue, idx) => {
        console.log(`\n[${idx + 1}] ${issue.message}`);
        if (issue.details) {
          console.log('   상세:', JSON.stringify(issue.details, null, 2));
        }
      });
    }
    
    // 경고 출력
    const warnings = result.issues.filter(i => i.severity === 'warning');
    if (warnings.length > 0) {
      console.log('\n\n⚠️  경고:');
      warnings.slice(0, 20).forEach((issue, idx) => {
        console.log(`\n[${idx + 1}] ${issue.message}`);
        if (issue.details) {
          console.log('   상세:', JSON.stringify(issue.details, null, 2));
        }
      });
      
      if (warnings.length > 20) {
        console.log(`\n... 외 ${warnings.length - 20}개의 경고가 더 있습니다.`);
      }
    }
    
    // 요약
    console.log('\n\n📊 요약:');
    console.log(`  - 총 이슈: ${result.totalIssues}개`);
    console.log(`  - 오류: ${result.errors}개`);
    console.log(`  - 경고: ${result.warnings}개`);
    
    // 가장 문제가 많은 역들 찾기
    const stationIssueCount = new Map<string, number>();
    result.issues.forEach(issue => {
      if (issue.details?.fromStation?.name) {
        const count = stationIssueCount.get(issue.details.fromStation.name) || 0;
        stationIssueCount.set(issue.details.fromStation.name, count + 1);
      }
      if (issue.details?.toStation?.name) {
        const count = stationIssueCount.get(issue.details.toStation.name) || 0;
        stationIssueCount.set(issue.details.toStation.name, count + 1);
      }
      if (issue.details?.stationName) {
        const count = stationIssueCount.get(issue.details.stationName) || 0;
        stationIssueCount.set(issue.details.stationName, count + 1);
      }
    });
    
    if (stationIssueCount.size > 0) {
      console.log('\n\n🔴 문제가 많은 역 Top 10:');
      const topStations = Array.from(stationIssueCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      topStations.forEach(([name, count], idx) => {
        console.log(`  ${idx + 1}. ${name}: ${count}개 이슈`);
      });
    }
  }
}

