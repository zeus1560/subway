// 실시간 승하차 및 역사/호선/시간대별 데이터 수집·분석

import { getStationCongestion } from './api';

export interface StationData {
  stationName: string;
  lineNum: string;
  rideCount: number;
  alightCount: number;
  timestamp: Date;
  congestionLevel: string;
}

export interface TimeSlotData {
  hour: number;
  dayOfWeek: number;
  averageCongestion: number;
  peakCongestion: number;
  stationCount: number;
}

export interface LineData {
  lineNum: string;
  stations: StationData[];
  averageCongestion: number;
  totalRideCount: number;
  totalAlightCount: number;
}

// 시간대별 데이터 수집
export const collectTimeSlotData = async (
  stations: Array<{ stationName: string; lineNum: string }>,
  timeSlot: { hour: number; dayOfWeek: number }
): Promise<TimeSlotData> => {
  const dataPromises = stations.map(async (station) => {
    try {
      const data = await getStationCongestion(station.stationName, station.lineNum);
      const passengerCount = data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 0;
      return {
        stationName: station.stationName,
        lineNum: station.lineNum,
        rideCount: passengerCount,
        alightCount: Math.round(passengerCount * 0.8), // 하차는 승차의 80% 가정
        timestamp: new Date(),
        congestionLevel: calculateCongestionLevelFromCount(passengerCount),
      };
    } catch (error) {
      return null;
    }
  });

  const results = (await Promise.all(dataPromises)).filter(Boolean) as StationData[];
  
  const congestionLevels = results.map((r) => {
    const ratio = r.rideCount / 1000;
    if (ratio < 0.3) return 1;
    if (ratio < 0.6) return 2;
    if (ratio < 0.8) return 3;
    return 4;
  });

  return {
    hour: timeSlot.hour,
    dayOfWeek: timeSlot.dayOfWeek,
    averageCongestion: congestionLevels.reduce((a, b) => a + b, 0) / congestionLevels.length,
    peakCongestion: Math.max(...congestionLevels),
    stationCount: results.length,
  };
};

// 호선별 데이터 수집
export const collectLineData = async (
  lineNum: string,
  stations: Array<{ stationName: string; lineNum: string }>
): Promise<LineData> => {
  const lineStations = stations.filter((s) => s.lineNum === lineNum);
  
  const dataPromises = lineStations.map(async (station) => {
    try {
      const data = await getStationCongestion(station.stationName, station.lineNum);
      const passengerCount = data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 0;
      return {
        stationName: station.stationName,
        lineNum: station.lineNum,
        rideCount: passengerCount,
        alightCount: Math.round(passengerCount * 0.8),
        timestamp: new Date(),
        congestionLevel: calculateCongestionLevelFromCount(passengerCount),
      };
    } catch (error) {
      return null;
    }
  });

  const results = (await Promise.all(dataPromises)).filter(Boolean) as StationData[];
  
  const totalRide = results.reduce((sum, r) => sum + r.rideCount, 0);
  const totalAlight = results.reduce((sum, r) => sum + r.alightCount, 0);
  const avgCongestion = results.reduce((sum, r) => {
    const ratio = r.rideCount / 1000;
    if (ratio < 0.3) return sum + 1;
    if (ratio < 0.6) return sum + 2;
    if (ratio < 0.8) return sum + 3;
    return sum + 4;
  }, 0) / results.length;

  return {
    lineNum,
    stations: results,
    averageCongestion: avgCongestion,
    totalRideCount: totalRide,
    totalAlightCount: totalAlight,
  };
};

// 역사별 데이터 수집
export const collectStationData = async (
  stationName: string,
  lineNum: string
): Promise<StationData> => {
  const data = await getStationCongestion(stationName, lineNum);
  const passengerCount = data?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 0;
  
  return {
    stationName,
    lineNum,
    rideCount: passengerCount,
    alightCount: Math.round(passengerCount * 0.8),
    timestamp: new Date(),
    congestionLevel: calculateCongestionLevelFromCount(passengerCount),
  };
};

// 혼잡도 레벨 계산
function calculateCongestionLevelFromCount(count: number): string {
  const ratio = count / 1000;
  if (ratio < 0.3) return '여유';
  if (ratio < 0.6) return '보통';
  if (ratio < 0.8) return '혼잡';
  return '매우 혼잡';
}

// 데이터 저장 (localStorage 기반)
export const saveCollectedData = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({ ...data, id: Date.now() });
    // 최근 1000개만 유지
    const recent = existing.slice(-1000);
    localStorage.setItem(key, JSON.stringify(recent));
  } catch (error) {
    console.error('데이터 저장 오류:', error);
  }
};

// 데이터 조회
export const getCollectedData = (key: string, limit: number = 100): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return data.slice(-limit);
  } catch (error) {
    console.error('데이터 조회 오류:', error);
    return [];
  }
};


