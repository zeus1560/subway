'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Clock, MapPin, Train } from 'lucide-react';
import { STATION_DATA, Station, getStationsByLine } from '@/lib/stationData';
import { getStationCongestion, calculateCongestionLevel, predictCongestion } from '@/lib/api';
import { getLineColor } from '@/lib/utils';
import { ALL_LINE_IDS } from '@/lib/subwayMapData';

interface MapProps {
  selectedLine?: string;
  onStationSelect?: (station: Station) => void;
}

// SVG viewBox 설정
const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 900;
const GRID_SPACING = 80; // 격자 간격
const PADDING = 100;

// 주요 거점역 (기본 뷰에서 라벨 표시)
const MAJOR_STATIONS = [
  '서울역', '시청', '종로3가', '동대문역사문화공원', '왕십리',
  '강남', '사당', '홍대입구', '을지로입구', '고속터미널', '건대입구', '잠실'
];

// 전용 레이아웃 좌표 정의 (layoutX, layoutY)
interface LayoutStation extends Station {
  layoutX: number;
  layoutY: number;
}

// 스키마틱 레이아웃 생성: 격자형 노선도
function createSchematicLayout(stations: Station[]): LayoutStation[] {
  const layoutStations: LayoutStation[] = [];
  const stationMap = new Map<string, LayoutStation>();
  
  // 노선별로 그룹화
  const lines = ALL_LINE_IDS;
  const lineGroups = new Map<string, Station[]>();
  
  lines.forEach(lineNum => {
    const lineStations = stations.filter(s => s.lineNum === lineNum);
    if (lineStations.length > 0) {
      lineGroups.set(lineNum, lineStations);
    }
  });
  
  // 1호선: 수평선 (상단)
  const line1 = lineGroups.get('1') || [];
  if (line1.length > 0) {
    const startY = PADDING + GRID_SPACING;
    const startX = PADDING;
    const spacing = (VIEWBOX_WIDTH - PADDING * 2) / Math.max(1, line1.length - 1);
    
    line1.forEach((station, index) => {
      const layoutX = startX + index * spacing;
      const layoutY = startY;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      stationMap.set(station.name, layoutStation);
      layoutStations.push(layoutStation);
    });
  }
  
  // 2호선: 순환선 (중앙, 원형)
  const line2 = lineGroups.get('2') || [];
  if (line2.length > 0) {
    const centerX = VIEWBOX_WIDTH / 2;
    const centerY = VIEWBOX_HEIGHT / 2;
    const radius = 180;
    const angleStep = (Math.PI * 2) / line2.length;
    
    line2.forEach((station, index) => {
      const angle = index * angleStep - Math.PI / 2; // 상단부터 시작
      const layoutX = centerX + Math.cos(angle) * radius;
      const layoutY = centerY + Math.sin(angle) * radius;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      
      // 환승역이면 기존 좌표 유지, 아니면 새 좌표
      if (!stationMap.has(station.name)) {
        stationMap.set(station.name, layoutStation);
        layoutStations.push(layoutStation);
      } else {
        // 환승역: 평균 좌표
        const existing = stationMap.get(station.name)!;
        existing.layoutX = (existing.layoutX + layoutX) / 2;
        existing.layoutY = (existing.layoutY + layoutY) / 2;
      }
    });
  }
  
  // 3호선: 수직선 (좌측)
  const line3 = lineGroups.get('3') || [];
  if (line3.length > 0) {
    const startX = PADDING + GRID_SPACING;
    const startY = PADDING + GRID_SPACING * 2;
    const spacing = (VIEWBOX_HEIGHT - PADDING * 2 - GRID_SPACING * 2) / Math.max(1, line3.length - 1);
    
    line3.forEach((station, index) => {
      const layoutX = startX;
      const layoutY = startY + index * spacing;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      
      if (!stationMap.has(station.name)) {
        stationMap.set(station.name, layoutStation);
        layoutStations.push(layoutStation);
      } else {
        const existing = stationMap.get(station.name)!;
        existing.layoutX = (existing.layoutX + layoutX) / 2;
        existing.layoutY = (existing.layoutY + layoutY) / 2;
      }
    });
  }
  
  // 4호선: 수직선 (우측)
  const line4 = lineGroups.get('4') || [];
  if (line4.length > 0) {
    const startX = VIEWBOX_WIDTH - PADDING - GRID_SPACING;
    const startY = PADDING + GRID_SPACING * 2;
    const spacing = (VIEWBOX_HEIGHT - PADDING * 2 - GRID_SPACING * 2) / Math.max(1, line4.length - 1);
    
    line4.forEach((station, index) => {
      const layoutX = startX;
      const layoutY = startY + index * spacing;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      
      if (!stationMap.has(station.name)) {
        stationMap.set(station.name, layoutStation);
        layoutStations.push(layoutStation);
      } else {
        const existing = stationMap.get(station.name)!;
        existing.layoutX = (existing.layoutX + layoutX) / 2;
        existing.layoutY = (existing.layoutY + layoutY) / 2;
      }
    });
  }
  
  // 5호선: 대각선 (좌상->우하, 45도)
  const line5 = lineGroups.get('5') || [];
  if (line5.length > 0) {
    const startX = PADDING + GRID_SPACING * 2;
    const startY = PADDING + GRID_SPACING * 2;
    const endX = VIEWBOX_WIDTH - PADDING - GRID_SPACING * 2;
    const endY = VIEWBOX_HEIGHT - PADDING - GRID_SPACING * 2;
    const dx = (endX - startX) / Math.max(1, line5.length - 1);
    const dy = (endY - startY) / Math.max(1, line5.length - 1);
    
    line5.forEach((station, index) => {
      const layoutX = startX + index * dx;
      const layoutY = startY + index * dy;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      
      if (!stationMap.has(station.name)) {
        stationMap.set(station.name, layoutStation);
        layoutStations.push(layoutStation);
      } else {
        const existing = stationMap.get(station.name)!;
        existing.layoutX = (existing.layoutX + layoutX) / 2;
        existing.layoutY = (existing.layoutY + layoutY) / 2;
      }
    });
  }
  
  // 6호선: 수평선 (하단)
  const line6 = lineGroups.get('6') || [];
  if (line6.length > 0) {
    const startY = VIEWBOX_HEIGHT - PADDING - GRID_SPACING;
    const startX = PADDING;
    const spacing = (VIEWBOX_WIDTH - PADDING * 2) / Math.max(1, line6.length - 1);
    
    line6.forEach((station, index) => {
      const layoutX = startX + index * spacing;
      const layoutY = startY;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      
      if (!stationMap.has(station.name)) {
        stationMap.set(station.name, layoutStation);
        layoutStations.push(layoutStation);
      } else {
        const existing = stationMap.get(station.name)!;
        existing.layoutX = (existing.layoutX + layoutX) / 2;
        existing.layoutY = (existing.layoutY + layoutY) / 2;
      }
    });
  }
  
  // 7호선: 수직선 (중앙 좌측)
  const line7 = lineGroups.get('7') || [];
  if (line7.length > 0) {
    const startX = VIEWBOX_WIDTH / 2 - GRID_SPACING * 2;
    const startY = PADDING + GRID_SPACING * 2;
    const spacing = (VIEWBOX_HEIGHT - PADDING * 2 - GRID_SPACING * 2) / Math.max(1, line7.length - 1);
    
    line7.forEach((station, index) => {
      const layoutX = startX;
      const layoutY = startY + index * spacing;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      
      if (!stationMap.has(station.name)) {
        stationMap.set(station.name, layoutStation);
        layoutStations.push(layoutStation);
      } else {
        const existing = stationMap.get(station.name)!;
        existing.layoutX = (existing.layoutX + layoutX) / 2;
        existing.layoutY = (existing.layoutY + layoutY) / 2;
      }
    });
  }
  
  // 8호선: 대각선 (우상->좌하, 45도)
  const line8 = lineGroups.get('8') || [];
  if (line8.length > 0) {
    const startX = VIEWBOX_WIDTH - PADDING - GRID_SPACING * 2;
    const startY = PADDING + GRID_SPACING * 2;
    const endX = PADDING + GRID_SPACING * 2;
    const endY = VIEWBOX_HEIGHT - PADDING - GRID_SPACING * 2;
    const dx = (endX - startX) / Math.max(1, line8.length - 1);
    const dy = (endY - startY) / Math.max(1, line8.length - 1);
    
    line8.forEach((station, index) => {
      const layoutX = startX + index * dx;
      const layoutY = startY + index * dy;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      
      if (!stationMap.has(station.name)) {
        stationMap.set(station.name, layoutStation);
        layoutStations.push(layoutStation);
      } else {
        const existing = stationMap.get(station.name)!;
        existing.layoutX = (existing.layoutX + layoutX) / 2;
        existing.layoutY = (existing.layoutY + layoutY) / 2;
      }
    });
  }
  
  // 9호선: 수평선 (중앙)
  const line9 = lineGroups.get('9') || [];
  if (line9.length > 0) {
    const startY = VIEWBOX_HEIGHT / 2;
    const startX = PADDING;
    const spacing = (VIEWBOX_WIDTH - PADDING * 2) / Math.max(1, line9.length - 1);
    
    line9.forEach((station, index) => {
      const layoutX = startX + index * spacing;
      const layoutY = startY;
      const layoutStation: LayoutStation = { ...station, layoutX, layoutY };
      
      if (!stationMap.has(station.name)) {
        stationMap.set(station.name, layoutStation);
        layoutStations.push(layoutStation);
      } else {
        const existing = stationMap.get(station.name)!;
        existing.layoutX = (existing.layoutX + layoutX) / 2;
        existing.layoutY = (existing.layoutY + layoutY) / 2;
      }
    });
  }
  
  // 최종 역 목록 (중복 제거)
  const finalStations: LayoutStation[] = [];
  const seen = new Set<string>();
  
  layoutStations.forEach(station => {
    if (!seen.has(station.name)) {
      seen.add(station.name);
      finalStations.push(station);
    }
  });
  
  return finalStations;
}

