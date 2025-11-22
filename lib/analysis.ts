// 시간대/요일/혼잡도 트렌드 분석

import { StationUsageHistory, getStationUsageHistory, getStationUsageByStation } from './storage';

export interface TrendAnalysis {
  stationName: string;
  lineNum: string;
  direction: 'up' | 'down';
  averageCongestionByHour: Record<number, number>; // 시간대별 평균 혼잡도
  averageCongestionByDay: Record<number, number>; // 요일별 평균 혼잡도
  peakHours: number[]; // 혼잡 시간대
  quietHours: number[]; // 한산한 시간대
  mostUsedCars: number[]; // 가장 많이 이용한 칸들
  trend: 'increasing' | 'decreasing' | 'stable'; // 트렌드
}

// 혼잡도 레벨을 숫자로 변환
const congestionLevelToNumber = (level?: string): number => {
  switch (level) {
    case '여유': return 25;
    case '보통': return 50;
    case '주의': return 75;
    case '혼잡': return 90;
    default: return 50;
  }
};

// 특정 역의 트렌드 분석
export const analyzeStationTrend = (
  stationName: string,
  lineNum: string,
  direction: 'up' | 'down'
): TrendAnalysis => {
  const history = getStationUsageByStation(stationName, lineNum);
  const filteredHistory = history.filter((h) => h.direction === direction);

  if (filteredHistory.length === 0) {
    return {
      stationName,
      lineNum,
      direction,
      averageCongestionByHour: {},
      averageCongestionByDay: {},
      peakHours: [],
      quietHours: [],
      mostUsedCars: [],
      trend: 'stable',
    };
  }

  // 시간대별 평균 혼잡도 계산
  const congestionByHour: Record<number, number[]> = {};
  filteredHistory.forEach((usage) => {
    if (!congestionByHour[usage.hour]) {
      congestionByHour[usage.hour] = [];
    }
    congestionByHour[usage.hour].push(congestionLevelToNumber(usage.congestionLevel));
  });

  const averageCongestionByHour: Record<number, number> = {};
  Object.keys(congestionByHour).forEach((hourStr) => {
    const hour = parseInt(hourStr);
    const values = congestionByHour[hour];
    averageCongestionByHour[hour] =
      values.reduce((sum, val) => sum + val, 0) / values.length;
  });

  // 요일별 평균 혼잡도 계산
  const congestionByDay: Record<number, number[]> = {};
  filteredHistory.forEach((usage) => {
    if (!congestionByDay[usage.dayOfWeek]) {
      congestionByDay[usage.dayOfWeek] = [];
    }
    congestionByDay[usage.dayOfWeek].push(congestionLevelToNumber(usage.congestionLevel));
  });

  const averageCongestionByDay: Record<number, number> = {};
  Object.keys(congestionByDay).forEach((dayStr) => {
    const day = parseInt(dayStr);
    const values = congestionByDay[day];
    averageCongestionByDay[day] =
      values.reduce((sum, val) => sum + val, 0) / values.length;
  });

  // 피크 시간대 찾기 (혼잡도 상위 3개)
  const sortedHours = Object.entries(averageCongestionByHour)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // 한산한 시간대 찾기 (혼잡도 하위 3개)
  const sortedQuietHours = Object.entries(averageCongestionByHour)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  // 가장 많이 이용한 칸들
  const carUsage: Record<number, number> = {};
  filteredHistory.forEach((usage) => {
    if (usage.selectedCar) {
      carUsage[usage.selectedCar] = (carUsage[usage.selectedCar] || 0) + 1;
    }
  });

  const mostUsedCars = Object.entries(carUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([car]) => parseInt(car));

  // 트렌드 분석 (최근 7일 vs 그 이전)
  const recentHistory = filteredHistory.filter(
    (h) => h.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
  );
  const olderHistory = filteredHistory.filter(
    (h) => h.timestamp <= Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (recentHistory.length > 0 && olderHistory.length > 0) {
    const recentAvg =
      recentHistory.reduce(
        (sum, h) => sum + congestionLevelToNumber(h.congestionLevel),
        0
      ) / recentHistory.length;
    const olderAvg =
      olderHistory.reduce(
        (sum, h) => sum + congestionLevelToNumber(h.congestionLevel),
        0
      ) / olderHistory.length;

    if (recentAvg > olderAvg + 10) {
      trend = 'increasing';
    } else if (recentAvg < olderAvg - 10) {
      trend = 'decreasing';
    }
  }

  return {
    stationName,
    lineNum,
    direction,
    averageCongestionByHour,
    averageCongestionByDay,
    peakHours: sortedHours,
    quietHours: sortedQuietHours,
    mostUsedCars,
    trend,
  };
};

// 즐겨찾기 역들의 종합 분석
export const analyzeFavoriteStations = (): {
  frequentStations: Array<{ stationName: string; lineNum: string; count: number }>;
  overallTrend: TrendAnalysis[];
} => {
  const history = getStationUsageHistory();
  const stationCounts: Record<string, { stationName: string; lineNum: string; count: number }> = {};

  history.forEach((usage) => {
    const key = `${usage.stationName}_${usage.lineNum}`;
    if (!stationCounts[key]) {
      stationCounts[key] = {
        stationName: usage.stationName,
        lineNum: usage.lineNum,
        count: 0,
      };
    }
    stationCounts[key].count++;
  });

  const frequentStations = Object.values(stationCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const overallTrend = frequentStations.flatMap((station) => [
    analyzeStationTrend(station.stationName, station.lineNum, 'up'),
    analyzeStationTrend(station.stationName, station.lineNum, 'down'),
  ]);

  return {
    frequentStations,
    overallTrend,
  };
};


