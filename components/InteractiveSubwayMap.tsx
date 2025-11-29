'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Clock, MapPin, Train, ChevronLeft, ChevronRight, ArrowUp } from 'lucide-react';
import { STATIONS, LINES, LINE_COLORS, LineId, Station } from '@/lib/subwayMapData';
import { getStationCongestion, calculateCongestionLevel, predictCongestion } from '@/lib/api';

interface MapProps {
  selectedLine?: string;
  onStationSelect?: (station: Station) => void;
  onLineChange?: (line: string) => void;
  lineColorMap?: Record<LineId, string>; // props로 색상 맵 주입 가능
}

// 기본 색상 맵 (LINE_COLORS를 기반으로)
const DEFAULT_LINE_COLOR_MAP: Record<LineId, string> = LINE_COLORS;

// 기본 색상 (fallback)
const DEFAULT_COLOR = "#666666";

// SVG viewBox 설정 (동적으로 계산)
const calculateViewBox = () => {
  const allStations = STATIONS;
  if (allStations.length === 0) return { width: 1200, height: 800 };
  
  const minX = Math.min(...allStations.map(s => s.layoutX));
  const maxX = Math.max(...allStations.map(s => s.layoutX));
  const minY = Math.min(...allStations.map(s => s.layoutY));
  const maxY = Math.max(...allStations.map(s => s.layoutY));
  
  const padding = 150; // 텍스트가 경계 밖으로 나가지 않도록 padding 증가 (50 → 150)
  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    minX: minX - padding,
    minY: minY - padding,
  };
};

const viewBoxConfig = calculateViewBox();
const VIEWBOX_WIDTH = viewBoxConfig.width;
const VIEWBOX_HEIGHT = viewBoxConfig.height;


