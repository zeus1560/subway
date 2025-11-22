// 서울 지하철 노선도 스키마틱 좌표 데이터 (전체 역 포함)
// stationData.ts의 모든 역을 포함하여 생성

import { STATION_DATA } from './stationData';

export type LineId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export interface Station {
  id: string;             // 고유 ID
  name: string;           // 역명
  lines: LineId[];        // 포함 노선
  layoutX: number;        // 스키마틱용 X (0~1200)
  layoutY: number;        // 스키마틱용 Y (0~800)
  isTransfer: boolean;    // 환승 여부
}

export interface Line {
  id: LineId;
  name: string;
  color: string;
  stationIds: string[];   // 운행 순서대로 정렬된 station id 리스트
}

// 서울 지하철 노선 색상
export const LINE_COLORS: Record<LineId, string> = {
  "1": "#0052A4",  // 파란색
  "2": "#00A84D",  // 초록색
  "3": "#EF7C1C",  // 주황색
  "4": "#00A5DE",  // 하늘색
  "5": "#996CAC",  // 보라색
  "6": "#CD7C2F",  // 갈색
  "7": "#747F00",  // 올리브색
  "8": "#E6186C",  // 분홍색
  "9": "#BDB092",  // 베이지색
};

// stationData.ts의 모든 역을 subwayMapData 형식으로 변환
// 노선별로 그룹화하여 순서대로 정렬
const convertStationData = (): Station[] => {
  const stations: Station[] = [];
  const stationMap = new Map<string, Station>();
  
  // stationData.ts의 모든 역을 변환
  STATION_DATA.forEach((station) => {
    const lineNum = station.lineNum as LineId;
    if (!lineNum || !['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(lineNum)) {
      return; // 1-9호선만 처리
    }
    
    // 기존 역이 있으면 lines에 추가, 없으면 새로 생성
    const existingStation = stationMap.get(station.name);
    if (existingStation) {
      // 같은 이름의 역이 있으면 노선 추가 (환승역)
      if (!existingStation.lines.includes(lineNum)) {
        existingStation.lines.push(lineNum);
      }
      existingStation.isTransfer = true;
    } else {
      const newStation: Station = {
        id: station.id,
        name: station.name,
        lines: [lineNum],
        layoutX: station.x,
        layoutY: station.y,
        isTransfer: station.transfer.length > 0,
      };
      stations.push(newStation);
      stationMap.set(station.name, newStation);
    }
  });
  
  return stations;
};

export const STATIONS: Station[] = convertStationData();

// 노선별 역 ID 목록 생성 (운행 순서대로)
const createLineStationIds = (lineNum: LineId): string[] => {
  return STATION_DATA
    .filter(s => s.lineNum === lineNum)
    .sort((a, b) => {
      // x, y 좌표를 기반으로 순서 정렬 (간단한 휴리스틱)
      // 실제로는 노선별 운행 순서를 정확히 알아야 함
      if (lineNum === '1') {
        return a.x - b.x; // 1호선은 x 좌표 순서
      } else if (lineNum === '2') {
        // 2호선은 순환선이므로 복잡함
        return a.x - b.x;
      } else if (['3', '4', '7'].includes(lineNum)) {
        return a.y - b.y; // 수직 노선은 y 좌표 순서
      } else {
        return a.x - b.x;
      }
    })
    .map(s => s.id);
};

// 노선 정의 (운행 순서대로 stationIds 정렬)
export const LINES: Line[] = [
  {
    id: "1",
    name: "1호선",
    color: LINE_COLORS["1"],
    stationIds: createLineStationIds("1"),
  },
  {
    id: "2",
    name: "2호선",
    color: LINE_COLORS["2"],
    stationIds: createLineStationIds("2"),
  },
  {
    id: "3",
    name: "3호선",
    color: LINE_COLORS["3"],
    stationIds: createLineStationIds("3"),
  },
  {
    id: "4",
    name: "4호선",
    color: LINE_COLORS["4"],
    stationIds: createLineStationIds("4"),
  },
  {
    id: "5",
    name: "5호선",
    color: LINE_COLORS["5"],
    stationIds: createLineStationIds("5"),
  },
  {
    id: "6",
    name: "6호선",
    color: LINE_COLORS["6"],
    stationIds: createLineStationIds("6"),
  },
  {
    id: "7",
    name: "7호선",
    color: LINE_COLORS["7"],
    stationIds: createLineStationIds("7"),
  },
  {
    id: "8",
    name: "8호선",
    color: LINE_COLORS["8"],
    stationIds: createLineStationIds("8"),
  },
  {
    id: "9",
    name: "9호선",
    color: LINE_COLORS["9"],
    stationIds: createLineStationIds("9"),
  },
];

// 역 ID로 역 찾기
export const getStationById = (id: string): Station | undefined => {
  return STATIONS.find(s => s.id === id);
};

// 노선 ID로 역 목록 가져오기
export const getStationsByLine = (lineId: LineId): Station[] => {
  const line = LINES.find(l => l.id === lineId);
  if (!line) return [];
  
  return line.stationIds
    .map(id => getStationById(id))
    .filter((s): s is Station => s !== undefined);
};

// 역 이름으로 역 찾기
export const getStationByName = (name: string): Station | undefined => {
  return STATIONS.find(s => s.name === name);
};

// 혼잡도 색상 (추후 연동용 hook 포인트)
export const getStationColor = (stationId: string, congestionLevel?: "여유" | "보통" | "주의" | "혼잡"): string => {
  const station = getStationById(stationId);
  if (!station) return "#666666";
  
  // 기본적으로 노선 색상 사용
  const lineColor = LINE_COLORS[station.lines[0] as LineId] || "#666666";
  
  // 혼잡도가 있으면 색상 조정 (추후 구현)
  if (congestionLevel) {
    // 혼잡도에 따른 색상 조정 로직
    // 혼잡도가 높을수록 어둡게, 낮을수록 밝게
    const baseColor = lineColor;
    const alpha = congestionLevel === 1 ? 1.0 : // 여유: 밝게
                  congestionLevel === 2 ? 0.9 : // 보통: 약간 어둡게
                  congestionLevel === 3 ? 0.7 : // 혼잡: 어둡게
                  0.5; // 매우 혼잡: 매우 어둡게
    
    // RGB 값 추출 및 조정
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // 알파 값 적용 (밝기 조정)
    const adjustedR = Math.round(r * alpha);
    const adjustedG = Math.round(g * alpha);
    const adjustedB = Math.round(b * alpha);
    
    return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
  }
  
  return lineColor;
};

