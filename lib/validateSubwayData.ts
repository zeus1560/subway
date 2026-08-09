// 지하철 데이터 검증 스크립트
// 문제점을 찾아서 리포트를 생성합니다.

import { STATIONS, LINES, getStationById, type Station, type LineId, ALL_LINE_IDS } from './subwayMapData';
import { getSubwayGraph } from './graph/buildSubwayGraph';

interface ValidationIssue {
  type: 'duplicate_station' | 'line_format_mismatch' | 'missing_transfer' | 'disconnected_station' | 'common_lines_failure';
  severity: 'error' | 'warning';
  message: string;
  details?: any;
}

const issues: ValidationIssue[] = [];

// 1. 같은 이름의 역이 여러 stationId로 분리되어 있는지 확인
function checkDuplicateStations() {
  console.log('🔍 검증 1: 같은 이름의 역이 여러 stationId로 분리되어 있는지 확인...');
  
  const nameToIds = new Map<string, string[]>();
  
  STATIONS.forEach(station => {
    if (!nameToIds.has(station.name)) {
      nameToIds.set(station.name, []);
    }
    nameToIds.get(station.name)!.push(station.id);
  });
  
  let duplicateCount = 0;
  nameToIds.forEach((ids, name) => {
    if (ids.length > 1) {
      duplicateCount++;
      // 각 역의 lines를 확인
      const stations = ids.map(id => getStationById(id)).filter(Boolean) as Station[];
      const allLines = new Set<LineId>();
      stations.forEach(s => s.lines.forEach(l => allLines.add(l)));
      
      // 만약 모든 역이 같은 lines를 가지고 있다면, 이는 문제가 될 수 있음
      const hasDifferentLines = stations.some(s => {
        return !stations.every(other => {
          return s.lines.length === other.lines.length &&
                 s.lines.every(l => other.lines.includes(l));
        });
      });
      
      if (hasDifferentLines) {
        issues.push({
          type: 'duplicate_station',
          severity: 'warning',
          message: `역 "${name}"이(가) ${ids.length}개의 다른 stationId로 분리되어 있습니다.`,
          details: {
            stationIds: ids,
            stations: stations.map(s => ({
              id: s.id,
              lines: s.lines,
              isTransfer: s.isTransfer
            }))
          }
        });
      }
    }
  });
  
  console.log(`  ✓ ${duplicateCount}개의 역이 중복 이름을 가지고 있습니다.`);
  return duplicateCount;
}

// 2. lines 배열 형식이 일치하는지 확인
function checkLineFormat() {
  console.log('🔍 검증 2: lines 배열 형식이 일치하는지 확인...');
  
  const validLineIds: Set<LineId> = new Set(ALL_LINE_IDS);
  let formatErrorCount = 0;
  
  STATIONS.forEach(station => {
    station.lines.forEach(line => {
      if (!validLineIds.has(line as LineId)) {
        formatErrorCount++;
        issues.push({
          type: 'line_format_mismatch',
          severity: 'error',
          message: `역 "${station.name}" (${station.id})의 lines에 잘못된 형식이 있습니다: "${line}"`,
          details: {
            stationId: station.id,
            stationName: station.name,
            invalidLine: line,
            allLines: station.lines
          }
        });
      }
    });
  });
  
  console.log(`  ✓ ${formatErrorCount}개의 형식 오류를 발견했습니다.`);
  return formatErrorCount;
}