export default function InteractiveSubwayMap({ 
  selectedLine, 
  onStationSelect, 
  onLineChange,
  lineColorMap = DEFAULT_LINE_COLOR_MAP 
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [stationDetail, setStationDetail] = useState<any>(null);
  // 초기 화면을 1호선 중앙에 맞춘 상태로 설정 (현재 보이는 위치)
  // 1호선의 중앙 좌표: layoutX 1200 (구로와 신도림 사이), layoutY 150
  // 현재 보이는 상태를 초기값으로 설정
  const [zoom, setZoom] = useState(1.5); // 현재 보이는 줌 레벨
  const [pan, setPan] = useState({ x: 0, y: 0 }); // 초기값은 useEffect에서 설정됨
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [touchDistance, setTouchDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(1);
  const [activeLine, setActiveLine] = useState<LineId>(selectedLine as LineId || '1');
  const [showDetailSlide, setShowDetailSlide] = useState(false);
  const [clickStartPos, setClickStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [nearbyStations, setNearbyStations] = useState<Station[]>([]);

  // 노선 선택 핸들러
  const handleLineSelect = useCallback((line: LineId) => {
    setActiveLine(line);
    if (onLineChange) {
      onLineChange(line);
    }
  }, [onLineChange]);

  // 필터링된 데이터 가져오기 (노선과 역)
  const getVisibleData = useCallback((selectedLine: LineId) => {
    // 선택된 노선 찾기
    const selectedLineObj = LINES.find(line => line.id === selectedLine);
    if (!selectedLineObj) {
      return {
        lines: [],
        stations: [],
      };
    }
    
    // 선택된 노선만
    const visibleLines = [selectedLineObj];
    
    // 선택된 노선의 stationIds에 포함된 역만 필터링
    const stationIdSet = new Set(selectedLineObj.stationIds);
    const visibleStations = STATIONS.filter(station => stationIdSet.has(station.id));
    
    return {
      lines: visibleLines,
      stations: visibleStations,
    };
  }, []);

  // 역 목록에 대한 transform 계산 (bounding box 기반, 노선을 화면 중앙에 정확히 배치)
  const getTransformForStations = useCallback((stations: Station[]) => {
    if (stations.length === 0) {
      return { scale: 1.5, translateX: 0, translateY: 0 };
    }
    
    // 실제 컨테이너 크기 가져오기
    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;
    
    // Bounding box 계산 (viewBox 좌표계)
    const minX = Math.min(...stations.map(s => s.layoutX));
    const maxX = Math.max(...stations.map(s => s.layoutX));
    const minY = Math.min(...stations.map(s => s.layoutY));
    const maxY = Math.max(...stations.map(s => s.layoutY));
    
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // viewBox 좌표를 실제 픽셀 좌표로 변환하는 비율 계산
    // SVG는 preserveAspectRatio="xMidYMid meet"로 설정되어 있으므로
    // viewBox가 컨테이너에 맞춰 스케일됩니다
    const viewBoxAspect = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;
    const containerAspect = containerWidth / containerHeight;
    
    let viewBoxToPixelX: number;
    let viewBoxToPixelY: number;
    
    if (viewBoxAspect > containerAspect) {
      // viewBox가 더 넓음 - 컨테이너 너비에 맞춤
      viewBoxToPixelX = containerWidth / VIEWBOX_WIDTH;
      viewBoxToPixelY = viewBoxToPixelX; // preserveAspectRatio로 인해 동일
    } else {
      // viewBox가 더 높음 - 컨테이너 높이에 맞춤
      viewBoxToPixelY = containerHeight / VIEWBOX_HEIGHT;
      viewBoxToPixelX = viewBoxToPixelY; // preserveAspectRatio로 인해 동일
    }
    
    // 여백 15% 포함하여 스케일 계산
    const padding = 0.15;
    const availableWidth = containerWidth * (1 - padding * 2);
    const availableHeight = containerHeight * (1 - padding * 2);
    
    const scaleX = availableWidth / (width * viewBoxToPixelX);
    const scaleY = availableHeight / (height * viewBoxToPixelY);
    let scale = Math.min(scaleX, scaleY);
    
    // 스케일을 1.2~1.8 범위로 조정
    const MIN_SCALE = 1.2;
    const MAX_SCALE = 1.8;
    scale = Math.max(MIN_SCALE, Math.min(scale, MAX_SCALE));
    
    // viewBox 좌표를 픽셀 좌표로 변환
    const centerXPixel = (centerX - (viewBoxConfig.minX ?? 0)) * viewBoxToPixelX;
    const centerYPixel = (centerY - (viewBoxConfig.minY ?? 0)) * viewBoxToPixelY;
    
    // 스케일된 좌표계에서의 중앙 계산
    const scaledCenterX = centerXPixel * scale;
    const scaledCenterY = centerYPixel * scale;
    
    // 컨테이너 중앙에 맞추기
    const translateX = containerWidth / 2 - scaledCenterX;
    const translateY = containerHeight / 2 - scaledCenterY;
    
    return { scale, translateX, translateY };
  }, []);

  // 초기 로드 및 선택된 노선 변경 시 중앙 정렬 및 스케일 조정 (노선을 화면 중앙에 정확히 배치)
  useEffect(() => {
    // 컨테이너가 마운트되고 크기가 확정된 후에 실행
    const updateTransform = () => {
    const { stations } = getVisibleData(activeLine);
      if (stations.length > 0 && containerRef.current) {
      const transform = getTransformForStations(stations);
        // 노선의 중앙을 화면 중앙에 정확히 맞추기
      setZoom(transform.scale);
      setPan({ x: transform.translateX, y: transform.translateY });
    }
    };
    
    // 초기 로드 시 약간의 지연으로 컨테이너 크기 확보
    // 첫 로드 시에는 더 긴 지연으로 정확한 계산 보장
    const timer = setTimeout(updateTransform, 150);
    
    // 리사이즈 이벤트 리스너 추가 (창 크기 변경 시 재계산)
    window.addEventListener('resize', updateTransform);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTransform);
    };
  }, [activeLine, getVisibleData, getTransformForStations]);

  // 주변 역 찾기
  const findNearbyStations = useCallback((station: Station) => {
    const { stations: visibleStations } = getVisibleData(activeLine);
    const nearby = visibleStations
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
  }, [activeLine, getVisibleData]);

  // 역 클릭 핸들러 (개선된 버전)
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
  }, [hasMoved, findNearbyStations, onStationSelect]);

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

  // 줌/팬 핸들러
  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.max(0.3, Math.min(5, prev + delta)));
  }, []);

  const handleReset = useCallback(() => {
    // 선택된 노선의 중앙으로 정확히 리셋
    const { stations } = getVisibleData(activeLine);
    if (stations.length > 0) {
      const transform = getTransformForStations(stations);
      // 노선의 중앙으로 정확히 맞추기
      setZoom(transform.scale);
      setPan({ x: transform.translateX, y: transform.translateY });
    }
    handleCloseDetail();
  }, [activeLine, getVisibleData, getTransformForStations, handleCloseDetail]);

  // PC 마우스 이벤트 (개선된 버전)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // preventDefault 제거: passive 이벤트 리스너 경고 방지
    // 줌 기능은 유지하되 기본 스크롤도 허용
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, [handleZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // 역 원이나 라벨을 클릭한 경우 드래그 방지
    if (target.closest('circle, g[data-station], text')) {
      setClickStartPos({ x: e.clientX, y: e.clientY });
      setHasMoved(false);
      return;
    }
    
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setClickStartPos({ x: e.clientX, y: e.clientY });
      setHasMoved(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && clickStartPos) {
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - clickStartPos.x, 2) + 
        Math.pow(e.clientY - clickStartPos.y, 2)
      );
      
      // 5px 이상 움직였으면 드래그로 간주
      if (moveDistance > 5) {
        setHasMoved(true);
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // 역을 클릭한 경우
    if (clickStartPos && !hasMoved) {
      const stationElement = target.closest('circle, g[data-station]');
      if (stationElement) {
        const stationId = stationElement.getAttribute('data-station-id');
        if (stationId) {
          const station = STATIONS.find(s => s.id === stationId);
          if (station) {
            handleStationClick(station, e);
          }
        }
      }
    }
    
    setIsDragging(false);
    setClickStartPos(null);
    setHasMoved(false);
  };

  // 모바일 터치 이벤트 (개선된 버전)
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // 역을 터치한 경우
      if (target.closest('circle, g[data-station]')) {
        setClickStartPos({ x: touch.clientX, y: touch.clientY });
        setHasMoved(false);
        return;
      }
      
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setClickStartPos({ x: touch.clientX, y: touch.clientY });
      setHasMoved(false);
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
    if (e.touches.length === 1 && isDragging && clickStartPos) {
      const touch = e.touches[0];
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - clickStartPos.x, 2) + 
        Math.pow(touch.clientY - clickStartPos.y, 2)
      );
      
      // 10px 이상 움직였으면 드래그로 간주
      if (moveDistance > 10) {
        setHasMoved(true);
        setPan({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y,
        });
      }
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
    const target = e.target as HTMLElement;
    
    if (e.touches.length === 0) {
      // 역을 터치한 경우
      if (clickStartPos && !hasMoved) {
        const stationElement = target.closest('circle, g[data-station]');
        if (stationElement) {
          const stationId = stationElement.getAttribute('data-station-id');
          if (stationId) {
            const station = STATIONS.find(s => s.id === stationId);
            if (station) {
              handleStationClick(station, e);
            }
          }
        }
      }
      
      setIsDragging(false);
      setTouchDistance(0);
      setClickStartPos(null);
      setHasMoved(false);
      
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

  // 역 표시 여부 결정 (항상 모든 역 표시)
  const shouldShowStation = useCallback((station: Station): boolean => {
    return true; // 항상 모든 역 표시
  }, []);

  // 라벨 표시 여부 결정 (항상 모든 라벨 표시)
  const shouldShowLabel = useCallback((station: Station): boolean => {
    return true; // 항상 모든 라벨 표시
  }, []);

  // 라벨 bounding box 계산
  const getLabelBounds = useCallback((station: Station, offsetX: number, offsetY: number): {
    x: number;
    y: number;
    width: number;
    height: number;
  } => {
    const labelWidth = station.name.length * (station.isTransfer ? 8 : 7) + 40; // 여백 포함 (글씨 크기 증가 반영)
    const labelHeight = 22; // 글씨 크기 증가에 맞춰 높이 증가
    const padding = 15; // 라벨 간 최소 간격 더 증가 (12 → 15)
    
    return {
      x: station.layoutX + offsetX - labelWidth / 2 - padding,
      y: station.layoutY + offsetY - labelHeight / 2 - padding,
      width: labelWidth + padding * 2,
      height: labelHeight + padding * 2,
    };
  }, []);

  // 두 bounding box가 겹치는지 확인
  const checkBoundsOverlap = useCallback((
    bounds1: { x: number; y: number; width: number; height: number },
    bounds2: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }, []);

  // 노선 방향 계산 (이전/다음 역을 기준으로)
  const getLineDirection = useCallback((station: Station): { dx: number; dy: number } => {
    const { stations: visibleStations } = getVisibleData(activeLine);
    
    // 현재 역이 속한 노선들 찾기
    const stationLines = station.lines;
    let avgDx = 0;
    let avgDy = 0;
    let count = 0;

    stationLines.forEach(lineId => {
      const line = LINES.find(l => l.id === lineId);
      if (!line) return;

      const stationIndex = line.stationIds.indexOf(station.id);
      if (stationIndex === -1) return;

      // 이전 역과 다음 역의 평균 방향 계산
      let prevStation: Station | undefined;
      let nextStation: Station | undefined;

      if (stationIndex > 0) {
        prevStation = STATIONS.find(s => s.id === line.stationIds[stationIndex - 1]);
      }
      if (stationIndex < line.stationIds.length - 1) {
        nextStation = STATIONS.find(s => s.id === line.stationIds[stationIndex + 1]);
      }

      if (prevStation && nextStation) {
        // 양방향 평균
        const dx1 = station.layoutX - prevStation.layoutX;
        const dy1 = station.layoutY - prevStation.layoutY;
        const dx2 = nextStation.layoutX - station.layoutX;
        const dy2 = nextStation.layoutY - station.layoutY;
        const dx = (dx1 + dx2) / 2;
        const dy = (dy1 + dy2) / 2;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          avgDx += dx / length;
          avgDy += dy / length;
          count++;
        }
      } else if (prevStation) {
        const dx = station.layoutX - prevStation.layoutX;
        const dy = station.layoutY - prevStation.layoutY;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          avgDx += dx / length;
          avgDy += dy / length;
          count++;
        }
      } else if (nextStation) {
        const dx = nextStation.layoutX - station.layoutX;
        const dy = nextStation.layoutY - station.layoutY;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          avgDx += dx / length;
          avgDy += dy / length;
          count++;
        }
      }
    });

    if (count > 0) {
      avgDx /= count;
      avgDy /= count;
    } else {
      // 기본값: 위쪽
      avgDx = 0;
      avgDy = -1;
    }

    return { dx: avgDx, dy: avgDy };
  }, [activeLine, getVisibleData]);

  // 라벨 위치 계산 (개선된 버전: bounding box 충돌 감지 및 노선 방향 기반 오프셋)
  const getLabelPosition = useCallback((station: Station, existingLabels: Map<string, { x: number; y: number; anchor: string }>): { x: number; y: number; anchor: string } => {
    const { stations: visibleStations } = getVisibleData(activeLine);
    const visibleStationsWithLabels = visibleStations.filter(s => 
      s.id !== station.id && shouldShowLabel(s)
    );

    // 노선 방향 계산
    const direction = getLineDirection(station);
    
    // 기본 오프셋 (노선 방향에 수직) - 간격을 넓혀서 겹침 방지
    const baseOffset = 45; // 기본 거리 더 증가 (35 → 45, 글씨 크기 증가 반영)
    let offsetX = -direction.dy * baseOffset; // 방향에 수직
    let offsetY = direction.dx * baseOffset;
    
    // 기본 앵커
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    
    // 가능한 위치 후보들 (8방향 + 기본 위치)
    const candidates: Array<{ x: number; y: number; anchor: 'start' | 'middle' | 'end'; priority: number }> = [
      // 노선 방향 기반 위치 (우선순위 높음)
      { x: station.layoutX + offsetX, y: station.layoutY + offsetY, anchor: 'middle', priority: 1 },
      // 반대 방향
      { x: station.layoutX - offsetX, y: station.layoutY - offsetY, anchor: 'middle', priority: 2 },
      // 8방향 탐색
      { x: station.layoutX, y: station.layoutY - baseOffset, anchor: 'middle', priority: 3 }, // 위
      { x: station.layoutX, y: station.layoutY + baseOffset, anchor: 'middle', priority: 4 }, // 아래
      { x: station.layoutX - baseOffset, y: station.layoutY, anchor: 'end', priority: 5 }, // 왼쪽
      { x: station.layoutX + baseOffset, y: station.layoutY, anchor: 'start', priority: 6 }, // 오른쪽
      { x: station.layoutX - baseOffset * 0.7, y: station.layoutY - baseOffset * 0.7, anchor: 'end', priority: 7 }, // 왼쪽 위
      { x: station.layoutX + baseOffset * 0.7, y: station.layoutY - baseOffset * 0.7, anchor: 'start', priority: 8 }, // 오른쪽 위
      { x: station.layoutX - baseOffset * 0.7, y: station.layoutY + baseOffset * 0.7, anchor: 'end', priority: 9 }, // 왼쪽 아래
      { x: station.layoutX + baseOffset * 0.7, y: station.layoutY + baseOffset * 0.7, anchor: 'start', priority: 10 }, // 오른쪽 아래
    ];

    // 라벨 간 최소 거리 증가 (겹침 방지)
    const minDistance = 70; // 50 → 70 (글씨 크기 증가 반영)

    // 각 후보 위치에 대해 충돌 검사
    for (const candidate of candidates.sort((a, b) => a.priority - b.priority)) {
      const candidateBounds = getLabelBounds(station, candidate.x - station.layoutX, candidate.y - station.layoutY);
      let hasCollision = false;

      // 기존 라벨들과 충돌 검사
      for (const [otherStationId, otherLabelPos] of Array.from(existingLabels.entries())) {
        const otherStation = visibleStationsWithLabels.find(s => s.id === otherStationId);
        if (!otherStation) continue;

        const otherBounds = getLabelBounds(
          otherStation,
          otherLabelPos.x - otherStation.layoutX,
          otherLabelPos.y - otherStation.layoutY
        );

        if (checkBoundsOverlap(candidateBounds, otherBounds)) {
          hasCollision = true;
          break;
        }
      }

      // 충돌이 없으면 이 위치 선택
      if (!hasCollision) {
        return {
          x: candidate.x,
          y: candidate.y,
          anchor: candidate.anchor,
        };
      }
    }

    // 모든 후보가 충돌하면 기본 위치 반환 (약간의 오프셋 추가)
    return {
      x: station.layoutX + offsetX,
      y: station.layoutY + offsetY - 30, // 위로 더 이동
      anchor: 'middle',
    };
  }, [activeLine, getVisibleData, shouldShowLabel, getLineDirection, getLabelBounds, checkBoundsOverlap]);

  // 안전한 색상 가져오기 헬퍼 함수 (컴포넌트 레벨)
  const getLineColor = useCallback((lineId: LineId | undefined): string => {
    if (!lineId) return DEFAULT_COLOR;
    return lineColorMap[lineId] || DEFAULT_COLOR;
  }, [lineColorMap]);

  // 노선 그리기
  const renderLines = useCallback(() => {
    const lineElements: JSX.Element[] = [];
    const { lines: visibleLines } = getVisibleData(activeLine);
    
    visibleLines.forEach((line) => {
      const lineStations = line.stationIds
        .map(id => STATIONS.find(s => s.id === id))
        .filter((s): s is Station => s !== undefined);
      
      if (lineStations.length < 2) return;
      
      // 선택된 노선: 진한 색, 두꺼운 선
      const strokeWidth = 6;
      const opacity = 1;
      
      // 안전한 색상 참조 (props 또는 기본값)
      const lineColor = getLineColor(line.id);
      
      for (let i = 0; i < lineStations.length - 1; i++) {
        const from = lineStations[i];
        const to = lineStations[i + 1];
        
        lineElements.push(
          <line
            key={`line-${line.id}-${i}`}
            x1={from.layoutX}
            y1={from.layoutY}
            x2={to.layoutX}
            y2={to.layoutY}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
            className="transition-all duration-300 ease-in-out"
          />
        );
      }
    });
    
    return lineElements;
  }, [activeLine, getVisibleData, getLineColor]);

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
        {LINES.map((line) => (
          <button
            key={line.id}
            onClick={() => handleLineSelect(line.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeLine === line.id
                ? 'text-white shadow-md scale-105'
                : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 shadow-sm'
            }`}
            style={{
              backgroundColor: activeLine === line.id ? line.color : undefined,
            }}
          >
            {line.id}호선
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
          viewBox={`${viewBoxConfig.minX} ${viewBoxConfig.minY} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* 노선 그리기 */}
          {renderLines()}

          {/* 역 표시 (줌 레벨에 따라 필터링) */}
          {(() => {
            const visibleStations = getVisibleData(activeLine).stations.filter(station => shouldShowStation(station));
            const stationsWithLabels = visibleStations.filter(station => shouldShowLabel(station));
            
            // 라벨 위치를 순차적으로 계산 (이전 라벨 위치를 고려)
            const labelPositions = new Map<string, { x: number; y: number; anchor: string }>();
            
            // 우선순위에 따라 정렬 (환승역 우선)
            const sortedStations = [...stationsWithLabels].sort((a, b) => {
              const aPriority = a.isTransfer ? 1 : 0;
              const bPriority = b.isTransfer ? 1 : 0;
              return aPriority - bPriority;
            });
            
            sortedStations.forEach(station => {
              const labelPos = getLabelPosition(station, labelPositions);
              labelPositions.set(station.id, labelPos);
            });
            
            return visibleStations.map((station) => {
            const isHovered = hoveredStation === station.id;
            const isSelected = selectedStation?.id === station.id;
            
            // 환승역: 현재 선택된 노선 색상 사용
            const displayLineColors = [getLineColor(activeLine)];
            
            const primaryColor = displayLineColors[0] || DEFAULT_COLOR;
            const displayLineColor = primaryColor; // 단수형 별칭 (하위 호환성)
            
            const radius = station.isTransfer ? 6 : 4;
            const strokeWidth = station.isTransfer ? 2.5 : 2;
            const opacity = 1;
            
            const labelPos = shouldShowLabel(station) 
              ? (labelPositions.get(station.id) || { x: station.layoutX, y: station.layoutY - 20, anchor: 'middle' as const })
              : { x: station.layoutX, y: station.layoutY, anchor: 'middle' as const };

            return (
              <g 
                key={station.id} 
                data-station-id={station.id}
                data-station
                opacity={opacity} 
                className="transition-opacity duration-300 ease-in-out"
              >
                {/* 선택된 역 강조 링 */}
                {isSelected && (
                  <circle
                    cx={station.layoutX}
                    cy={station.layoutY}
                    r={radius + 8}
                    fill="none"
                    stroke={displayLineColor}
                    strokeWidth={3}
                    strokeDasharray="5,5"
                    className="animate-pulse"
                    opacity={0.6}
                  />
                )}
                
                {/* 역 원 */}
                <circle
                  cx={station.layoutX}
                  cy={station.layoutY}
                  r={radius}
                  fill={primaryColor}
                  stroke={isSelected ? primaryColor : "white"}
                  strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
                  className={`cursor-pointer transition-all duration-200 ${
                    isHovered || isSelected 
                      ? 'scale-150 drop-shadow-lg' 
                      : 'hover:scale-125'
                  } ${isSelected ? 'ring-2 ring-offset-2' : ''}`}
                  onClick={(e) => handleStationClick(station, e)}
                  onMouseEnter={() => setHoveredStation(station.id)}
                  onMouseLeave={() => setHoveredStation(null)}
                  style={{
                    filter: isHovered || isSelected ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' : undefined,
                    transformOrigin: `${station.layoutX}px ${station.layoutY}px`,
                  }}
                />

                {/* 라벨 (pill 형태) */}
                {shouldShowLabel(station) && (
                  <g>
                    <rect
                      x={labelPos.x - (station.name.length * (station.isTransfer ? 8 : 7)) - 10}
                      y={labelPos.y - 11}
                      width={station.name.length * (station.isTransfer ? 16 : 14) + 40}
                      height={22}
                      fill="white"
                      fillOpacity="0.98"
                      rx="9"
                      stroke={isSelected ? primaryColor : primaryColor}
                      strokeWidth={isSelected ? 3 : (station.isTransfer ? 2.5 : 2)}
                      className="pointer-events-none transition-all duration-200"
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                      }}
                    />
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 5}
                      textAnchor={labelPos.anchor as "start" | "end" | "middle" | "inherit" | undefined}
                      fontSize={station.isTransfer ? 16 : 14}
                      fontWeight={isSelected ? 'bold' : (station.isTransfer ? 'bold' : '600')}
                      fill={isSelected ? primaryColor : "#1f2937"}
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
            });
          })()}
        </svg>
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
