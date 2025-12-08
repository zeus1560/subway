// 경로 탐색 디버그 스크립트
// 사용법: npx tsx lib/dev/routeDebug.ts

import { findKShortestPaths, type RouteNode } from '../routeAlgorithm';
import { getStationById } from '../subwayMapData';
import { findStationIdByName } from '../api';
import { logger } from '../logger';

// 경로를 예쁘게 출력하는 함수
function printRoute(route: RouteNode, index: number, startName: string, endName: string): void {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`경로 ${index + 1} (${startName} → ${endName})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`환승 횟수: ${route.transferCount}회`);
  console.log(`총 소요 시간: ${route.totalTime}분`);
  console.log(`혼잡도 합계: ${route.totalCongestion}`);
  console.log(`경로 길이: ${route.path.length}개 역`);
  
  // 구간별 상세 정보
  console.log(`\n[경로 상세]`);
  if (route.edgeLines && route.edgeLines.length > 0) {
    let currentLine = route.edgeLines[0];
    let segmentStart = 0;
    let segmentIndex = 1;
    
    for (let i = 1; i < route.edgeLines.length; i++) {
      if (route.edgeLines[i] !== currentLine) {
        // 구간 출력
        const startStation = getStationById(route.path[segmentStart]);
        const endStation = getStationById(route.path[i]);
        const lineName = currentLine === '1' ? '1호선' :
                        currentLine === '2' ? '2호선' :
                        currentLine === '3' ? '3호선' :
                        currentLine === '4' ? '4호선' :
                        currentLine === '5' ? '5호선' :
                        currentLine === '6' ? '6호선' :
                        currentLine === '7' ? '7호선' :
                        currentLine === '8' ? '8호선' :
                        currentLine === '9' ? '9호선' : `${currentLine}호선`;
        
        console.log(`  ${segmentIndex}. ${lineName} ${startStation?.name || route.path[segmentStart]} → ${endStation?.name || route.path[i]}`);
        
        segmentStart = i;
        currentLine = route.edgeLines[i];
        segmentIndex++;
      }
    }
    
    // 마지막 구간
    const startStation = getStationById(route.path[segmentStart]);
    const endStation = getStationById(route.path[route.path.length - 1]);
    const lineName = currentLine === '1' ? '1호선' :
                    currentLine === '2' ? '2호선' :
                    currentLine === '3' ? '3호선' :
                    currentLine === '4' ? '4호선' :
                    currentLine === '5' ? '5호선' :
                    currentLine === '6' ? '6호선' :
                    currentLine === '7' ? '7호선' :
                    currentLine === '8' ? '8호선' :
                    currentLine === '9' ? '9호선' : `${currentLine}호선`;
    
    console.log(`  ${segmentIndex}. ${lineName} ${startStation?.name || route.path[segmentStart]} → ${endStation?.name || route.path[route.path.length - 1]}`);
  } else {
    // edgeLines가 없으면 path만 출력
    route.path.forEach((id, idx) => {
      const station = getStationById(id);
      console.log(`  ${idx + 1}. ${station?.name || id}${station?.lines ? ` (${station.lines.join(',')}호선)` : ''}`);
    });
  }
  
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// 단일 테스트 케이스 실행
async function runDebug(startStationName: string, endStationName: string): Promise<void> {
  console.log(`\n\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  경로 탐색 테스트: ${startStationName} → ${endStationName}`);
  console.log(`╚════════════════════════════════════════════════════════════╝`);
  
  // 역 이름을 역 ID로 변환
  const startId = findStationIdByName(startStationName);
  const endId = findStationIdByName(endStationName);
  
  if (!startId) {
    console.error(`❌ 출발역을 찾을 수 없습니다: ${startStationName}`);
    return;
  }
  
  if (!endId) {
    console.error(`❌ 도착역을 찾을 수 없습니다: ${endStationName}`);
    return;
  }
  
  const startStation = getStationById(startId);
  const endStation = getStationById(endId);
  
  console.log(`출발역: ${startStation?.name || startStationName} (ID: ${startId})`);
  console.log(`도착역: ${endStation?.name || endStationName} (ID: ${endId})`);
  console.log(`\n경로 탐색 중...\n`);
  
  try {
    const currentTime = new Date();
    
    // 최적 경로 탐색 (기본 옵션)
    const routes = await findKShortestPaths(
      startId,
      endId,
      currentTime,
      3, // 최대 3개 경로
      {
        maxTransfers: 5,
        maxRoutes: 3,
      }
    );
    
    if (routes.length === 0) {
      console.log(`❌ 경로를 찾을 수 없습니다.`);
      return;
    }
    
    console.log(`\n✅ 총 ${routes.length}개의 경로를 찾았습니다.\n`);
    
    // 각 경로 출력
    routes.forEach((route, index) => {
      printRoute(route, index, startStation?.name || startStationName, endStation?.name || endStationName);
    });
    
    // 요약
    console.log(`\n[요약]`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    routes.forEach((route, index) => {
      console.log(`경로 ${index + 1}: 환승 ${route.transferCount}회, 시간 ${route.totalTime}분, 혼잡도 ${route.totalCongestion}`);
    });
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
  } catch (error) {
    console.error(`❌ 오류 발생:`, error);
    logger.error('경로 탐색 중 오류', error as Error, { startStationName, endStationName });
  }
}

// 메인 함수
async function main() {
  console.log(`\n\n`);
  console.log(`╔════════════════════════════════════════════════════════════╗`);
  console.log(`║     서울 지하철 경로 탐색 알고리즘 디버그 스크립트        ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝`);
  
  // 테스트 케이스 실행
  await runDebug('방화', '서울역');
  await runDebug('방화', '강남');
  await runDebug('방화', '신논현');
  
  console.log(`\n\n✅ 모든 테스트 완료!\n\n`);
}

// 스크립트 실행
main().catch((error) => {
  console.error('스크립트 실행 중 오류:', error);
  process.exit(1);
});

