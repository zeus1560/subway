// 개인화 서비스 - 사용자 이용 패턴 및 검색 이력 분석

import { getCurrentUser } from './authService';
import { getCollectedData, saveCollectedData } from './dataCollection';
import { getPosts } from './boardService';

export interface PersonalizedCard {
  type: 'congestion' | 'departure' | 'report' | 'tip';
  title: string;
  content: string;
  action?: string;
  priority: number;
  icon: string;
}

export interface UserPattern {
  frequentStations: Array<{ station: string; line: string; count: number }>;
  frequentTimeSlots: Array<{ hour: number; count: number }>;
  commuteRoutes: Array<{ start: string; end: string; count: number }>;
}

// 사용자 이용 패턴 분석
export const analyzeUserPattern = (userId?: string): UserPattern => {
  if (!userId) {
    return {
      frequentStations: [],
      frequentTimeSlots: [],
      commuteRoutes: [],
    };
  }

  const commuteData = getCollectedData(`user_${userId}_commute`, 100);
  const searchHistory = getCollectedData(`user_${userId}_search`, 50);

  // 자주 이용하는 역 분석
  const stationCounts: Record<string, number> = {};
  commuteData.forEach((data: any) => {
    const key = `${data.stationName}_${data.lineNum}`;
    stationCounts[key] = (stationCounts[key] || 0) + 1;
  });

  const frequentStations = Object.entries(stationCounts)
    .map(([key, count]) => {
      const [station, line] = key.split('_');
      return { station, line, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 자주 이용하는 시간대 분석
  const timeSlotCounts: Record<number, number> = {};
  commuteData.forEach((data: any) => {
    const hour = new Date(data.timestamp).getHours();
    timeSlotCounts[hour] = (timeSlotCounts[hour] || 0) + 1;
  });

  const frequentTimeSlots = Object.entries(timeSlotCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 출퇴근 경로 분석
  const routeCounts: Record<string, number> = {};
  commuteData.forEach((data: any) => {
    if (data.startStation && data.endStation) {
      const key = `${data.startStation}_${data.endStation}`;
      routeCounts[key] = (routeCounts[key] || 0) + 1;
    }
  });

  const commuteRoutes = Object.entries(routeCounts)
    .map(([key, count]) => {
      const [start, end] = key.split('_');
      return { start, end, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    frequentStations,
    frequentTimeSlots,
    commuteRoutes,
  };
};

// 맞춤형 카드 생성
export const generatePersonalizedCards = async (): Promise<PersonalizedCard[]> => {
  const user = getCurrentUser();
  const pattern = analyzeUserPattern(user?.id);
  const cards: PersonalizedCard[] = [];

  const now = new Date();
  const currentHour = now.getHours();

  // 1. 오늘 예상 혼잡 구간
  if (pattern.frequentStations.length > 0) {
    const topStation = pattern.frequentStations[0];
    const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 18 && currentHour <= 20);
    
    cards.push({
      type: 'congestion',
      title: '오늘 예상 혼잡 구간',
      content: `${topStation.station}역(${topStation.line}호선)이 ${isRushHour ? '출퇴근 시간대' : '현재 시간대'}에 혼잡할 것으로 예상됩니다.`,
      action: `/stations/${encodeURIComponent(`${topStation.station}_${topStation.line}`)}`,
      priority: 1,
      icon: '🚨',
    });
  }

  // 2. 지금 출발하면 덜 붐빔
  if (pattern.frequentTimeSlots.length > 0) {
    const optimalHour = pattern.frequentTimeSlots.find((slot) => {
      const diff = Math.abs(slot.hour - currentHour);
      return diff <= 1 && slot.hour !== currentHour;
    });

    if (optimalHour) {
      cards.push({
        type: 'departure',
        title: '지금 출발하면 덜 붐빔',
        content: `${optimalHour.hour}시에 출발하시면 평소보다 혼잡도가 낮을 것으로 예상됩니다.`,
        priority: 2,
        icon: '⏰',
      });
    } else {
      cards.push({
        type: 'departure',
        title: '지금 출발 추천',
        content: '현재 시간대가 평소 이용하시는 시간대보다 덜 혼잡합니다.',
        priority: 2,
        icon: '✅',
      });
    }
  }

  // 3. 이번 주 출근 리포트
  if (pattern.commuteRoutes.length > 0) {
    const route = pattern.commuteRoutes[0];
    const weeklyData = getCollectedData(`user_${user?.id}_commute`, 7);
    const avgTime = weeklyData.length > 0 
      ? Math.round(weeklyData.reduce((sum: number, d: any) => sum + (d.commuteTime || 0), 0) / weeklyData.length)
      : 0;

    cards.push({
      type: 'report',
      title: '이번 주 출근 리포트',
      content: `${route.start} → ${route.end} 경로의 평균 통근 시간은 ${avgTime}분입니다.`,
      action: '/report',
      priority: 3,
      icon: '📊',
    });
  }

  // 4. 혼잡 피하기 팁
  const tips = getPosts({ category: 'tip' }).slice(0, 3);
  if (tips.length > 0) {
    cards.push({
      type: 'tip',
      title: '커뮤니티 추천 팁',
      content: tips[0].aiSummary || tips[0].content.substring(0, 100) + '...',
      action: `/board/${tips[0].id}`,
      priority: 4,
      icon: '💡',
    });
  }

  return cards.sort((a, b) => a.priority - b.priority);
};

// 검색 이력 저장
export const saveSearchHistory = (stationName: string, lineNum: string) => {
  const user = getCurrentUser();
  if (!user) return;
  
  saveCollectedData(`user_${user.id}_search`, {
    stationName,
    lineNum,
    timestamp: new Date(),
  });
};

// 통근 데이터 저장
export const saveCommuteHistory = (data: {
  stationName: string;
  lineNum: string;
  startStation?: string;
  endStation?: string;
  commuteTime?: number;
}) => {
  const user = getCurrentUser();
  if (!user) return;
  
  saveCollectedData(`user_${user.id}_commute`, {
    ...data,
    timestamp: new Date(),
  });
};

