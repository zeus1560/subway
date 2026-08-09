// 그래프 디버깅 헬퍼 함수

import { getSubwayGraph } from './buildSubwayGraph';
import { STATIONS, getStationById } from '../subwayMapData';
import { GraphEdge } from './types';

export function dumpNeighborsByName(name: string) {
  const graph = getSubwayGraph();

  const stations = STATIONS.filter(s => s.name === name);
  console.log(`\n===== ${name} (${stations.length}개) =====`);

  if (stations.length === 0) {
    console.log('  → STATIONS에서 못 찾음');
    return;
  }

  for (const st of stations) {
    const node = graph.nodes.get(st.id);
    console.log(`\n[노드] id=${st.id}, lines=[${st.lines.join(',')}], isTransfer=${st.isTransfer}`);

    if (!node) {
      console.log('  → graph.nodes에 없음');
      continue;
    }

    console.log('  이웃역 목록:');
    for (const edge of node.neighbors as GraphEdge[]) {
      const toStation = getStationById(edge.to);
      console.log(
        `  - (${edge.from} → ${edge.to}) ${toStation?.name ?? 'Unknown'} | line=${edge.line} ` +
        `| transfer=${edge.isTransfer} | time=${edge.travelTime}`
      );
    }
  }
}

