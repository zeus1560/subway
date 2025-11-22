'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Clock, MapPin, Train } from 'lucide-react';
import { STATION_DATA, Station, getStationsByLine } from '@/lib/stationData';
import { getStationCongestion, calculateCongestionLevel, predictCongestion } from '@/lib/api';
import { getLineColor } from '@/lib/utils';

interface MapProps {
  selectedLine?: string;
  onStationSelect?: (station: Station) => void;
  onLineChange?: (line: string) => void;
}

// SVG viewBox 설정
const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 900;
const GRID_SPACING = 80;
const PADDING = 100;

// 전용 레이아웃 좌표 정의
interface LayoutStation extends Station {
  layoutX: number;
  layoutY: number;
}

// 스키마틱 레이아웃 생성: 수평/수직/45도 위주의 단순한 경로
function createSchematicLayout(stations: Station[]): LayoutStation[] {
  const layoutStations: LayoutStation[] = [];
  const stationMap = new Map<string, LayoutStation>();
  
  const lines = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
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
  
  // 2호선: 순환선 (중앙, 원형)
  const line2 = lineGroups.get('2') || [];
  if (line2.length > 0) {
    const centerX = VIEWBOX_WIDTH / 2;
    const centerY = VIEWBOX_HEIGHT / 2;
    const radius = 180;
    const angleStep = (Math.PI * 2) / line2.length;
    
    line2.forEach((station, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const layoutX = centerX + Math.cos(angle) * radius;
      const layoutY = centerY + Math.sin(angle) * radius;
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
    const centerX = VIEWBOX_WIDTH / 2;
    const centerY = VIEWBOX_HEIGHT / 2;
    return sorted.sort((a, b) => {
      const angleA = Math.atan2(a.layoutY - centerY, a.layoutX - centerX);
      const angleB = Math.atan2(b.layoutY - centerY, b.layoutX - centerX);
      return angleA - angleB;
    });
  } else {
    return sorted.sort((a, b) => {
      const distA = Math.sqrt(a.layoutX ** 2 + a.layoutY ** 2);
      const distB = Math.sqrt(b.layoutX ** 2 + b.layoutY ** 2);
      return distA - distB;
    });
  }
}

export default function RedesignedSubwayMap({ selectedLine, onStationSelect, onLineChange }: MapProps) {
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
  const [activeLine, setActiveLine] = useState<string>(selectedLine || '1');

  // 노선 목록
  const availableLines = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // 역 데이터 로드 및 레이아웃 생성
  useEffect(() => {
    const layout = createSchematicLayout(STATION_DATA);
    setLayoutStations(layout);
  }, []);

  // 선택된 노선 변경 시 중앙 정렬 및 스케일 조정
  useEffect(() => {
    const lineStations = layoutStations.filter(s => s.lineNum === activeLine);
    if (lineStations.length > 0) {
      // 선택된 노선의 바운드 계산
      const bounds = {
        minX: Math.min(...lineStations.map(s => s.layoutX)),
        maxX: Math.max(...lineStations.map(s => s.layoutX)),
        minY: Math.min(...lineStations.map(s => s.layoutY)),
        maxY: Math.max(...lineStations.map(s => s.layoutY)),
      };
      
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      // 컨테이너 크기 (대략적인 값)
      const containerWidth = VIEWBOX_WIDTH;
      const containerHeight = VIEWBOX_HEIGHT;
      
      // 스케일 계산 (여백 20% 포함)
      const scaleX = (containerWidth * 0.8) / Math.max(width, 50);
      const scaleY = (containerHeight * 0.8) / Math.max(height, 50);
      let scale = Math.min(scaleX, scaleY);
      
      // 스케일을 1.5~2.0 범위로 클램핑하여 적절한 배율 유지
      const MIN_SCALE = 1.5;
      const MAX_SCALE = 2.0;
      scale = Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));
      
      // 중앙 정렬을 위한 팬 계산
      const targetX = containerWidth / 2 - centerX * scale;
      const targetY = containerHeight / 2 - centerY * scale;
      
      setZoom(scale);
      setPan({ x: targetX, y: targetY });
    }
  }, [activeLine, layoutStations]);

  // 노선별 정렬된 역 목록
  const lineStationsMap = useMemo(() => {
    const map = new Map<string, LayoutStation[]>();
    
    availableLines.forEach(lineNum => {
      const lineStations = layoutStations.filter(s => s.lineNum === lineNum);
      if (lineStations.length > 0) {
        const sorted = sortStationsByLineOrder(lineStations, lineNum);
        map.set(lineNum, sorted);
      }
    });
    
    return map;
  }, [layoutStations, availableLines]);

  // 노선 선택 핸들러
  const handleLineSelect = (line: string) => {
    setActiveLine(line);
    if (onLineChange) {
      onLineChange(line);
    }
  };

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
    setZoom((prev) => Math.max(0.3, Math.min(5, prev + delta)));
  }, []);

  const handleReset = () => {
    const lineStations = layoutStations.filter(s => s.lineNum === activeLine);
    if (lineStations.length > 0) {
      const bounds = {
        minX: Math.min(...lineStations.map(s => s.layoutX)),
        maxX: Math.max(...lineStations.map(s => s.layoutX)),
        minY: Math.min(...lineStations.map(s => s.layoutY)),
        maxY: Math.max(...lineStations.map(s => s.layoutY)),
      };
      
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      const containerWidth = VIEWBOX_WIDTH;
      const containerHeight = VIEWBOX_HEIGHT;
      
      const scaleX = (containerWidth * 0.8) / Math.max(width, 50);
      const scaleY = (containerHeight * 0.8) / Math.max(height, 50);
      let scale = Math.min(scaleX, scaleY);
      
      // 스케일을 1.5~2.0 범위로 클램핑하여 적절한 배율 유지
      const MIN_SCALE = 1.5;
      const MAX_SCALE = 2.0;
      scale = Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));
      
      const targetX = containerWidth / 2 - centerX * scale;
      const targetY = containerHeight / 2 - centerY * scale;
      
      setZoom(scale);
      setPan({ x: targetX, y: targetY });
    }
  };

  // PC 마우스 이벤트
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, [handleZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('circle, g, text, rect, button')) {
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
        setZoom(Math.max(0.3, Math.min(5, newZoom)));
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

  // 라벨 표시 여부 결정 (항상 모든 라벨 표시)
  const shouldShowLabel = (station: LayoutStation): boolean => {
    // 현재 선택된 노선의 모든 역 라벨 표시
    return activeLine === station.lineNum;
  };

  // 노선 그리기
  const renderLines = () => {
    const lineElements: JSX.Element[] = [];
    
    const selectedLineStations = lineStationsMap.get(activeLine);
    if (!selectedLineStations || selectedLineStations.length < 2) {
      return lineElements;
    }
    
    // 선택된 노선만 그리기
    const strokeWidth = 6;
    const opacity = 1;
    const color = getLineColor(activeLine);
    
    for (let i = 0; i < selectedLineStations.length - 1; i++) {
      const from = selectedLineStations[i];
      const to = selectedLineStations[i + 1];
      
      lineElements.push(
        <line
          key={`line-${activeLine}-${i}`}
          x1={from.layoutX}
          y1={from.layoutY}
          x2={to.layoutX}
          y2={to.layoutY}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          className="transition-all duration-300"
        />
      );
    }
    
    return lineElements;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#f5f7fb] dark:bg-gray-950 rounded-lg overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 노선 탭 선택 */}
      <div className="absolute top-3 left-3 right-3 z-20 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {availableLines.map((lineNum) => (
          <button
            key={lineNum}
            onClick={() => handleLineSelect(lineNum)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeLine === lineNum
                ? 'text-white shadow-md scale-105'
                : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm'
            }`}
            style={{
              backgroundColor: activeLine === lineNum ? getLineColor(lineNum) : undefined,
            }}
          >
            {lineNum}호선
          </button>
        ))}
      </div>

      {/* 줌 컨트롤 */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-lg p-1.5 border border-gray-200/50 dark:border-gray-700/50">
        <button
          onClick={() => handleZoom(0.2)}
          className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95"
          aria-label="확대"
        >
          <ZoomIn className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95"
          aria-label="축소"
        >
          <ZoomOut className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onClick={handleReset}
          className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95"
          aria-label="리셋"
        >
          <RotateCcw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
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
          {layoutStations
            .filter(station => station.lineNum === activeLine)
            .map((station) => {
            const isTransfer = station.transfer.length > 0;
            const isHovered = hoveredStation === station.id;
            const isSelected = selectedStation?.id === station.id;
            
            // 선택된 노선의 모든 역 표시
            const radius = isTransfer ? 6 : 4;
            const strokeWidth = isTransfer ? 2.5 : 2;
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
                  className={`cursor-pointer transition-all duration-200 ${
                    isHovered || isSelected ? 'scale-150 drop-shadow-lg' : 'hover:scale-125'
                  }`}
                  onClick={() => handleStationClick(station)}
                  onMouseEnter={() => setHoveredStation(station.id)}
                  onMouseLeave={() => setHoveredStation(null)}
                  style={{
                    filter: isHovered || isSelected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : undefined,
                  }}
                />

                {/* 라벨 (pill 형태) - 항상 표시 */}
                {shouldShowLabel(station) && (
                  <g>
                    <rect
                      x={station.layoutX - (station.name.length * 5)}
                      y={station.layoutY - 9}
                      width={station.name.length * 10}
                      height={18}
                      fill="white"
                      fillOpacity="0.98"
                      rx="9"
                      stroke={lineColor}
                      strokeWidth={isTransfer ? 2.5 : 2}
                      className="pointer-events-none transition-all duration-200"
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                      }}
                    />
                    <text
                      x={station.layoutX}
                      y={station.layoutY + 5}
                      textAnchor="middle"
                      fontSize={isTransfer ? 12 : 11}
                      fontWeight={isTransfer ? 'bold' : '600'}
                      fill="#1f2937"
                      className="pointer-events-none transition-all duration-200"
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }}
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
        <div className="absolute bottom-0 left-0 right-0 bg-white/98 dark:bg-gray-900/98 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-700/80 rounded-t-2xl shadow-2xl z-20 max-h-[40vh] overflow-y-auto transition-all duration-300">
          <div className="container mx-auto px-5 py-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  style={{ backgroundColor: getLineColor(selectedStation.lineNum) }}
                >
                  {selectedStation.lineNum}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedStation.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors active:scale-95"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">로딩 중...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
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
          </div>
        </div>
      )}
    </div>
  );
}
