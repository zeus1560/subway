'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Clock, MapPin, Train } from 'lucide-react';
import { STATIONS, LINES, LINE_COLORS, LineId, Station } from '@/lib/subwayMapData';
import { getStationCongestion, calculateCongestionLevel, predictCongestion } from '@/lib/api';

interface MapProps {
  selectedLine?: string;
  onStationSelect?: (station: Station) => void;
  onLineChange?: (line: string) => void;
}

// 기본 색상 (fallback)
const DEFAULT_COLOR = "#666666";

// 1호선 역 이름 배열 (정답 경로)
const LINE1_SEOUL_ONLY_NAMES = [
  '청량리','제기동','신설동','동묘앞','동대문',
  '종로5가','종로3가','종각','시청','서울역',
  '남영','용산','노량진','대방','신길','영등포',
  '신도림','구로',
];

const LINE1_NORTH_NAMES = [
  '연천','전곡','청산','소요산','동두천','보산',
  '동두천중앙','지행','덕정','덕계','양주','녹양',
  '가능','의정부','회룡','망월사','도봉산','방학',
  '창동','녹천','월계','광운대','석계','신이문',
  '외대앞','회기','청량리',
  '제기동','신설동','동묘앞','동대문',
  '종로5가','종로3가','종각','시청','서울역',
  '남영','용산','노량진','대방','신길','영등포',
  '신도림','구로',
];

const LINE1_WEST_NAMES = [
  // 구로 ↔ 인천 (경인선)
  '인천','동인천','도원','제물포','도화','주안','간석',
  '동암','백운','부평','부개','송내','중동','부천',
  '소사','역곡','온수','오류동','개봉','구일','구로',
  // 구로 ↔ 신창 (경부선·장항선)
  '가산디지털단지','독산','금천구청','석수','관악','안양','명학',
  '금정','군포','당정','의왕','성균관대','화서','수원','세류',
  '병점','세마','오산대','오산','진위','송탄','서정리','지제',
  '평택','성환','직산','두정','천안','봉명','쌍용',
  '아산','탕정','배방','온양온천','신창',
];

// 역 이름 배열을 stationIds로 변환하는 헬퍼 함수
const mapStationNamesToIds = (stationNames: string[]): string[] => {
  return stationNames.map(name => {
    // STATIONS에서 이름으로 역 찾기 (괄호/공백 등 표기 차이 고려)
    const normalizedName = name.replace(/\(.*?\)/g, '').trim(); // 괄호 내용 제거
    const station = STATIONS.find(s => {
      const stationName = s.name.replace(/\(.*?\)/g, '').trim();
      return stationName === normalizedName || s.name === name;
    });
    if (!station) {
      console.warn(`[LINE1] 역 이름 "${name}"을 찾을 수 없습니다.`);
      return '';
    }
    return station.id;
  }).filter(id => id !== '');
};

// 1호선 구간 정의 (역 이름 배열 기반)
const LINE1_SECTIONS: Record<string, { name: string; stationIds: string[] }> = {
  seoulOnly: {
    name: '서울 시내만',
    stationIds: mapStationNamesToIds(LINE1_SEOUL_ONLY_NAMES),
  },
  north: {
    name: '서울 + 북쪽',
    stationIds: mapStationNamesToIds(LINE1_NORTH_NAMES),
  },
  west: {
    name: '서울 + 서쪽',
    stationIds: mapStationNamesToIds(LINE1_WEST_NAMES),
  },
  all: {
    name: '1호선 전체',
    // north와 west를 합치되, 중복 제거 (서울 구간은 한 번만 포함)
    stationIds: mapStationNamesToIds([...LINE1_NORTH_NAMES, ...LINE1_WEST_NAMES]),
  },
};

// 뷰 모드 타입
type ViewMode = 'full' | 'section' | 'local';

// 1호선 보기 프리셋 타입
type Line1Preset = 'seoulOnly' | 'north' | 'west' | 'all';

