'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ZoomIn, ZoomOut, RotateCcw, X, Star, MapPin, Clock, ArrowRight, Train } from 'lucide-react';
import { STATION_DATA, Station, getStationsByLine } from '@/lib/stationData';
import { getStationCongestion, calculateCongestionLevel, predictCongestion } from '@/lib/api';
import { getLineColor } from '@/lib/utils';
import { saveFavoriteStation, getFavoriteStations, removeFavoriteStation } from '@/lib/storage';

interface MapProps {
  selectedLine?: string;
}

// SVG viewBox 설정
const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 800;
const PADDING = 80; // 상하좌우 패딩

// 주요 환승역 목록 (기본 줌에서만 표시 - 더 제한적으로)
const MAJOR_TRANSFER_STATIONS = [
  '서울역', '시청', '종로3가', '동대문역사문화공원', '왕십리',
  '강남', '사당', '홍대입구', '을지로입구', '고속터미널', '건대입구', '잠실'
];

// 정규화된 좌표를 포함한 확장 Station 타입
interface NormalizedStation extends Station {
  normalizedX: number;
  normalizedY: number;
}

// 좌표 정규화 함수 (0~1 범위로)
function normalizeCoordinates(stations: Station[]): NormalizedStation[] {
  if (stations.length === 0) return [];
  
  // 모든 역의 x, y 좌표 추출
  const xs = stations.map(s => s.x);
  const ys = stations.map(s => s.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  
  // 0~1로 정규화
  const normalized = stations.map(station => ({
    ...station,
    normalizedX: (station.x - minX) / rangeX,
    normalizedY: (station.y - minY) / rangeY,
  }));
  
  return normalized;
}

// 정규화된 좌표를 SVG 좌표로 변환 (비율 유지)
function normalizedToSvg(
  normalized: NormalizedStation[],
  targetWidth: number = VIEWBOX_WIDTH - PADDING * 2,
  targetHeight: number = VIEWBOX_HEIGHT - PADDING * 2
): Station[] {
  // 가로/세로 비율 계산
  const normalizedAspect = 1; // 정규화된 좌표는 1:1
  const targetAspect = targetWidth / targetHeight;
  
  let scaleX: number, scaleY: number, offsetX: number, offsetY: number;
  
  if (normalizedAspect > targetAspect) {
    // 가로가 더 넓음 - 가로 기준으로 스케일링
    scaleX = targetWidth;
    scaleY = targetWidth / normalizedAspect;
    offsetX = PADDING;
    offsetY = PADDING + (targetHeight - scaleY) / 2;
  } else {
    // 세로가 더 넓음 - 세로 기준으로 스케일링
    scaleX = targetHeight * normalizedAspect;
    scaleY = targetHeight;
    offsetX = PADDING + (targetWidth - scaleX) / 2;
    offsetY = PADDING;
  }
  
  return normalized.map(station => ({
    ...station,
    x: station.normalizedX * scaleX + offsetX,
    y: station.normalizedY * scaleY + offsetY,
  }));
}

// 노선 경로 단순화 (수평/수직/45도 방향 유지) - 더 강력한 단순화
function simplifyLinePath(stations: Station[]): Station[] {
  if (stations.length < 2) return stations;
  
  const simplified: Station[] = [stations[0]];
  
  for (let i = 1; i < stations.length; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = stations[i];
    
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const angle = Math.atan2(dy, dx);
    
    // 가장 가까운 수평/수직/45도 각도로 정렬
    const normalizedAngle = angle / (Math.PI / 4);
    const roundedAngle = Math.round(normalizedAngle) * (Math.PI / 4);
    
    const distance = Math.sqrt(dx ** 2 + dy ** 2);
    
    // 최소 거리 보장 (역 간격 최소화)
    const minDistance = 40;
    const adjustedDistance = Math.max(distance, minDistance);
    
    const newX = prev.x + Math.cos(roundedAngle) * adjustedDistance;
    const newY = prev.y + Math.sin(roundedAngle) * adjustedDistance;
    
    simplified.push({ ...curr, x: newX, y: newY });
  }
  
  return simplified;
}

// 같은 역을 공유하는 노선의 선 오프셋 계산
function calculateLineOffset(lineNum: string, stationName: string, allStations: Station[]): number {
  // 같은 역을 지나는 노선 개수 확인
  const sameStationLines = allStations
    .filter(s => s.name === stationName)
    .map(s => s.lineNum);
  
  const lineIndex = sameStationLines.indexOf(lineNum);
  const totalLines = sameStationLines.length;
  
  if (totalLines <= 1) return 0;
  
  // -3px ~ +3px 범위로 오프셋 분산
  const offsetRange = 3;
  const step = (offsetRange * 2) / (totalLines - 1);
  return -offsetRange + lineIndex * step;
}

// 라벨 겹침 감지 및 위치 조정
interface LabelPosition {
  station: Station;
  x: number;
  y: number;
  priority: number;
}

function adjustLabelPositions(
  stations: Station[],
  zoom: number,
  showAllLabels: boolean
): LabelPosition[] {
  const labels: LabelPosition[] = [];
  
  stations.forEach(station => {
    const isTransfer = station.transfer.length > 0;
    const isMajor = MAJOR_TRANSFER_STATIONS.includes(station.name);
    
    // 표시 조건을 더 엄격하게: 줌이 2.5 이상이거나, 주요 환승역만 (줌 1.5 이상)
    if (showAllLabels || zoom > 2.5 || (isMajor && zoom > 1.5)) {
      labels.push({
        station,
        x: station.x,
        y: station.y - 20, // 기본 위치 (역 위쪽, 더 멀리)
        priority: isMajor ? 1 : (isTransfer ? 2 : 3),
      });
    }
  });
  
  // 겹침 방지 알고리즘 개선
  const adjusted: LabelPosition[] = [];
  const minDistance = zoom > 2 ? 50 : 60; // 줌에 따라 최소 라벨 간격 증가
  
  labels.sort((a, b) => a.priority - b.priority); // 우선순위 정렬
  
  labels.forEach(label => {
    let adjustedX = label.x;
    let adjustedY = label.y;
    let attempts = 0;
    const maxAttempts = 12; // 시도 횟수 증가
    
    // 12방향으로 위치 조정 시도 (더 넓은 범위)
    const directions = [
      [0, -25], [0, 25], [-40, 0], [40, 0],
      [-30, -30], [30, -30], [-30, 30], [30, 30],
      [-20, -40], [20, -40], [-20, 40], [20, 40]
    ];
    
    while (attempts < maxAttempts) {
      let hasCollision = false;
      
      for (const existing of adjusted) {
        const dx = adjustedX - existing.x;
        const dy = adjustedY - existing.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        
        if (distance < minDistance) {
          hasCollision = true;
          break;
        }
      }
      
      if (!hasCollision) break;
      
      // 다음 위치 시도
      const [dx, dy] = directions[attempts % directions.length];
      adjustedX = label.x + dx;
      adjustedY = label.y + dy;
      attempts++;
    }
    
    // 충돌이 계속되면 우선순위가 낮은 라벨 숨김 (더 엄격하게)
    if (attempts >= maxAttempts && label.priority > 1) {
      return; // 이 라벨은 표시하지 않음
    }
    
    adjusted.push({ ...label, x: adjustedX, y: adjustedY });
  });
  
  return adjusted;
}

export default function CleanSubwayMap({ selectedLine }: MapProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [congestionData, setCongestionData] = useState<Record<string, any>>({});
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [favorites, setFavorites] = useState<any[]>([]);
  const [stationDetail, setStationDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [touchDistance, setTouchDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(1);
  const [showAllLabels, setShowAllLabels] = useState(false);

  // 좌표 정규화 및 SVG 변환
  useEffect(() => {
    let filteredStations = selectedLine
      ? getStationsByLine(selectedLine)
      : STATION_DATA;
    
    // 1. 좌표 정규화
    const normalized = normalizeCoordinates(filteredStations);
    
    // 2. SVG 좌표로 변환 (비율 유지)
    const svgStations = normalizedToSvg(normalized);
    
    // 3. 노선별 경로 단순화
    const lines = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '신분당', '수인분당', '경의중앙', '공항철도'];
    const simplifiedStations: Station[] = [];
    
    lines.forEach(lineNum => {
      const lineStations = svgStations.filter(s => s.lineNum === lineNum);
      if (lineStations.length > 0) {
        const simplified = simplifyLinePath(lineStations);
        simplifiedStations.push(...simplified);
      }
    });
    
    // 같은 역을 공유하는 경우 위치 통일
    const stationMap = new Map<string, Station>();
    simplifiedStations.forEach(station => {
      const key = station.name;
      if (!stationMap.has(key)) {
        stationMap.set(key, station);
      } else {
        // 평균 위치 계산
        const existing = stationMap.get(key)!;
        const avgX = (existing.x + station.x) / 2;
        const avgY = (existing.y + station.y) / 2;
        stationMap.set(key, { ...existing, x: avgX, y: avgY });
      }
    });
    
    // 최종 역 목록 생성 (같은 역은 하나로 통합)
    const finalStations: Station[] = [];
    simplifiedStations.forEach(station => {
      const unified = stationMap.get(station.name)!;
      finalStations.push({
        ...station,
        x: unified.x,
        y: unified.y,
      });
    });
    
    setStations(finalStations);
    loadCongestionData(finalStations);
    loadFavorites();
  }, [selectedLine]);

  const loadCongestionData = async (stationList: Station[]) => {
    setLoading(true);
    try {
      const promises = stationList.slice(0, 50).map(async (station) => {
        try {
          const data = await getStationCongestion(station.name, station.lineNum);
          const passengerCount = data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
          return { stationId: station.id, passengerCount };
        } catch (error) {
          return { stationId: station.id, passengerCount: 500 };
        }
      });

      const results = await Promise.all(promises);
      const dataMap: Record<string, any> = {};
      results.forEach((result) => {
        dataMap[result.stationId] = result.passengerCount;
      });
      setCongestionData(dataMap);
    } catch (error) {
      console.error('혼잡도 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    const favs = getFavoriteStations();
    setFavorites(favs);
  };

  const handleStationClick = async (station: Station) => {
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
    } catch (error) {
      console.error('역 상세 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => {
      const newZoom = Math.max(0.3, Math.min(5, prev + delta));
      // 줌이 2.5 이상이면 모든 라벨 표시 (더 엄격하게)
      if (newZoom >= 2.5) {
        setShowAllLabels(true);
      } else if (newZoom < 2.0) {
        setShowAllLabels(false);
      }
      return newZoom;
    });
  }, []);

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setShowAllLabels(false);
  };

  // PC 마우스 휠 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, [handleZoom]);

  // PC 마우스 드래그
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('circle, g, text, rect')) {
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

  // 모바일 터치 제스처
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
        const clampedZoom = Math.max(0.3, Math.min(5, newZoom));
        setZoom(clampedZoom);
        if (clampedZoom >= 2.5) {
          setShowAllLabels(true);
        } else if (clampedZoom < 2.0) {
          setShowAllLabels(false);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setTouchDistance(0);
      
      // 더블탭 감지
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

  const toggleFavorite = async (station: Station) => {
    const isFavorite = favorites.some(
      (fav) => fav.stationName === station.name && fav.lineNum === station.lineNum
    );

    if (isFavorite) {
      await removeFavoriteStation({ stationName: station.name, lineNum: station.lineNum });
    } else {
      await saveFavoriteStation({ stationName: station.name, lineNum: station.lineNum });
    }
    loadFavorites();
  };

  const getCongestionColor = (stationId: string): string => {
    const passengerCount = congestionData[stationId] || 500;
    const congestion = calculateCongestionLevel(passengerCount);
    return congestion.color;
  };

  // 라벨 위치 계산
  const labelPositions = useMemo(() => {
    return adjustLabelPositions(stations, zoom, showAllLabels);
  }, [stations, zoom, showAllLabels]);

  // 노선 그리기 (평행 오프셋 적용)
  const renderLines = () => {
    const lines = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '신분당', '수인분당', '경의중앙', '공항철도'];
    const lineElements: JSX.Element[] = [];

    lines.forEach((lineNum) => {
      const lineStations = stations
        .filter((s) => s.lineNum === lineNum)
        .sort((a, b) => {
          // 간단한 정렬
          const distA = Math.sqrt(a.x ** 2 + a.y ** 2);
          const distB = Math.sqrt(b.x ** 2 + b.y ** 2);
          return distA - distB;
        });

      lineStations.forEach((station, index) => {
        if (index === 0) return;
        const prevStation = lineStations[index - 1];
        
        // 평행 오프셋 계산
        const dx = station.x - prevStation.x;
        const dy = station.y - prevStation.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        const angle = Math.atan2(dy, dx);
        const perpAngle = angle + Math.PI / 2;
        
        const offset = calculateLineOffset(lineNum, station.name, stations);
        const offsetX = Math.cos(perpAngle) * offset;
        const offsetY = Math.sin(perpAngle) * offset;
        
        lineElements.push(
          <line
            key={`line-${lineNum}-${index}`}
            x1={prevStation.x + offsetX}
            y1={prevStation.y + offsetY}
            x2={station.x + offsetX}
            y2={station.y + offsetY}
            stroke={getLineColor(lineNum)}
            strokeWidth={Math.max(2, 3 / zoom)}
            opacity={0.6}
            className="transition-all duration-300"
          />
        );
      });
    });

    return lineElements;
  };

  // viewBox 계산
  const viewBox = useMemo(() => {
    if (stations.length === 0) return `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`;
    
    const xs = stations.map(s => s.x);
    const ys = stations.map(s => s.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    
    return `${minX - padding} ${minY - padding} ${width} ${height}`;
  }, [stations]);

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
          viewBox={viewBox}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 노선 그리기 */}
          {renderLines()}

          {/* 역 표시 */}
          {stations.map((station) => {
            const color = getCongestionColor(station.id);
            const isHovered = hoveredStation === station.id;
            const isSelected = selectedStation?.id === station.id;
            const isFavorite = favorites.some(
              (fav) => fav.stationName === station.name && fav.lineNum === station.lineNum
            );
            const isTransfer = station.transfer.length > 0;
            const stationRadius = isTransfer ? 6 : 4;
            const strokeWidth = isTransfer ? 3 : 2;

            return (
              <g key={station.id}>
                {/* 역 원 */}
                <circle
                  cx={station.x}
                  cy={station.y}
                  r={stationRadius / zoom}
                  fill={color}
                  stroke="white"
                  strokeWidth={strokeWidth / zoom}
                  className="cursor-pointer transition-all duration-300 hover:scale-125"
                  onClick={() => handleStationClick(station)}
                  onMouseEnter={() => setHoveredStation(station.id)}
                  onMouseLeave={() => setHoveredStation(null)}
                />
                
                {/* 즐겨찾기 표시 */}
                {isFavorite && (
                  <text
                    x={station.x}
                    y={station.y - 12 / zoom}
                    textAnchor="middle"
                    fontSize={12 / zoom}
                    fill="#FFD700"
                    className="pointer-events-none"
                  >
                    ★
                  </text>
                )}
              </g>
            );
          })}

          {/* 역 이름 라벨 - 호버/선택 시에만 표시하거나 주요 역만 */}
          {(hoveredStation || selectedStation) && (
            <g>
              {stations
                .filter(s => s.id === hoveredStation || s.id === selectedStation?.id)
                .map((station) => {
                  const isTransfer = station.transfer.length > 0;
                  const fontSize = isTransfer ? 14 / zoom : 12 / zoom;
                  
                  return (
                    <g key={`hover-label-${station.id}`}>
                      <rect
                        x={station.x - (station.name.length * fontSize * 0.35)}
                        y={station.y - fontSize * 0.7 - 20}
                        width={station.name.length * fontSize * 0.7}
                        height={fontSize * 1.2}
                        fill="white"
                        fillOpacity="0.95"
                        rx={4 / zoom}
                        stroke={getLineColor(station.lineNum)}
                        strokeWidth={isTransfer ? 2 / zoom : 1 / zoom}
                        className="pointer-events-none transition-all duration-300"
                      />
                      <text
                        x={station.x}
                        y={station.y - 20}
                        textAnchor="middle"
                        fontSize={fontSize}
                        fontWeight={isTransfer ? 'bold' : 'normal'}
                        fill="#1f2937"
                        className="pointer-events-none transition-all duration-300"
                      >
                        {station.name}
                      </text>
                    </g>
                  );
                })}
            </g>
          )}
          
          {/* 기본 라벨 (주요 환승역만, 줌 1.5 이상) */}
          {labelPositions.map((label, index) => {
            const station = label.station;
            const isTransfer = station.transfer.length > 0;
            const fontSize = isTransfer ? 14 / zoom : 12 / zoom;

            return (
              <g key={`label-${station.id}-${index}`}>
                <rect
                  x={label.x - (station.name.length * fontSize * 0.35)}
                  y={label.y - fontSize * 0.7}
                  width={station.name.length * fontSize * 0.7}
                  height={fontSize * 1.2}
                  fill="white"
                  fillOpacity="0.95"
                  rx={4 / zoom}
                  stroke={getLineColor(station.lineNum)}
                  strokeWidth={isTransfer ? 2 / zoom : 1 / zoom}
                  className="pointer-events-none transition-all duration-300"
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fontWeight={isTransfer ? 'bold' : 'normal'}
                  fill="#1f2937"
                  className="pointer-events-none transition-all duration-300"
                >
                  {station.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 역 상세 정보 패널 (우측 또는 하단) */}
      {selectedStation && stationDetail && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-t-xl shadow-2xl z-20 max-h-[60vh] overflow-y-auto transition-all duration-300">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: getLineColor(selectedStation.lineNum) }}
                >
                  {selectedStation.lineNum}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedStation.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedStation.lineNum}호선
                    {selectedStation.transfer.length > 0 && ` · 환승: ${selectedStation.transfer.join(', ')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(selectedStation)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <Star
                    className={`w-6 h-6 ${
                      favorites.some(
                        (fav) =>
                          fav.stationName === selectedStation.name &&
                          fav.lineNum === selectedStation.lineNum
                      )
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-400'
                    }`}
                  />
                </button>
                <button
                  onClick={() => {
                    setSelectedStation(null);
                    setStationDetail(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 현재 혼잡도 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      현재 혼잡도
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-3 h-16 rounded-full"
                      style={{ backgroundColor: stationDetail.congestion.color }}
                    />
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stationDetail.congestion.level}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {stationDetail.passengerCount.toLocaleString()}명
                      </div>
                    </div>
                  </div>
                </div>

                {/* 예상 혼잡도 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      10분 후 예상
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-3 h-16 rounded-full opacity-70"
                      style={{
                        backgroundColor: calculateCongestionLevel(
                          stationDetail.predictedData.predictedPassengerCount
                        ).color,
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {calculateCongestionLevel(
                          stationDetail.predictedData.predictedPassengerCount
                        ).level}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {stationDetail.predictedData.predictedPassengerCount.toLocaleString()}명
                      </div>
                    </div>
                  </div>
                </div>

                {/* 열차 정보 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Train className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      다음 열차
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    상행: 2분 후 · 하행: 4분 후
                  </div>
                </div>

                {/* 상세 보기 버튼 */}
                <button
                  onClick={() =>
                    router.push(
                      `/stations/${encodeURIComponent(`${selectedStation.name}_${selectedStation.lineNum}`)}`
                    )
                  }
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span>상세 정보 보기</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 범례 */}
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
    </div>
  );
}