// 3. 환승역 연결 확인
function checkTransferConnections() {
  console.log('🔍 검증 3: 환승역 연결 확인...');
  
  const graph = getSubwayGraph();
  const nameToIds = new Map<string, string[]>();
  
  STATIONS.forEach(station => {
    if (!nameToIds.has(station.name)) {
      nameToIds.set(station.name, []);
    }
    nameToIds.get(station.name)!.push(station.id);
  });
  
  let missingTransferCount = 0;
  
  nameToIds.forEach((ids, name) => {
    if (ids.length > 1) {
      // 같은 이름의 역들끼리 환승 엣지가 있는지 확인
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const id1 = ids[i];
          const id2 = ids[j];
          const node1 = graph.nodes.get(id1);
          const node2 = graph.nodes.get(id2);
          
          if (!node1 || !node2) continue;
          
          // node1에서 node2로 가는 환승 엣지가 있는지 확인
          const hasTransferEdge = node1.neighbors.some(edge => 
            edge.to === id2 && edge.isTransfer
          );
          
          if (!hasTransferEdge) {
            missingTransferCount++;
            issues.push({
              type: 'missing_transfer',
              severity: 'error',
              message: `환승역 "${name}"에서 ${id1} → ${id2}로의 환승 엣지가 없습니다.`,
              details: {
                stationName: name,
                fromId: id1,
                toId: id2,
                fromLines: node1.lines,
                toLines: node2.lines
              }
            });
          }
        }
      }
    }
  });
  
  console.log(`  ✓ ${missingTransferCount}개의 누락된 환승 연결을 발견했습니다.`);
  return missingTransferCount;
}

// 4. commonLines 실패 케이스 찾기
function checkCommonLinesFailures() {
  console.log('🔍 검증 4: commonLines 실패 케이스 찾기...');
  
  const graph = getSubwayGraph();
  let failureCount = 0;
  
  graph.nodes.forEach((node, stationId) => {
    const station = getStationById(stationId);
    if (!station) return;
    
    node.neighbors.forEach(neighborEdge => {
      const neighborId = neighborEdge.to;
      const neighborStation = getStationById(neighborId);
      
      if (!neighborStation) return;
      
      // commonLines 찾기
      const commonLines = station.lines.filter(line => 
        neighborStation.lines.includes(line)
      );
      
      // 만약 commonLines가 없고, isTransfer도 false라면 문제
      if (commonLines.length === 0 && !neighborEdge.isTransfer) {
        failureCount++;
        issues.push({
          type: 'common_lines_failure',
          severity: 'error',
          message: `역 "${station.name}" (${stationId}) → "${neighborStation.name}" (${neighborId})로의 연결에서 commonLines가 없지만 isTransfer=false입니다.`,
          details: {
            fromStation: {
              id: stationId,
              name: station.name,
              lines: station.lines
            },
            toStation: {
              id: neighborId,
              name: neighborStation.name,
              lines: neighborStation.lines
            },
            edge: {
              isTransfer: neighborEdge.isTransfer,
              line: neighborEdge.line
            }
          }
        });
      }
      
      // 만약 commonLines가 있는데 isTransfer=true라면 경고
      if (commonLines.length > 0 && neighborEdge.isTransfer) {
        issues.push({
          type: 'common_lines_failure',
          severity: 'warning',
          message: `역 "${station.name}" (${stationId}) → "${neighborStation.name}" (${neighborId})로의 연결에서 commonLines가 있지만 isTransfer=true입니다.`,
          details: {
            fromStation: {
              id: stationId,
              name: station.name,
              lines: station.lines
            },
            toStation: {
              id: neighborId,
              name: neighborStation.name,
              lines: neighborStation.lines
            },
            commonLines,
            edge: {
              isTransfer: neighborEdge.isTransfer,
              line: neighborEdge.line
            }
          }
        });
      }
    });
  });
  
  console.log(`  ✓ ${failureCount}개의 commonLines 실패 케이스를 발견했습니다.`);
  return failureCount;
}

