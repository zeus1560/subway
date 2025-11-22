// 지하철 그래프 구축 모듈

import { STATIONS, LINES, Station, Line, LineId } from '../subwayMapData';
import { STATION_COORDINATES } from '../stationCoordinates';
import { SubwayGraph, GraphNode, GraphEdge } from './types';
import { logger } from '../logger';

// 역 간 이동 시간 계산 (거리 기반)
function calculateTravelTime(
  station1: Station,
  station2: Station,
  line: LineId
): number {
  // 좌표 기반 거리 계산
  const coord1 = STATION_COORDINATES.find(
    c => c.name === station1.name && c.lineNum === line
  );
  const coord2 = STATION_COORDINATES.find(
    c => c.name === station2.name && c.lineNum === line
  );
  
  let distance = 1.2; // 기본값: 평균 역간 거리 (km)
  
  if (coord1 && coord2) {
    // Haversine 공식으로 거리 계산
    const R = 6371; // 지구 반지름 (km)
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance = R * c;
  }
  
  // 평균 지하철 속도: 35km/h = 약 0.58km/min
  // 역간 정차 시간: 0.5분
  const travelTime = (distance / 0.58) + 0.5;
  
  return Math.max(1, Math.round(travelTime * 10) / 10); // 소수점 1자리
}

// 환승 시간 계산
function calculateTransferTime(station: Station): number {
  // 환승역 크기에 따라 다름
  // 대형 환승역: 5~7분, 중형: 4~5분, 소형: 3~4분
  if (station.lines.length >= 3) {
    return 6; // 대형 환승역
  } else if (station.lines.length === 2) {
    return 4; // 중형 환승역
  }
  return 3; // 소형 환승역
}

// 지하철 그래프 구축
export function buildSubwayGraph(): SubwayGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  
  // 1. 모든 역을 노드로 추가
  STATIONS.forEach(station => {
    const node: GraphNode = {
      stationId: station.id,
      stationName: station.name,
      lines: station.lines,
      isTransfer: station.isTransfer,
      neighbors: [],
    };
    nodes.set(station.id, node);
  });
  
  // 2. 각 노선의 역들을 순서대로 연결 (상하행)
  LINES.forEach(line => {
    // 본선 연결
    connectLineStations(line, nodes, edges);
    
    // 지선 연결
    if (line.branches) {
      line.branches.forEach(branch => {
        connectBranchStations(line.id, branch.stationIds, nodes, edges);
      });
    }
  });
  
  // 3. 환승역 연결 (같은 이름의 역들끼리 연결)
  const stationNameMap = new Map<string, string[]>(); // 역 이름 -> 역 ID 배열
  STATIONS.forEach(station => {
    if (!stationNameMap.has(station.name)) {
      stationNameMap.set(station.name, []);
    }
    stationNameMap.get(station.name)!.push(station.id);
  });
  
  // 같은 이름의 역들끼리 환승 엣지 추가
  stationNameMap.forEach((stationIds, stationName) => {
    if (stationIds.length > 1) {
      // 모든 조합에 대해 양방향 환승 엣지 추가
      for (let i = 0; i < stationIds.length; i++) {
        for (let j = i + 1; j < stationIds.length; j++) {
          const id1 = stationIds[i];
          const id2 = stationIds[j];
          const station1 = STATIONS.find(s => s.id === id1);
          const station2 = STATIONS.find(s => s.id === id2);
          
          if (station1 && station2 && nodes.has(id1) && nodes.has(id2)) {
            const transferTime = calculateTransferTime(station1);
            
            // 환승 엣지 생성 (양방향)
            const edge1: GraphEdge = {
              from: id1,
              to: id2,
              line: station2.lines[0], // 도착 역의 첫 번째 노선
              travelTime: transferTime,
              isTransfer: true,
              transferTime,
            };
            
            const edge2: GraphEdge = {
              from: id2,
              to: id1,
              line: station1.lines[0], // 도착 역의 첫 번째 노선
              travelTime: transferTime,
              isTransfer: true,
              transferTime,
            };
            
            edges.push(edge1, edge2);
            
            // 노드의 neighbors에 추가
            nodes.get(id1)!.neighbors.push(edge1);
            nodes.get(id2)!.neighbors.push(edge2);
          }
        }
      }
    }
  });
  
  logger.info('지하철 그래프 구축 완료', {
    totalNodes: nodes.size,
    totalEdges: edges.length,
    transferEdges: edges.filter(e => e.isTransfer).length,
  });
  
  return { nodes, edges };
}

// 노선의 역들을 연결하는 함수
function connectLineStations(
  line: Line,
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[]
): void {
  const stationIds = line.stationIds;
  
  for (let i = 0; i < stationIds.length - 1; i++) {
    const currentId = stationIds[i];
    const nextId = stationIds[i + 1];
    
    const currentStation = STATIONS.find(s => s.id === currentId);
    const nextStation = STATIONS.find(s => s.id === nextId);
    
    if (!currentStation || !nextStation) continue;
    if (!nodes.has(currentId) || !nodes.has(nextId)) continue;
    
    // 공통 노선 찾기
    const commonLine = currentStation.lines.find(l => nextStation.lines.includes(l));
    if (!commonLine) continue;
    
    const travelTime = calculateTravelTime(currentStation, nextStation, commonLine);
    
    // 양방향 엣지 생성
    const edge1: GraphEdge = {
      from: currentId,
      to: nextId,
      line: commonLine,
      travelTime,
      isTransfer: false,
    };
    
    const edge2: GraphEdge = {
      from: nextId,
      to: currentId,
      line: commonLine,
      travelTime,
      isTransfer: false,
    };
    
    edges.push(edge1, edge2);
    
    // 노드의 neighbors에 추가
    nodes.get(currentId)!.neighbors.push(edge1);
    nodes.get(nextId)!.neighbors.push(edge2);
  }
}

// 지선의 역들을 연결하는 함수
function connectBranchStations(
  lineId: LineId,
  stationIds: string[],
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[]
): void {
  for (let i = 0; i < stationIds.length - 1; i++) {
    const currentId = stationIds[i];
    const nextId = stationIds[i + 1];
    
    const currentStation = STATIONS.find(s => s.id === currentId);
    const nextStation = STATIONS.find(s => s.id === nextId);
    
    if (!currentStation || !nextStation) continue;
    if (!nodes.has(currentId) || !nodes.has(nextId)) continue;
    
    // 공통 노선 찾기
    const commonLine = currentStation.lines.find(l => nextStation.lines.includes(l));
    if (!commonLine) continue;
    
    const travelTime = calculateTravelTime(currentStation, nextStation, commonLine);
    
    // 양방향 엣지 생성
    const edge1: GraphEdge = {
      from: currentId,
      to: nextId,
      line: commonLine,
      travelTime,
      isTransfer: false,
    };
    
    const edge2: GraphEdge = {
      from: nextId,
      to: currentId,
      line: commonLine,
      travelTime,
      isTransfer: false,
    };
    
    edges.push(edge1, edge2);
    
    // 노드의 neighbors에 추가
    nodes.get(currentId)!.neighbors.push(edge1);
    nodes.get(nextId)!.neighbors.push(edge2);
  }
}

// 그래프 인스턴스 (싱글톤)
let graphInstance: SubwayGraph | null = null;

// 그래프 가져오기 (캐싱)
export function getSubwayGraph(): SubwayGraph {
  if (!graphInstance) {
    graphInstance = buildSubwayGraph();
  }
  return graphInstance;
}