export default function EnhancedSubwayMap({
  selectedLine,
  onStationSelect,
  onLineChange,
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [stationDetail, setStationDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [nearbyStations, setNearbyStations] = useState<Station[]>([]);
  const [showDetailSlide, setShowDetailSlide] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [clickStartPos, setClickStartPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(2.5); // 기본 줌 레벨
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeLine, setActiveLine] = useState<LineId>((selectedLine as LineId) || '1');
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [line1Preset, setLine1Preset] = useState<Line1Preset>('seoulOnly');
  const [line1BranchVisible, setLine1BranchVisible] = useState({
    gyeongwon: false,  // 경원선
    gyeongin: false,   // 경인선
    gyeongbu: false,   // 경부선
  });
  const [line1Section, setLine1Section] = useState<string>('main');
  const [line2BranchesVisible, setLine2BranchesVisible] = useState({
    seongsu: true,   // 성수지선
    sinjeong: true,  // 신정지선
  });
  const [line5BranchesVisible, setLine5BranchesVisible] = useState({
    macheon: true,  // 마천지선
    hanam: true,    // 하남선
  });
  const [localViewStation, setLocalViewStation] = useState<Station | null>(null);
  // 전체보기 모드: 모든 노선을 동시에 표시
  const [showAllLines, setShowAllLines] = useState(false);

  // 노선 선택 핸들러
  const handleLineSelect = useCallback(
    (line: LineId) => {
      setActiveLine(line);
      setViewMode('full');
      setLocalViewStation(null);
      if (onLineChange) {
        onLineChange(line);
      }
    },
    [onLineChange],
  );

  // 1호선 필터링된 역 가져오기 + section/local 뷰에서 일자 노선도로 재배치
  const getLine1Stations = useCallback((): Station[] => {
    const line1 = LINES.find((l) => l.id === '1');
    if (!line1) return [];

    let stationIds: string[] = [];

    // ① 부분 확대(local view)가 있으면 그 로직을 우선 적용
    if (viewMode === 'local' && localViewStation) {
      // 현재 프리셋의 stationIds에서 주변 역 찾기
      const section = LINE1_SECTIONS[line1Preset];
      if (section) {
        const currentIndex = section.stationIds.indexOf(localViewStation.id);
        if (currentIndex !== -1) {
          const start = Math.max(0, currentIndex - 5);
          const end = Math.min(section.stationIds.length, currentIndex + 6);
          stationIds = section.stationIds.slice(start, end);
        }
      }
    } else {
      // ② 프리셋으로 기본 stationIds 결정 (역 이름 배열 기반)
      const section = LINE1_SECTIONS[line1Preset];
      if (section) {
        stationIds = [...section.stationIds];
      }
    }

    if (stationIds.length === 0) return [];

    // stationIds 순서를 유지한 상태로 역 객체 배열 생성
    const baseStations = stationIds
      .map((id) => STATIONS.find((s) => s.id === id))
      .filter((s): s is Station => s !== undefined);

    // local 모드에서는 "진짜 지도 좌표" 대신 보기 좋은 일자 노선도 좌표 사용
    if (viewMode === 'local') {
      const spacing = 90; // 역 간격
      const startX = -((baseStations.length - 1) * spacing) / 2; // 가운데 정렬
      const centerY = 0;

      return baseStations.map((s, idx) => ({
        ...s,
        layoutX: startX + idx * spacing,
        layoutY: centerY,
      }));
    }

    // 프리셋 모드에서는 원래 좌표 그대로 사용
    // 역 ID가 포함되어 있고, 해당 역의 lines 배열에 1호선이 포함되어 있는지 확인
    return STATIONS.filter((s) => stationIds.includes(s.id) && s.lines.includes('1'));
  }, [line1Preset, viewMode, localViewStation]);

  // 필터링된 데이터 가져오기
  const getVisibleData = useCallback(() => {
    // 전체보기 모드: 모든 노선 표시
    if (showAllLines) {
      const allStations = STATIONS;
      const allLines = LINES;
      return {
        lines: allLines,
        stations: allStations,
      };
    }

    if (activeLine === '1') {
      return {
        lines: [LINES.find((l) => l.id === '1')!],
        stations: getLine1Stations(),
      };
    }

    const selectedLineObj = LINES.find((line) => line.id === activeLine);
    if (!selectedLineObj) {
      return { lines: [], stations: [] };
    }

    // 2호선인 경우 지선 포함 처리
    if (activeLine === '2') {
      const stationIdSet = new Set(selectedLineObj.stationIds);
      
      // 지선 역들 추가
      if (selectedLineObj.branches) {
        selectedLineObj.branches.forEach((branch) => {
          const isSeongsu = branch.id === '2-seongsu';
          const isSinjeong = branch.id === '2-sinjeong';
          
          if (
            (isSeongsu && line2BranchesVisible.seongsu) ||
            (isSinjeong && line2BranchesVisible.sinjeong)
          ) {
            branch.stationIds.forEach((id) => stationIdSet.add(id));
          }
        });
      }
      
      // 역 ID가 노선에 포함되어 있고, 해당 역의 lines 배열에도 현재 노선이 포함되어 있는지 확인
      const visibleStations = STATIONS.filter((station) => 
        stationIdSet.has(station.id) && station.lines.includes(activeLine)
      );

      return {
        lines: [selectedLineObj],
        stations: visibleStations,
      };
    }

    // 5호선인 경우 지선 포함 처리
    if (activeLine === '5') {
      const line5 = LINES.find((l) => l.id === '5');
      if (!line5) {
        return { lines: [], stations: [] };
      }

      const idSet = new Set<string>();

      // ① 메인 구간 역은 항상 포함
      line5.stationIds.forEach((id) => idSet.add(id));

      // ② branches가 있다면, 토글 상태를 보고 추가
      if (line5.branches) {
        line5.branches.forEach((branch) => {
          const isMacheon = branch.id === '5-macheon';
          const isHanam = branch.id === '5-hanam';

          // 꺼진 지선은 역을 추가하지 않음
          if (isMacheon && !line5BranchesVisible.macheon) return;
          if (isHanam && !line5BranchesVisible.hanam) return;

          branch.stationIds.forEach((id) => idSet.add(id));
        });
      }

      // 역 ID가 노선에 포함되어 있고, 해당 역의 lines 배열에도 현재 노선이 포함되어 있는지 확인
      const visibleStations = STATIONS.filter((station) => 
        idSet.has(station.id) && station.lines.includes(activeLine)
      );

      return {
        lines: [line5],
        stations: visibleStations,
      };
    }

    // 6호선인 경우 응암순환 루프 포함 처리
    if (activeLine === '6') {
      const line6 = LINES.find((l) => l.id === '6');
      if (!line6) {
        return { lines: [], stations: [] };
      }

      const idSet = new Set<string>();

      // 메인 구간
      line6.stationIds.forEach((id) => idSet.add(id));

      // 응암순환 branch 역들 추가 (항상 보이도록 토글 없음)
      if (line6.branches) {
        line6.branches.forEach((branch) => {
          if (branch.id === '6-eungam-loop') {
            branch.stationIds.forEach((id) => idSet.add(id));
          }
        });
      }

      // 역 ID가 노선에 포함되어 있고, 해당 역의 lines 배열에도 현재 노선이 포함되어 있는지 확인
      const visibleStations = STATIONS.filter((station) => 
        idSet.has(station.id) && station.lines.includes(activeLine)
      );

      return {
        lines: [line6],
        stations: visibleStations,
      };
    }

    // 다른 호선은 기존 로직 유지
    const stationIdSet = new Set(selectedLineObj.stationIds);
    // 역 ID가 노선에 포함되어 있고, 해당 역의 lines 배열에도 현재 노선이 포함되어 있는지 확인
    const visibleStations = STATIONS.filter((station) => 
      stationIdSet.has(station.id) && station.lines.includes(activeLine)
    );

    return {
      lines: [selectedLineObj],
      stations: visibleStations,
    };
  }, [activeLine, getLine1Stations, line2BranchesVisible, line5BranchesVisible, showAllLines]);

  // 역 간격 계산 (최소 50px 보장)
  const getStationSpacing = useCallback(
    (stations: Station[]): number => {
      if (stations.length < 2) return 50;

      const sorted = [...stations].sort((a, b) => {
        if (activeLine === '2') {
          // 2호선은 순환선이므로 복잡한 계산 필요 (여기서는 생략)
          return 0;
        }
        return a.layoutX - b.layoutX || a.layoutY - b.layoutY;
      });

      let minDistance = Infinity;
      for (let i = 0; i < sorted.length - 1; i++) {
        const dx = sorted[i + 1].layoutX - sorted[i].layoutX;
        const dy = sorted[i + 1].layoutY - sorted[i].layoutY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          minDistance = Math.min(minDistance, distance);
        }
      }

      // 최소 간격 50px 보장
      return Math.max(50, minDistance);
    },
    [activeLine],
  );

  // 각 호선별 위치 오프셋 설정 (사용자가 직접 조정 가능)
  // x: +면 오른쪽, -면 왼쪽으로 이동
  // y: +면 아래, -면 위로 이동
  const LINE_OFFSETS: Record<string, { x: number; y: number }> = {
    '1': { x: 200, y: -120 },   // 1호선
    '2': { x: 120, y: 100 },        // 2호선
    '3': { x: 400, y: -160 },        // 3호선
    '4': { x: 500, y: -120 },        // 4호선
    '5': { x: 800, y: -180 },        // 5호선
    '6': { x: 600, y: -120 },        // 6호선
    '7': { x: 800, y: -180 },        // 7호선
    '8': { x: 600, y: 0 },        // 8호선
    '9': { x: 700, y: -120 },        // 9호선
  };

  // transform 계산용 스테이션 리스트 가져오기 (5호선은 메인 구간만 사용)
  const getTransformStations = useCallback((): Station[] => {
    // 5호선일 때는 "예전 메인 구간"만 기준으로 transform 계산
    if (activeLine === '5') {
      const line5 = LINES.find((l) => l.id === '5');
      if (!line5) return [];

      // 메인 구간 id들만 사용 (branches는 무시)
      const mainStations = line5.stationIds
        .map((id) => STATIONS.find((s) => s.id === id))
        .filter((s): s is Station => !!s);

      return mainStations;
    }

    // 그 외 라인은 기존처럼 getVisibleData().stations 사용
    const { stations } = getVisibleData();
    return stations;
  }, [activeLine, getVisibleData]);

  // Transform 계산 (bounding box 중심을 화면 중앙에 배치)
  const getTransformForStations = useCallback(
    (stations: Station[]) => {
      if (stations.length === 0) {
        return { scale: 2.5, translateX: 0, translateY: 0 };
      }

      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 600;

      // Bounding box 계산
      const minX = Math.min(...stations.map((s) => s.layoutX));
      const maxX = Math.max(...stations.map((s) => s.layoutX));
      const minY = Math.min(...stations.map((s) => s.layoutY));
      const maxY = Math.max(...stations.map((s) => s.layoutY));

      const width = maxX - minX;
      const height = maxY - minY;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // 역 간격 고려
      const stationSpacing = getStationSpacing(stations);
      const minSpacingPixels = 50;

      const padding = 150;
      const viewBoxWidth = width + padding * 2;
      const viewBoxHeight = height + padding * 2;

      const viewBoxAspect = viewBoxWidth / viewBoxHeight;
      const containerAspect = containerWidth / containerHeight;

      let viewBoxToPixel: number;
      if (viewBoxAspect > containerAspect) {
        viewBoxToPixel = containerWidth / viewBoxWidth;
      } else {
        viewBoxToPixel = containerHeight / viewBoxHeight;
      }

      const scaleBySpacing = minSpacingPixels / (stationSpacing * viewBoxToPixel);

      const availableWidth = containerWidth * 0.9;
      const availableHeight = containerHeight * 0.9;

      const scaleX = availableWidth / (width * viewBoxToPixel);
      const scaleY = availableHeight / (height * viewBoxToPixel);
      let scale = Math.min(scaleX, scaleY);

      scale = Math.max(scale, scaleBySpacing);

      const MIN_SCALE = 2.0;
      const MAX_SCALE = 4.0;
      scale = Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));

      const viewBoxMinX = minX - padding;
      const viewBoxMinY = minY - padding;

      const centerXInViewBox = centerX - viewBoxMinX;
      const centerYInViewBox = centerY - viewBoxMinY;

      const centerXPixel = centerXInViewBox * viewBoxToPixel;
      const centerYPixel = centerYInViewBox * viewBoxToPixel;

      // 스케일 적용
      const scaledCenterX = centerXPixel * scale;
      const scaledCenterY = centerYPixel * scale;

      // 현재 활성화된 호선에 맞는 오프셋 가져오기
      const offset = LINE_OFFSETS[activeLine] || { x: 0, y: 0 };

      const translateX = containerWidth / 2 - scaledCenterX + offset.x;
      const translateY = containerHeight / 2 - scaledCenterY + offset.y;

      return { scale, translateX, translateY };
    },
    [getStationSpacing, activeLine],
  );

  // 초기 로드 및 노선/뷰 변경 시 transform 업데이트
  useEffect(() => {
    const updateTransform = () => {
      const stationsForTransform = getTransformStations();
      if (stationsForTransform.length > 0 && containerRef.current) {
        const transform = getTransformForStations(stationsForTransform);
        setZoom(transform.scale);
        setPan({ x: transform.translateX, y: transform.translateY });
      }
    };

    const timer = setTimeout(updateTransform, 100);
    window.addEventListener('resize', updateTransform);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTransform);
    };
  }, [activeLine, viewMode, line1Preset, line2BranchesVisible, localViewStation, getTransformStations, getTransformForStations]);

  // 역 라벨 위치 계산 (겹침 방지 - 개선된 버전)
  const getLabelPosition = useCallback(
    (
      station: Station,
      allStations: Station[],
      labelPositions?: Map<string, { x: number; y: number; width: number; height: number; anchor: 'start' | 'middle' | 'end' }>,
    ): {
      x: number;
      y: number;
      anchor: 'start' | 'middle' | 'end';
    } => {
      const baseOffset = 50;
      const fontSize = 18; // 실제 렌더링되는 폰트 크기와 일치
      const paddingX = 14;
      const paddingY = 8;
      // 역 이름 길이에 따른 라벨 크기 계산 (한글 기준 글자당 17px)
      const labelWidth = station.name.length * 17 + paddingX * 2;
      const labelHeight = fontSize + paddingY * 2;

      // 인접 역들의 라벨 위치를 확인하여 반대편 위치 우선 선택
      const nearbyLabels = labelPositions ? Array.from(labelPositions.entries())
        .filter(([id, _]) => {
          const otherStation = allStations.find(s => s.id === id);
          if (!otherStation) return false;
          const dx = otherStation.layoutX - station.layoutX;
          const dy = otherStation.layoutY - station.layoutY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // 1호선의 경우 수평으로 배치되어 있어서 X 거리만 확인
          if (station.lines.includes('1') && otherStation.lines.includes('1')) {
            return Math.abs(dx) < 200 && Math.abs(dy) < 50;
          }
          return distance < 150; // 가까운 역들만 확인
        })
        .map(([_, label]) => label) : [];

      // 위쪽에 라벨이 많은지 아래쪽에 라벨이 많은지 확인
      const labelsAbove = nearbyLabels.filter(l => l.y < station.layoutY).length;
      const labelsBelow = nearbyLabels.filter(l => l.y > station.layoutY).length;
      
      // 1호선의 경우 수평 배치로 인해 위아래로 번갈아가며 배치
      let preferBelow = labelsAbove > labelsBelow;
      if (station.lines.includes('1')) {
        // 1호선의 경우 X 좌표에 따라 위아래 번갈아 배치
        const stationIndex = allStations
          .filter(s => s.lines.includes('1'))
          .sort((a, b) => a.layoutX - b.layoutX)
          .findIndex(s => s.id === station.id);
        preferBelow = stationIndex % 2 === 0; // 짝수 인덱스는 아래, 홀수 인덱스는 위
      }
      
      // 특정 역 예외 처리: y 좌표 조정 및 라벨 위치 강제
      let yOffset = 0;
      let customOffset = 0; // 서초역의 경우 baseOffset을 줄여서 역에 더 가깝게
      let forcePosition: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } | null = null;
      
      if (station.name === '동대문역사문화공원') {
        yOffset = -15; // 15px 위로
      } else if (station.name === '문래') {
        yOffset = 15; // 15px 아래로
      } else if (station.name === '서초') {
        // 서초역은 라벨을 역 오른쪽에 배치 (다른 역들처럼)
        forcePosition = { x: station.layoutX + baseOffset, y: station.layoutY, anchor: 'start' as const };
      } else if (station.name === '종합운동장' && station.lines.includes('2')) {
        // 2호선 종합운동장만 라벨을 역 오른쪽에 더 멀리 배치
        forcePosition = { x: station.layoutX + baseOffset + 30, y: station.layoutY, anchor: 'start' as const };
      }
      
      // 강제 위치가 있으면 바로 반환
      if (forcePosition) {
        return forcePosition;
      }
      
      const adjustedBaseOffset = baseOffset + customOffset; // 서초역의 경우 baseOffset 조정
      const positions = [
        // 반대편 우선 (가독성 유지하면서 겹침 방지)
        { x: station.layoutX, y: station.layoutY + (preferBelow ? adjustedBaseOffset : -adjustedBaseOffset) + yOffset, anchor: 'middle' as const, priority: 1 },
        { x: station.layoutX, y: station.layoutY + (preferBelow ? -adjustedBaseOffset : adjustedBaseOffset) + yOffset, anchor: 'middle' as const, priority: 2 },
        // 기본 위치들
        { x: station.layoutX + adjustedBaseOffset, y: station.layoutY + yOffset, anchor: 'start' as const, priority: 3 },
        { x: station.layoutX - adjustedBaseOffset, y: station.layoutY + yOffset, anchor: 'end' as const, priority: 4 },
        { x: station.layoutX - adjustedBaseOffset * 0.7, y: station.layoutY - adjustedBaseOffset * 0.7 + yOffset, anchor: 'end' as const, priority: 5 },
        { x: station.layoutX + adjustedBaseOffset * 0.7, y: station.layoutY - adjustedBaseOffset * 0.7 + yOffset, anchor: 'start' as const, priority: 6 },
        { x: station.layoutX - adjustedBaseOffset * 0.7, y: station.layoutY + adjustedBaseOffset * 0.7 + yOffset, anchor: 'end' as const, priority: 7 },
        { x: station.layoutX + adjustedBaseOffset * 0.7, y: station.layoutY + adjustedBaseOffset * 0.7 + yOffset, anchor: 'start' as const, priority: 8 },
        // 추가 위치 옵션
        { x: station.layoutX, y: station.layoutY - adjustedBaseOffset * 1.5 + yOffset, anchor: 'middle' as const, priority: 9 },
        { x: station.layoutX + adjustedBaseOffset * 1.5, y: station.layoutY + yOffset, anchor: 'start' as const, priority: 10 },
        { x: station.layoutX, y: station.layoutY + adjustedBaseOffset * 1.5 + yOffset, anchor: 'middle' as const, priority: 11 },
        { x: station.layoutX - adjustedBaseOffset * 1.5, y: station.layoutY + yOffset, anchor: 'end' as const, priority: 12 },
      ];

      // 최소 거리 (라벨 크기 고려)
      // 1호선의 경우 수평 배치로 인해 더 넓은 간격 필요
      const minDistance = station.lines.includes('1') 
        ? Math.max(120, labelWidth / 2 + 40)
        : Math.max(80, labelWidth / 2 + 20);

      for (const pos of positions.sort((a, b) => a.priority - b.priority)) {
        let hasCollision = false;

        // 다른 역의 위치와 비교
        for (const other of allStations) {
          if (other.id === station.id) continue;

          const dx = pos.x - other.layoutX;
          const dy = pos.y - other.layoutY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            hasCollision = true;
            break;
          }
        }

        // 이미 배치된 다른 라벨들과 비교
        if (!hasCollision && labelPositions) {
          for (const [otherId, otherLabel] of Array.from(labelPositions.entries())) {
            if (otherId === station.id) continue;

            // 라벨의 실제 영역 계산 (anchor 고려)
            let otherLabelLeft: number, otherLabelRight: number, otherLabelTop: number, otherLabelBottom: number;
            
            if (otherLabel.anchor === 'middle') {
              otherLabelLeft = otherLabel.x - otherLabel.width / 2;
              otherLabelRight = otherLabel.x + otherLabel.width / 2;
            } else if (otherLabel.anchor === 'start') {
              otherLabelLeft = otherLabel.x;
              otherLabelRight = otherLabel.x + otherLabel.width;
            } else {
              otherLabelLeft = otherLabel.x - otherLabel.width;
              otherLabelRight = otherLabel.x;
            }
            otherLabelTop = otherLabel.y - otherLabel.height / 2;
            otherLabelBottom = otherLabel.y + otherLabel.height / 2;

            // 현재 위치의 라벨 영역 계산
            let currentLabelLeft: number, currentLabelRight: number, currentLabelTop: number, currentLabelBottom: number;
            
            if (pos.anchor === 'middle') {
              currentLabelLeft = pos.x - labelWidth / 2;
              currentLabelRight = pos.x + labelWidth / 2;
            } else if (pos.anchor === 'start') {
              currentLabelLeft = pos.x;
              currentLabelRight = pos.x + labelWidth;
            } else {
              currentLabelLeft = pos.x - labelWidth;
              currentLabelRight = pos.x;
            }
            currentLabelTop = pos.y - labelHeight / 2;
            currentLabelBottom = pos.y + labelHeight / 2;

            // 겹침 확인 (약간의 여유 공간 추가)
            const margin = 5;
            if (
              currentLabelLeft < otherLabelRight + margin &&
              currentLabelRight > otherLabelLeft - margin &&
              currentLabelTop < otherLabelBottom + margin &&
              currentLabelBottom > otherLabelTop - margin
            ) {
              hasCollision = true;
              break;
            }
          }
        }

        if (!hasCollision) {
          return { x: pos.x, y: pos.y, anchor: pos.anchor };
        }
      }

      // 모든 위치가 겹치면 기본 위치 반환 (최소한 표시는 되도록)
      let finalYOffset = 0;
      if (station.name === '동대문역사문화공원') {
        finalYOffset = -15; // 15px 위로
      } else if (station.name === '문래' || station.name === '서초') {
        finalYOffset = 15; // 15px 아래로
      }
      return { x: station.layoutX, y: station.layoutY - baseOffset + finalYOffset, anchor: 'middle' };
    },
    [],
  );

  // 주변 역 찾기
  const findNearbyStations = useCallback((station: Station) => {
    const { stations } = getVisibleData();
    const nearby = stations
      .map(s => {
        const dx = s.layoutX - station.layoutX;
        const dy = s.layoutY - station.layoutY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { station: s, distance };
      })
      .filter(item => item.distance > 0 && item.distance < 100)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4)
      .map(item => item.station);
    
    return nearby;
  }, [getVisibleData]);

  // 역 클릭 핸들러 (혼잡도 정보 로드 포함)
  const handleStationClick = useCallback(async (station: Station, e?: React.MouseEvent | React.TouchEvent) => {
    // 드래그 중이면 클릭 무시
    if (hasMoved) {
      return;
    }

    e?.preventDefault();
    e?.stopPropagation();

    setSelectedStation(station);
    setShowDetailSlide(true);
    setLoading(true);
    
    // 주변 역 찾기
    const nearby = findNearbyStations(station);
    setNearbyStations(nearby);
    
    try {
      // 혼잡도 데이터 로드
      const data = await getStationCongestion(station.name, station.lines[0]);
      const passengerCount = data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
      const congestion = calculateCongestionLevel(passengerCount);
      const predictedData = predictCongestion(
        { passengerCount },
        [{ passengerCount: passengerCount * 0.9 }]
      );
      
      setStationDetail({
        station,
        congestion,
        passengerCount,
        predictedData,
      });
      
      if (onStationSelect) {
        onStationSelect(station);
      }
    } catch (error) {
      console.error('역 상세 정보 로드 실패:', error);
      // 에러 발생 시에도 기본 정보 표시
      setStationDetail({
        station,
        congestion: { level: '보통', color: '#fbbf24' },
        passengerCount: 500,
        predictedData: { predictedPassengerCount: 450 },
      });
    } finally {
      setLoading(false);
    }

    // 1호선인 경우 부분 확대 뷰로 전환 (로컬 뷰)
    if (activeLine === '1') {
      setLocalViewStation(station);
      setViewMode('local');
      
      // 선택된 역 중심으로 transform 업데이트
      const line1 = LINES.find(l => l.id === '1');
      if (line1) {
        const line1Stations = line1.stationIds;
        const currentIndex = line1Stations.indexOf(station.id);
        if (currentIndex !== -1) {
          const start = Math.max(0, currentIndex - 5);
          const end = Math.min(line1Stations.length, currentIndex + 6);
          const localStationIds = line1Stations.slice(start, end);
          const localStations = STATIONS.filter(s => localStationIds.includes(s.id));
          
          if (localStations.length > 0 && containerRef.current) {
            const transform = getTransformForStations(localStations);
            setZoom(transform.scale * 1.5); // 로컬 뷰는 더 확대
            setPan({ x: transform.translateX, y: transform.translateY });
          }
        }
      }
    }
  }, [activeLine, onStationSelect, getTransformForStations, hasMoved, findNearbyStations]);

  // 상세 정보 닫기
  const handleCloseDetail = useCallback(() => {
    setShowDetailSlide(false);
    setTimeout(() => {
      setSelectedStation(null);
      setStationDetail(null);
      setNearbyStations([]);
    }, 300); // 애니메이션 시간과 맞춤
  }, []);

  // 주변 역으로 이동
  const handleNavigateToStation = useCallback((station: Station) => {
    handleStationClick(station);
    // 선택된 역으로 맵 이동
    const transform = getTransformForStations([station]);
    setZoom(transform.scale * 1.5); // 약간 확대
    setPan({ x: transform.translateX, y: transform.translateY });
  }, [handleStationClick, getTransformForStations]);

  // 줌 핸들러
  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(1.5, Math.min(5.0, prev + delta)));
  }, []);

  // 리셋 핸들러
  const handleReset = useCallback(() => {
    const stationsForTransform = getTransformStations();
    if (stationsForTransform.length > 0) {
      const transform = getTransformForStations(stationsForTransform);
      setZoom(transform.scale);
      setPan({ x: transform.translateX, y: transform.translateY });
    }
    setLocalViewStation(null);
    setViewMode('full');
  }, [getTransformStations, getTransformForStations]);

  // 드래그 핸들러 (클릭과 드래그 구분)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('circle, text, rect, button')) return;
      setIsDragging(true);
      setHasMoved(false);
      setClickStartPos({ x: e.clientX, y: e.clientY });
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
    if (isDragging) {
        if (clickStartPos) {
          const dx = Math.abs(e.clientX - clickStartPos.x);
          const dy = Math.abs(e.clientY - clickStartPos.y);
          if (dx > 5 || dy > 5) {
            setHasMoved(true);
          }
        }
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
    },
    [isDragging, dragStart, clickStartPos],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 휠 줌
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      handleZoom(delta);
    },
    [handleZoom],
  );

  // 노선 렌더링
  const renderLines = useCallback(() => {
    const { lines, stations } = getVisibleData();
    const lineElements: JSX.Element[] = [];

    lines.forEach((line) => {
      const lineColor = LINE_COLORS[line.id];
      const lineStations = stations.filter((s) => s.lines.includes(line.id));

      // ✅ 1호선 전용 렌더링 -----------------------------
      if (line.id === '1') {
        // stationIds 배열 순서대로 선을 그려주는 헬퍼
        const drawSection = (stationIds: string[], keyPrefix: string) => {
          const sectionStations = stationIds
            .map((id) => lineStations.find((s) => s.id === id))
            .filter((s): s is Station => !!s);

          for (let i = 0; i < sectionStations.length - 1; i++) {
            const from = sectionStations[i];
            const to = sectionStations[i + 1];
            if (from && to) {
              lineElements.push(
                <line
                  key={`line-1-${keyPrefix}-${i}`}
                  x1={from.layoutX}
                  y1={from.layoutY}
                  x2={to.layoutX}
                  y2={to.layoutY}
                  stroke={lineColor}
                  strokeWidth={6}
                  opacity={0.8}
                />,
              );
            }
          }
        };

        // 뷰 모드별로 어떤 섹션을 그릴지 결정
        if (viewMode === 'local') {
          // 로컬 뷰: getLine1Stations()가 이미 주변 역만 잘라줌
          // => 그냥 현재 visible stations 순서대로 그려주면 됨
          const visible = getLine1Stations();
          const ids = visible.map((s) => s.id);
          drawSection(ids, 'local');
        } else {
          // 프리셋 기반 렌더링: line1Preset에 따라 해당 섹션의 stationIds를 그대로 그리기
          const section = LINE1_SECTIONS[line1Preset];
          if (section) {
            drawSection(section.stationIds, line1Preset);
          }
        }

        // 1호선은 여기서 끝
        return;
      }
      // ------------------------------------------------

      // ✅ 2호선 특수 처리 (원래 있던 코드 유지)
      if (line.id === '2') {
        const sortedStations = line.stationIds
          .map((id) => lineStations.find((s) => s.id === id))
          .filter((s): s is Station => s !== undefined);

        for (let i = 0; i < sortedStations.length; i++) {
          const from = sortedStations[i];
          const to = sortedStations[(i + 1) % sortedStations.length];

          lineElements.push(
            <line
              key={`line-${line.id}-${i}`}
              x1={from.layoutX}
              y1={from.layoutY}
              x2={to.layoutX}
              y2={to.layoutY}
              stroke={lineColor}
              strokeWidth={6}
              opacity={0.8}
            />,
          );
        }

        // 지선 렌더링
        if (line.branches) {
          line.branches.forEach((branch) => {
            const isSeongsu = branch.id === '2-seongsu';
            const isSinjeong = branch.id === '2-sinjeong';
            
            if (
              (isSeongsu && !line2BranchesVisible.seongsu) ||
              (isSinjeong && !line2BranchesVisible.sinjeong)
            ) {
              return; // 꺼진 브랜치는 표시하지 않음
            }

            const branchStations = branch.stationIds
              .map((id) => lineStations.find((s) => s.id === id))
              .filter((s): s is Station => !!s);

            for (let i = 0; i < branchStations.length - 1; i++) {
              const from = branchStations[i];
              const to = branchStations[i + 1];
              if (from && to) {
                lineElements.push(
                  <line
                    key={`line-2-branch-${branch.id}-${i}`}
                    x1={from.layoutX}
                    y1={from.layoutY}
                    x2={to.layoutX}
                    y2={to.layoutY}
                    stroke={lineColor}
                    strokeWidth={6}
                    opacity={0.8}
                  />,
                );
              }
            }
          });
        }
        return;
      }
      // ✅ 5호선, 6호선 등 다른 특수 처리도 여기 계속...
      if (line.id === '5') {
        // 5호선 메인 구간 + 지선
        const mainStations = line.stationIds
          .map((id) => lineStations.find((s) => s.id === id))
          .filter((s): s is Station => !!s);

        // ① 메인 구간 라인
        for (let i = 0; i < mainStations.length - 1; i++) {
          const from = mainStations[i];
          const to = mainStations[i + 1];
          if (from && to) {
            lineElements.push(
              <line
                key={`line-5-main-${i}`}
                x1={from.layoutX}
                y1={from.layoutY}
                x2={to.layoutX}
                y2={to.layoutY}
                stroke={lineColor}
                strokeWidth={6}
                opacity={0.8}
              />,
            );
          }
        }

        // ② 지선 라인
        if (line.branches) {
          line.branches.forEach((branch) => {
            const isMacheon = branch.id === '5-macheon';
            const isHanam = branch.id === '5-hanam';
            
            if (
              (isMacheon && !line5BranchesVisible.macheon) ||
              (isHanam && !line5BranchesVisible.hanam)
            ) {
              return; // 꺼진 브랜치는 표시하지 않음
            }

            const branchStations = branch.stationIds
              .map((id) => lineStations.find((s) => s.id === id))
              .filter((s): s is Station => !!s);

            for (let i = 0; i < branchStations.length - 1; i++) {
              const from = branchStations[i];
              const to = branchStations[i + 1];
              if (from && to) {
                lineElements.push(
                  <line
                    key={`line-5-branch-${branch.id}-${i}`}
                    x1={from.layoutX}
                    y1={from.layoutY}
                    x2={to.layoutX}
                    y2={to.layoutY}
                    stroke={lineColor}
                    strokeWidth={6}
                    opacity={0.8}
                  />,
                );
              }
            }
          });
        }
      } else if (line.id === '6') {
        // 6호선 메인 구간 + 응암순환 루프
        const mainStations = line.stationIds
          .map((id) => lineStations.find((s) => s.id === id))
          .filter((s): s is Station => !!s);

        // ① 메인 구간 라인
        for (let i = 0; i < mainStations.length - 1; i++) {
          const from = mainStations[i];
          const to = mainStations[i + 1];
          if (from && to) {
            lineElements.push(
              <line
                key={`line-6-main-${i}`}
                x1={from.layoutX}
                y1={from.layoutY}
                x2={to.layoutX}
                y2={to.layoutY}
                stroke={lineColor}
                strokeWidth={6}
                opacity={0.8}
              />,
            );
          }
        }

        // ② 응암순환 branch (구산 → 응암 → 역촌 → 불광 → 연신내)
        if (line.branches) {
          const loop = line.branches.find((b) => b.id === '6-eungam-loop');
          if (loop) {
            const loopStations = loop.stationIds
              .map((id) => lineStations.find((s) => s.id === id))
              .filter((s): s is Station => !!s);

            for (let i = 0; i < loopStations.length - 1; i++) {
              const from = loopStations[i];
              const to = loopStations[i + 1];
              if (from && to) {
                lineElements.push(
                  <line
                    key={`line-6-loop-${i}`}
                    x1={from.layoutX}
                    y1={from.layoutY}
                    x2={to.layoutX}
                    y2={to.layoutY}
                    stroke={lineColor}
                    strokeWidth={6}
                    opacity={0.8}
                  />,
                );
              }
            }
          }
        }
      } else {
        // 일반 노선
        const sortedStations = line.stationIds
          .map((id) => lineStations.find((s) => s.id === id))
          .filter((s): s is Station => s !== undefined);

        for (let i = 0; i < sortedStations.length - 1; i++) {
          const from = sortedStations[i];
          const to = sortedStations[i + 1];

          lineElements.push(
            <line
              key={`line-${line.id}-${i}`}
              x1={from.layoutX}
              y1={from.layoutY}
              x2={to.layoutX}
              y2={to.layoutY}
              stroke={lineColor}
              strokeWidth={6}
              opacity={0.8}
            />,
          );
        }
      }
    });

    return lineElements;
  }, [
    getVisibleData,
    viewMode,
    line1Preset,
    getLine1Stations,
    line2BranchesVisible,
    line5BranchesVisible,
  ]);

  // 역 렌더링
  const renderStations = useCallback(() => {
    const { stations } = getVisibleData();
    const stationElements: JSX.Element[] = [];
    
    // 먼저 모든 라벨 위치를 계산하여 겹침 방지
    const labelPositions = new Map<string, { x: number; y: number; width: number; height: number; anchor: 'start' | 'middle' | 'end' }>();
    const fontSize = 18; // 실제 렌더링되는 폰트 크기
    const paddingY = 8; // 상하 패딩
    
    // 라벨 위치를 순차적으로 계산 (이미 배치된 라벨과의 겹침 고려)
    stations.forEach((station) => {
      // 한글 폰트 크기 18px 기준: 한 글자당 약 16-18px 너비 필요
      // 안전하게 글자당 17px로 계산하고, padding 추가
      const paddingX = 14;
      const labelWidth = station.name.length * 17 + paddingX * 2;
      const labelHeight = fontSize + paddingY * 2;
      
      const labelPos = getLabelPosition(station, stations, labelPositions);
      
      // anchor에 따라 실제 라벨 영역 계산
      let labelLeft: number, labelRight: number;
      if (labelPos.anchor === 'middle') {
        labelLeft = labelPos.x - labelWidth / 2;
        labelRight = labelPos.x + labelWidth / 2;
      } else if (labelPos.anchor === 'start') {
        labelLeft = labelPos.x;
        labelRight = labelPos.x + labelWidth;
      } else {
        labelLeft = labelPos.x - labelWidth;
        labelRight = labelPos.x;
      }
      
      labelPositions.set(station.id, {
        x: labelPos.x,
        y: labelPos.y,
        width: labelWidth,
        height: labelHeight,
        anchor: labelPos.anchor,
      });
    });

    // 라벨을 렌더링 순서대로 정렬 (겹치는 경우 뒤에 있는 라벨의 배경을 투명하게)
    const sortedStations = [...stations].sort((a, b) => {
      const labelA = labelPositions.get(a.id);
      const labelB = labelPositions.get(b.id);
      if (!labelA || !labelB) return 0;
      // y 좌표가 작은 것(위쪽)을 먼저 렌더링
      return labelA.y - labelB.y;
    });

    sortedStations.forEach((station) => {
      // 서초역이 문래역 근처에 잘못 표시되지 않도록 필터링
      if (station.name === '서초') {
        const mullaeStation = stations.find(s => s.name === '문래');
        if (mullaeStation) {
          const distance = Math.sqrt(
            Math.pow(station.layoutX - mullaeStation.layoutX, 2) +
            Math.pow(station.layoutY - mullaeStation.layoutY, 2)
          );
          // 서초역과 문래역이 실제로 멀리 떨어져 있으면(500px 이상) 정상 표시
          // 하지만 라벨 위치가 문래역 근처에 있으면 숨김
          const labelInfo = labelPositions.get(station.id);
          if (labelInfo && mullaeStation) {
            const mullaeLabelInfo = labelPositions.get(mullaeStation.id);
            if (mullaeLabelInfo) {
              const labelDistance = Math.sqrt(
                Math.pow(labelInfo.x - mullaeLabelInfo.x, 2) +
                Math.pow(labelInfo.y - mullaeLabelInfo.y, 2)
              );
              // 라벨이 문래역 라벨 근처(150px 이내)에 있으면 서초역 라벨을 숨김
              if (labelDistance < 150 && distance > 500) {
                return; // 서초역 라벨을 렌더링하지 않음
              }
            }
          }
        }
      }
      
      const isSelected = selectedStation?.id === station.id;
      const isHovered = hoveredStation === station.id;
      const labelPos = labelPositions.get(station.id) || getLabelPosition(station, stations);
      const lineColor = LINE_COLORS[station.lines[0] as LineId] || DEFAULT_COLOR;

      const clickRadius = 15; // 클릭 영역 확대
      const padding = 10; // 패딩 증가
      const totalRadius = clickRadius + padding;

      stationElements.push(
        <g key={station.id}>
          <circle
            cx={station.layoutX}
            cy={station.layoutY}
            r={totalRadius}
            fill="transparent"
            className="cursor-pointer"
            onClick={(e) => handleStationClick(station, e)}
            onMouseEnter={() => setHoveredStation(station.id)}
            onMouseLeave={() => setHoveredStation(null)}
          />
          <circle
            cx={station.layoutX}
            cy={station.layoutY}
            r={clickRadius}
            fill={isSelected ? lineColor : isHovered ? lineColor : 'white'}
            stroke={lineColor}
            strokeWidth={isSelected ? 4 : isHovered ? 3 : 2}
            className="cursor-pointer transition-all duration-200"
            onClick={(e) => handleStationClick(station, e)}
            onMouseEnter={() => setHoveredStation(station.id)}
            onMouseLeave={() => setHoveredStation(null)}
            style={{
              filter: isSelected ? 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' : undefined,
            }}
          />
          <g>
            {(() => {
              const labelInfo = labelPositions.get(station.id);
              if (!labelInfo) {
                // 폴백: 기본 계산
                const fontSize = 18;
                const paddingX = 14;
                const paddingY = 8;
                const labelWidth = station.name.length * 17 + paddingX * 2;
                const labelHeight = fontSize + paddingY * 2;
                
                // 텍스트가 항상 중앙 정렬이므로 rect도 항상 중앙 기준으로 계산
                const rectX = labelPos.x - labelWidth / 2;
                
                // 폴백의 경우도 겹침 확인 (더 엄격하게)
                let shouldRenderBackgroundFallback = true;
                if (labelPositions) {
                  for (const [otherId, otherLabel] of Array.from(labelPositions.entries())) {
                    if (otherId === station.id) continue;
                    
                    let otherLabelLeft: number, otherLabelRight: number;
                    if (otherLabel.anchor === 'middle') {
                      otherLabelLeft = otherLabel.x - otherLabel.width / 2;
                      otherLabelRight = otherLabel.x + otherLabel.width / 2;
                    } else if (otherLabel.anchor === 'start') {
                      otherLabelLeft = otherLabel.x;
                      otherLabelRight = otherLabel.x + otherLabel.width;
    } else {
                      otherLabelLeft = otherLabel.x - otherLabel.width;
                      otherLabelRight = otherLabel.x;
                    }
                    
                    const otherLabelTop = otherLabel.y - otherLabel.height / 2;
                    const otherLabelBottom = otherLabel.y + otherLabel.height / 2;
                    const currentLabelTop = labelPos.y - labelHeight / 2;
                    const currentLabelBottom = labelPos.y + labelHeight / 2;
                    
                    const margin = 1;
                    const overlapX = Math.min(rectX + labelWidth, otherLabelRight + margin) - Math.max(rectX, otherLabelLeft - margin);
                    const overlapY = Math.min(currentLabelBottom, otherLabelBottom + margin) - Math.max(currentLabelTop, otherLabelTop - margin);
                    
                    if (overlapX > 0 && overlapY > 0) {
                      // 다른 라벨이 위에 있거나, 같은 높이에 있거나, x 좌표가 더 왼쪽에 있으면 배경을 렌더링하지 않음
                      if (otherLabel.y < labelPos.y || (otherLabel.y === labelPos.y && otherLabel.x < labelPos.x)) {
                        shouldRenderBackgroundFallback = false;
                        break;
                      }
                    }
                  }
                }
                
                return (
                  <>
                    <text
                      x={labelPos.x}
                      y={labelPos.y + fontSize / 3}
                      textAnchor="middle"
                      fontSize={fontSize}
                      fontWeight={isSelected ? 'bold' : station.isTransfer ? 'bold' : '600'}
                      fill="white"
                      className="pointer-events-none"
                      dominantBaseline="middle"
                      style={{
                        textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      {station.name}
                    </text>
                  </>
                );
              }
              
              // 텍스트가 항상 중앙 정렬이므로 rect도 항상 중앙 기준으로 계산
              const rectX = labelInfo.x - labelInfo.width / 2;
              
              // 모든 라벨과 겹치는지 확인하여 배경 렌더링 여부 결정
              // 겹치는 경우 뒤에 있는 라벨(아래쪽 또는 나중에 렌더링되는)의 배경을 렌더링하지 않음
              let shouldRenderBackground = true;
              if (labelPositions) {
                for (const [otherId, otherLabel] of Array.from(labelPositions.entries())) {
                  if (otherId === station.id) continue;
                  
                  let otherLabelLeft: number, otherLabelRight: number;
                  if (otherLabel.anchor === 'middle') {
                    otherLabelLeft = otherLabel.x - otherLabel.width / 2;
                    otherLabelRight = otherLabel.x + otherLabel.width / 2;
                  } else if (otherLabel.anchor === 'start') {
                    otherLabelLeft = otherLabel.x;
                    otherLabelRight = otherLabel.x + otherLabel.width;
                  } else {
                    otherLabelLeft = otherLabel.x - otherLabel.width;
                    otherLabelRight = otherLabel.x;
                  }
                  
                  const otherLabelTop = otherLabel.y - otherLabel.height / 2;
                  const otherLabelBottom = otherLabel.y + otherLabel.height / 2;
                  const currentLabelTop = labelInfo.y - labelInfo.height / 2;
                  const currentLabelBottom = labelInfo.y + labelInfo.height / 2;
                  
                  // 겹침 확인 (더 엄격하게)
                  const margin = 1; // 최소 여유 공간
                  const overlapX = Math.min(rectX + labelInfo.width, otherLabelRight + margin) - Math.max(rectX, otherLabelLeft - margin);
                  const overlapY = Math.min(currentLabelBottom, otherLabelBottom + margin) - Math.max(currentLabelTop, otherLabelTop - margin);
                  
                  // 겹치는 경우
                  if (overlapX > 0 && overlapY > 0) {
                    // 다른 라벨이 위에 있거나, 같은 높이에 있거나, x 좌표가 더 왼쪽에 있으면 배경을 렌더링하지 않음
                    if (otherLabel.y < labelInfo.y || (otherLabel.y === labelInfo.y && otherLabel.x < labelInfo.x)) {
                      shouldRenderBackground = false;
                      break;
                    }
                  }
                }
              }
              
              return (
                <>
                  <text
                    x={labelInfo.x}
                    y={labelInfo.y + 18 / 3}
                    textAnchor="middle"
                    fontSize={18}
                    fontWeight={isSelected ? 'bold' : station.isTransfer ? 'bold' : '600'}
                    fill="white"
                    className="pointer-events-none"
                    dominantBaseline="middle"
                    style={{
                      textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
                    }}
                  >
                    {station.name}
                  </text>
                </>
              );
            })()}
          </g>
        </g>,
      );
    });

    return stationElements;
  }, [getVisibleData, selectedStation, hoveredStation, getLabelPosition, handleStationClick]);

  // ViewBox 계산
  const { stations } = getVisibleData();
  const viewBoxData = useMemo(() => {
    if (stations.length === 0) {
      return { minX: 0, minY: 0, width: 1200, height: 800 };
    }
    const minX = Math.min(...stations.map((s) => s.layoutX));
    const minY = Math.min(...stations.map((s) => s.layoutY));
    const maxX = Math.max(...stations.map((s) => s.layoutX));
    const maxY = Math.max(...stations.map((s) => s.layoutY));
    return {
      minX: minX - 150,
      minY: minY - 150,
      width: maxX - minX + 300,
      height: maxY - minY + 300,
    };
  }, [stations]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#f5f7fb] dark:bg-gray-950 rounded-lg overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 노선 탭 */}
      <div className="absolute top-3 left-3 right-3 z-20 flex gap-2 overflow-x-auto pb-2">
        {/* 전체보기 버튼 */}
        <button
          onClick={() => {
            setShowAllLines(!showAllLines);
            if (!showAllLines) {
              setActiveLine('1' as LineId);
            }
          }}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            showAllLines
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md scale-105'
              : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm'
          }`}
        >
          {showAllLines ? '전체보기 ON' : '전체보기'}
        </button>
        {LINES.map((line) => (
          <button
            key={line.id}
            onClick={() => {
              setShowAllLines(false);
              handleLineSelect(line.id);
            }}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              activeLine === line.id && !showAllLines
                ? 'text-white shadow-md scale-105'
                : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm'
            }`}
            style={{
              backgroundColor: activeLine === line.id && !showAllLines ? line.color : undefined,
            }}
          >
            {line.name}
          </button>
        ))}
      </div>

      {/* 2호선 전용 컨트롤 */}
      {activeLine === '2' && (
        <div className="absolute top-16 left-3 z-20 flex flex-col gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            2호선 지선 보기
          </div>
          <div className="flex flex-col gap-2 text-xs text-gray-700 dark:text-gray-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={line2BranchesVisible.seongsu}
                onChange={(e) => {
                  setLine2BranchesVisible((prev) => ({ ...prev, seongsu: e.target.checked }));
                  setTimeout(() => handleReset(), 50);
                }}
                className="w-4 h-4"
              />
              <span>성수지선 (성수 ↔ 신설동)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={line2BranchesVisible.sinjeong}
                onChange={(e) => {
                  setLine2BranchesVisible((prev) => ({ ...prev, sinjeong: e.target.checked }));
                  setTimeout(() => handleReset(), 50);
                }}
                className="w-4 h-4"
              />
              <span>신정지선 (신도림 ↔ 까치산)</span>
            </label>
          </div>
        </div>
      )}

      {/* 5호선 전용 컨트롤 */}
      {activeLine === '5' && (
        <div className="absolute top-16 left-3 z-20 flex flex-col gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            5호선 지선 보기
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-400 mb-2 leading-snug">
            강동역을 기준으로 남쪽 마천방면과 동쪽 하남선 지선을 켜거나 끌 수 있습니다.
          </p>
          <div className="flex flex-col gap-2 text-xs text-gray-700 dark:text-gray-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={line5BranchesVisible.macheon}
                onChange={(e) => {
                  setLine5BranchesVisible((prev) => ({ ...prev, macheon: e.target.checked }));
                }}
                className="w-4 h-4"
              />
              <span>마천지선 (강동 ↔ 마천)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={line5BranchesVisible.hanam}
                onChange={(e) => {
                  setLine5BranchesVisible((prev) => ({ ...prev, hanam: e.target.checked }));
                }}
                className="w-4 h-4"
              />
              <span>하남선 (강동 ↔ 하남검단산)</span>
            </label>
          </div>
        </div>
      )}

      {/* 1호선 전용 컨트롤 (로컬 뷰가 아닐 때만 표시) */}
      {activeLine === '1' && viewMode !== 'local' && (
        <div className="absolute top-16 left-3 z-20 flex flex-col gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-[240px]">
          <p className="text-xs font-semibold text-gray-200 dark:text-gray-200 mb-1">
            1호선 보기 방식
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-400 mb-2 leading-snug">
            1호선은 서울 시내(청량리~구로)를 기준으로 북쪽(소요산·동두천)과
            서쪽(인천·신창) 방향 지선으로 나뉩니다. 보고 싶은 구간을 선택하세요.
          </p>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setLine1Preset('seoulOnly');
                setTimeout(() => handleReset(), 50);
              }}
              className={`px-3 py-1.5 text-xs rounded-md text-left transition-colors ${
                line1Preset === 'seoulOnly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800/80 dark:bg-gray-700/80 text-gray-200 hover:bg-gray-700 dark:hover:bg-gray-600'
              }`}
            >
              서울 시내만 (청량리~구로)
            </button>

            <button
              onClick={() => {
                setLine1Preset('north');
                setTimeout(() => handleReset(), 50);
              }}
              className={`px-3 py-1.5 text-xs rounded-md text-left transition-colors ${
                line1Preset === 'north'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800/80 dark:bg-gray-700/80 text-gray-200 hover:bg-gray-700 dark:hover:bg-gray-600'
              }`}
            >
              서울 + 북쪽 (연천~구로)
            </button>

            <button
              onClick={() => {
                setLine1Preset('west');
                setTimeout(() => handleReset(), 50);
              }}
              className={`px-3 py-1.5 text-xs rounded-md text-left transition-colors ${
                line1Preset === 'west'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800/80 dark:bg-gray-700/80 text-gray-200 hover:bg-gray-700 dark:hover:bg-gray-600'
              }`}
            >
              서울 + 서쪽 (인천·신창 방면)
            </button>

            <button
              onClick={() => {
                setLine1Preset('all');
                setTimeout(() => handleReset(), 50);
              }}
              className={`px-3 py-1.5 text-xs rounded-md text-left transition-colors ${
                line1Preset === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800/80 dark:bg-gray-700/80 text-gray-200 hover:bg-gray-700 dark:hover:bg-gray-600'
              }`}
            >
              1호선 전체 보기
            </button>
          </div>
        </div>
      )}

      {/* 줌 컨트롤 */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg p-2 shadow-lg">
        <button
          onClick={() => handleZoom(0.2)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="확대"
        >
          <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="축소"
        >
          <ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="리셋"
        >
          <RotateCcw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* 🔥 pan/zoom 분리된 SVG 영역 */}
      <div className="w-full h-full overflow-hidden">
        {/* pan 전용 래퍼 */}
      <div
          className="w-full h-full transition-transform duration-200 ease-out"
        style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center',
        }}
      >
          {/* zoom 전용 */}
        <svg
          ref={svgRef}
            viewBox={`${viewBoxData.minX} ${viewBoxData.minY} ${viewBoxData.width} ${viewBoxData.height}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
        >
          {renderLines()}
            {renderStations()}
          </svg>
        </div>
      </div>

      {/* 역 상세 정보 슬라이드 (하단) */}
      {selectedStation && (
        <div
          className={`fixed md:absolute bottom-0 left-0 right-0 bg-white/98 dark:bg-gray-900/98 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-700/80 rounded-t-2xl shadow-2xl z-30 transition-transform duration-300 ease-out ${
            showDetailSlide ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{
            maxHeight: '70vh',
            maxWidth: '100%',
          }}
        >
          {/* 드래그 핸들 */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
      </div>

          <div className="container mx-auto px-5 py-5 overflow-y-auto max-h-[calc(70vh-60px)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform duration-200 hover:scale-110"
                  style={{ backgroundColor: selectedStation.lines[0] ? LINE_COLORS[selectedStation.lines[0] as LineId] : "#666666" }}
                >
                  {selectedStation.lines[0] || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedStation.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {selectedStation.lines.map(l => `${l}호선`).join(', ')}
                    {selectedStation.isTransfer && ` · 환승역`}
                  </p>
                </div>
              </div>
                <button
                onClick={handleCloseDetail}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors active:scale-95"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">로딩 중...</p>
              </div>
            ) : (
              <>
                {/* 혼잡도 정보 */}
                {stationDetail && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {/* 현재 혼잡도 */}
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">현재</span>
                  </div>
                      <div className="flex items-center gap-3">
                    <div
                          className="w-2.5 h-12 rounded-full shadow-sm"
                      style={{ backgroundColor: stationDetail.congestion.color }}
                    />
                        <div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {stationDetail.congestion.level}
                      </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {stationDetail.passengerCount.toLocaleString()}명
                      </div>
                    </div>
                  </div>
                </div>

                {/* 예상 혼잡도 */}
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">10분 후</span>
                  </div>
                      <div className="flex items-center gap-3">
                    <div
                          className="w-2.5 h-12 rounded-full shadow-sm opacity-75"
                      style={{
                        backgroundColor: calculateCongestionLevel(
                          stationDetail.predictedData.predictedPassengerCount
                        ).color,
                      }}
                    />
                        <div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {calculateCongestionLevel(
                          stationDetail.predictedData.predictedPassengerCount
                        ).level}
                      </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {stationDetail.predictedData.predictedPassengerCount.toLocaleString()}명
                      </div>
                    </div>
                  </div>
                </div>

                    {/* 다음 열차 */}
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Train className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">다음 열차</span>
                  </div>
                      <div className="space-y-1.5">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          상행 2분
                  </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          하행 4분
                </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 주변 역 이동 */}
                {nearbyStations.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">주변 역</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {nearbyStations.map((nearbyStation) => (
                <button
                          key={nearbyStation.id}
                          onClick={() => handleNavigateToStation(nearbyStation)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: nearbyStation.lines[0] ? LINE_COLORS[nearbyStation.lines[0] as LineId] : "#666666" }}
                          >
                            {nearbyStation.lines[0] || '?'}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {nearbyStation.name}
                          </span>
                </button>
                      ))}
                    </div>
              </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 하단 안내 (선택된 역이 없을 때만) */}
      {!selectedStation && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg z-10">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            역을 클릭하면 상세 정보 확인
          </p>
        </div>
      )}
    </div>
  );
}