// 5. 실제 경로 탐색에서 환승이 과도하게 발생하는 케이스 찾기
function checkExcessiveTransfers() {
  console.log('🔍 검증 5: 과도한 환승이 발생할 수 있는 경로 찾기...');
  
  const graph = getSubwayGraph();
  const nameToIds = new Map<string, string[]>();
  
  STATIONS.forEach(station => {
    if (!nameToIds.has(station.name)) {
      nameToIds.set(station.name, []);
    }
    nameToIds.get(station.name)!.push(station.id);
  });
  
  // 같은 이름의 역이 여러 개인 경우, 그 사이를 지나가면 무조건 환승이 발생하는지 확인
  let excessiveTransferCount = 0;
  
  nameToIds.forEach((ids, name) => {
    if (ids.length > 1) {
      // 각 역의 이웃들을 확인
      ids.forEach(id1 => {
        const node1 = graph.nodes.get(id1);
        if (!node1) return;
        
        // 같은 이름의 다른 역으로 가는 경로가 있는지 확인
        ids.forEach(id2 => {
          if (id1 === id2) return;
          
          const node2 = graph.nodes.get(id2);
          if (!node2) return;
          
          // node1의 이웃 중에 node2로 직접 가는 환승 엣지가 있는지 확인
          const hasDirectTransfer = node1.neighbors.some(edge => 
            edge.to === id2 && edge.isTransfer
          );
          
          if (!hasDirectTransfer) {
            // 간접 경로를 확인 (한 번 거쳐서 가는 경우)
            const hasIndirectPath = node1.neighbors.some(edge1 => {
              const intermediateNode = graph.nodes.get(edge1.to);
              if (!intermediateNode) return false;
              
              return intermediateNode.neighbors.some(edge2 => 
                edge2.to === id2 && edge2.isTransfer
              );
            });
            
            if (!hasIndirectPath) {
              excessiveTransferCount++;
              issues.push({
                type: 'disconnected_station',
                severity: 'warning',
                message: `같은 이름의 역 "${name}"에서 ${id1} → ${id2}로의 직접 또는 간접 연결이 없습니다.`,
                details: {
                  stationName: name,
                  fromId: id1,
                  toId: id2,
                  fromLines: node1.lines,
                  toLines: node2.lines
                }
              });
            }
          }
        });
      });
    }
  });
  
  console.log(`  ✓ ${excessiveTransferCount}개의 과도한 환승 가능 케이스를 발견했습니다.`);
  return excessiveTransferCount;
}

// 메인 검증 함수
export function validateSubwayData(): {
  totalIssues: number;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
} {
  console.log('🚇 지하철 데이터 검증 시작...\n');
  
  issues.length = 0; // 초기화
  
  checkDuplicateStations();
  checkLineFormat();
  checkTransferConnections();
  checkCommonLinesFailures();
  checkExcessiveTransfers();
  
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  
  console.log('\n📊 검증 결과:');
  console.log(`  총 이슈: ${issues.length}개`);
  console.log(`  오류: ${errors}개`);
  console.log(`  경고: ${warnings}개`);
  
  return {
    totalIssues: issues.length,
    errors,
    warnings,
    issues: [...issues]
  };
}

// 특정 역에 대한 상세 검증
export function validateStation(stationName: string): ValidationIssue[] {
  const stationIds = STATIONS
    .filter(s => s.name === stationName)
    .map(s => s.id);
  
  if (stationIds.length === 0) {
    return [{
      type: 'disconnected_station',
      severity: 'error',
      message: `역 "${stationName}"을(를) 찾을 수 없습니다.`
    }];
  }
  
  const relatedIssues: ValidationIssue[] = [];
  const graph = getSubwayGraph();
  
  stationIds.forEach(id => {
    const station = getStationById(id);
    if (!station) return;
    
    const node = graph.nodes.get(id);
    if (!node) return;
    
    // 이 역의 이웃들을 확인
    node.neighbors.forEach(edge => {
      const neighborStation = getStationById(edge.to);
      if (!neighborStation) return;
      
      const commonLines = station.lines.filter(line => 
        neighborStation.lines.includes(line)
      );
      
      if (commonLines.length === 0 && !edge.isTransfer) {
        relatedIssues.push({
          type: 'common_lines_failure',
          severity: 'error',
          message: `"${station.name}" (${id}) → "${neighborStation.name}" (${edge.to})로의 연결에서 commonLines가 없지만 isTransfer=false입니다.`,
          details: {
            fromStation: { id, name: station.name, lines: station.lines },
            toStation: { id: edge.to, name: neighborStation.name, lines: neighborStation.lines },
            edge: { isTransfer: edge.isTransfer, line: edge.line }
          }
        });
      }
    });
  });
  
  return relatedIssues;
}