// 노선별 역 순서 정렬
function sortStationsByLineOrder(stations: LayoutStation[], lineNum: string): LayoutStation[] {
  const sorted = [...stations];
  
  if (lineNum === '2') {
    // 순환선: 중심점 기준 각도 정렬
    const centerX = VIEWBOX_WIDTH / 2;
    const centerY = VIEWBOX_HEIGHT / 2;
    return sorted.sort((a, b) => {
      const angleA = Math.atan2(a.layoutY - centerY, a.layoutX - centerX);
      const angleB = Math.atan2(b.layoutY - centerY, b.layoutX - centerX);
      return angleA - angleB;
    });
  } else {
    // 수평/수직/대각선: 거리 기준 정렬
    return sorted.sort((a, b) => {
      const distA = Math.sqrt(a.layoutX ** 2 + a.layoutY ** 2);
      const distB = Math.sqrt(b.layoutX ** 2 + b.layoutY ** 2);
      return distA - distB;
    });
  }
}

export default function SchematicSubwayMap({ selectedLine, onStationSelect }: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutStations, setLayoutStations] = useState<LayoutStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<LayoutStation | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [stationDetail, setStationDetail] = useState<any>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [touchDistance, setTouchDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(1);

  // 역 데이터 로드 및 레이아웃 생성
  useEffect(() => {
    let filteredStations = selectedLine
      ? getStationsByLine(selectedLine)
      : STATION_DATA;
    
    // 전용 레이아웃 좌표 생성
    const layout = createSchematicLayout(filteredStations);
    setLayoutStations(layout);
  }, [selectedLine]);

  // 노선별 정렬된 역 목록
  const lineStationsMap = useMemo(() => {
    const map = new Map<string, LayoutStation[]>();
    const lines = ALL_LINE_IDS;
    
    lines.forEach(lineNum => {
      const lineStations = layoutStations.filter(s => s.lineNum === lineNum);
      if (lineStations.length > 0) {
        const sorted = sortStationsByLineOrder(lineStations, lineNum);
        map.set(lineNum, sorted);
      }
    });
    
    return map;
  }, [layoutStations]);

  // 역 클릭 핸들러
  const handleStationClick = async (station: LayoutStation) => {
    setSelectedStation(station);
    setLoading(true);
    
    try {
      const data = await getStationCongestion(station.name, station.lineNum);
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
    } finally {
      setLoading(false);
    }
  };

  // 줌/팬 핸들러
  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // PC 마우스 이벤트
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // preventDefault 제거: passive 이벤트 리스너 경고 방지
    // 줌 기능은 유지하되 기본 스크롤도 허용
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, [handleZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('circle')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 모바일 터치 이벤트
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setTouchDistance(distance);
      setInitialZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (touchDistance > 0) {
        const scale = distance / touchDistance;
        const newZoom = initialZoom * scale;
        setZoom(Math.max(0.5, Math.min(3, newZoom)));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setTouchDistance(0);
      
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
        handleZoom(0.5);
        setLastTap(0);
      } else {
        setLastTap(now);
      }
    }
  };

  // 라벨 표시 여부 (기본: 환승역과 주요 거점역만)
  const shouldShowLabel = (station: LayoutStation): boolean => {
    const isTransfer = station.transfer.length > 0;
    const isMajor = MAJOR_STATIONS.includes(station.name);
    
    // 기본: 환승역과 주요 거점역만
    if (zoom <= 1.0) {
      return isTransfer && isMajor;
    }
    
    // 줌인 시: 환승역 모두 표시
    if (zoom > 1.5) {
      return isTransfer;
    }
    
    return false;
  };

  // 호버/탭 시 툴팁 표시 여부
  const shouldShowTooltip = (station: LayoutStation): boolean => {
    return hoveredStation === station.id || selectedStation?.id === station.id;
  };

  // 노선 그리기 (순서대로, 수평/수직/45도만)
  const renderLines = () => {
    const lineElements: JSX.Element[] = [];
    
    lineStationsMap.forEach((lineStations, lineNum) => {
      if (lineStations.length < 2) return;
      
      // 지선/연장선은 얇고 흐리게
      const isBranch = lineNum === '7' || lineNum === '8' || lineNum === '9';
      const strokeWidth = isBranch ? 2 : 4;
      const opacity = isBranch ? 0.3 : 0.7;
      
      for (let i = 0; i < lineStations.length - 1; i++) {
        const from = lineStations[i];
        const to = lineStations[i + 1];
        
        lineElements.push(
          <line
            key={`line-${lineNum}-${i}`}
            x1={from.layoutX}
            y1={from.layoutY}
            x2={to.layoutX}
            y2={to.layoutY}
            stroke={getLineColor(lineNum)}
            strokeWidth={strokeWidth}
            opacity={opacity}
            className="transition-all duration-300"
          />
        );
      }
    });
    
    return lineElements;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#f5f7fb] dark:bg-gray-900 rounded-lg overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 줌 컨트롤 */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
        <button
          onClick={() => handleZoom(0.2)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* SVG 맵 */}
      <div
        className="w-full h-full overflow-hidden transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 노선 그리기 */}
          {renderLines()}

          {/* 역 표시 */}
          {layoutStations.map((station) => {
            const isTransfer = station.transfer.length > 0;
            const isHovered = hoveredStation === station.id;
            const isSelected = selectedStation?.id === station.id;
            const radius = isTransfer ? 5 : 3; // 환승역: 5px, 일반역: 3px
            const strokeWidth = isTransfer ? 2.5 : 1.5;
            const lineColor = getLineColor(station.lineNum);

            return (
              <g key={station.id}>
                {/* 역 원 */}
                <circle
                  cx={station.layoutX}
                  cy={station.layoutY}
                  r={radius}
                  fill={lineColor}
                  stroke="white"
                  strokeWidth={strokeWidth}
                  className="cursor-pointer transition-all duration-300 hover:scale-150"
                  onClick={() => handleStationClick(station)}
                  onMouseEnter={() => setHoveredStation(station.id)}
                  onMouseLeave={() => setHoveredStation(null)}
                />

                {/* 기본 라벨 (환승역과 주요 거점역만) */}
                {shouldShowLabel(station) && (
                  <g>
                    <rect
                      x={station.layoutX - (station.name.length * 4.5)}
                      y={station.layoutY - 16}
                      width={station.name.length * 9}
                      height={12}
                      fill="white"
                      fillOpacity="0.95"
                      rx="2"
                      stroke={lineColor}
                      strokeWidth="1.5"
                      className="pointer-events-none transition-all duration-300"
                    />
                    <text
                      x={station.layoutX}
                      y={station.layoutY - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#374151"
                      className="pointer-events-none transition-all duration-300"
                    >
                      {station.name}
                    </text>
                  </g>
                )}

                {/* 호버/탭 시 툴팁 (일반 역 이름) */}
                {shouldShowTooltip(station) && !shouldShowLabel(station) && (
                  <g>
                    <rect
                      x={station.layoutX - (station.name.length * 4)}
                      y={station.layoutY - 16}
                      width={station.name.length * 8}
                      height={12}
                      fill="#1f2937"
                      fillOpacity="0.9"
                      rx="2"
                      className="pointer-events-none transition-all duration-300"
                    />
                    <text
                      x={station.layoutX}
                      y={station.layoutY - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fill="white"
                      className="pointer-events-none transition-all duration-300"
                    >
                      {station.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 역 상세 정보 카드 (하단) */}
      {selectedStation && stationDetail && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-t-xl shadow-2xl z-20 max-h-[35vh] overflow-y-auto transition-all duration-300">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: getLineColor(selectedStation.lineNum) }}
                >
                  {selectedStation.lineNum}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedStation.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedStation.lineNum}호선
                    {selectedStation.transfer.length > 0 && ` · 환승: ${selectedStation.transfer.join(', ')}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStation(null);
                  setStationDetail(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">로딩 중...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {/* 현재 혼잡도 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">현재</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{ backgroundColor: stationDetail.congestion.color }}
                    />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {stationDetail.congestion.level}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {stationDetail.passengerCount.toLocaleString()}명
                      </div>
                    </div>
                  </div>
                </div>

                {/* 예상 혼잡도 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">10분 후</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-8 rounded-full opacity-70"
                      style={{
                        backgroundColor: calculateCongestionLevel(
                          stationDetail.predictedData.predictedPassengerCount
                        ).color,
                      }}
                    />
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {calculateCongestionLevel(
                          stationDetail.predictedData.predictedPassengerCount
                        ).level}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {stationDetail.predictedData.predictedPassengerCount.toLocaleString()}명
                      </div>
                    </div>
                  </div>
                </div>

                {/* 다음 열차 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Train className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">다음 열차</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    상행 2분
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    하행 4분
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 혼잡도 범례 (하단 좌측) */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg z-10">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          혼잡도
        </div>
        <div className="space-y-1">
          {[
            { level: '여유', color: '#4CAF50' },
            { level: '보통', color: '#FFC107' },
            { level: '혼잡', color: '#FF9800' },
            { level: '매우 혼잡', color: '#F44336' },
          ].map((item) => (
            <div key={item.level} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">{item.level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 안내 문구 (하단 중앙, 선택된 역이 없을 때만) */}
      {!selectedStation && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-lg z-10">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            역을 클릭하면 상세 정보 확인
          </p>
        </div>
      )}
    </div>
  );
}
