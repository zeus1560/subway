// AI 기반 최적 탑승 칸 추천 로직

import { TrendAnalysis, analyzeStationTrend } from './analysis';
import { getFavoriteStations } from './storage';

export interface CarRecommendation {
  carNumber: number;
  reason: string;
  score: number; // 0-100 점수
  advantages: string[]; // 장점 목록
}

export interface StationRecommendation {
  stationName: string;
  lineNum: string;
  direction: 'up' | 'down';
  recommendedCars: CarRecommendation[];
  nextTrainInfo: {
    arrivalTime: number; // 초 단위
    estimatedArrival: string; // "2분 후" 형식
  };
  congestionSummary: {
    average: number;
    min: number;
    max: number;
  };
  aiInsight: string; // AI 인사이트 메시지
}

// 칸별 혼잡도 데이터
export interface CarCongestion {
  carNumber: number;
  congestionLevel: 'relaxed' | 'normal' | 'caution' | 'crowded';
  congestionPercent: number;
  doorPosition?: 'front' | 'middle' | 'back';
  transferAdvantage?: boolean; // 환승 유리 여부
}

// 최적 탑승 칸 추천
export const recommendOptimalCars = (
  stationName: string,
  lineNum: string,
  direction: 'up' | 'down',
  cars: CarCongestion[],
  userPreferences?: {
    preferTransfer?: boolean; // 환승 선호
    preferQuiet?: boolean; // 조용한 곳 선호
    preferFront?: boolean; // 앞쪽 선호
  }
): CarRecommendation[] => {
  const trend = analyzeStationTrend(stationName, lineNum, direction);
  const favorites = getFavoriteStations();
  const isFavorite = favorites.some(
    (fav) => fav.stationName === stationName && fav.lineNum === lineNum
  );

  // 각 칸에 대한 점수 계산
  const recommendations: CarRecommendation[] = cars.map((car) => {
    let score = 100;
    const advantages: string[] = [];
    const reasons: string[] = [];

    // 1. 혼잡도 기반 점수 (가장 중요)
    const congestionScore = 100 - car.congestionPercent;
    score = score * 0.5 + congestionScore * 0.5;

    if (car.congestionLevel === 'relaxed') {
      advantages.push('여유로운 공간');
      reasons.push('혼잡도가 낮아 편안하게 탑승 가능');
      score += 20;
    } else if (car.congestionLevel === 'normal') {
      advantages.push('적당한 혼잡도');
      reasons.push('보통 수준의 혼잡도');
    } else if (car.congestionLevel === 'caution') {
      score -= 15;
      reasons.push('주의가 필요한 혼잡도');
    } else if (car.congestionLevel === 'crowded') {
      score -= 30;
      reasons.push('혼잡한 칸');
    }

    // 2. 사용자 이용 이력 기반 (즐겨찾기 역인 경우)
    if (isFavorite && trend.mostUsedCars.includes(car.carNumber)) {
      advantages.push('자주 이용한 칸');
      reasons.push('과거 이용 패턴 기반 추천');
      score += 10;
    }

    // 3. 환승 유리 여부
    if (car.transferAdvantage) {
      advantages.push('환승 유리');
      reasons.push('환승역 접근 용이');
      if (userPreferences?.preferTransfer) {
        score += 15;
      } else {
        score += 5;
      }
    }

    // 4. 문 위치 선호도
    if (userPreferences?.preferFront && car.doorPosition === 'front') {
      advantages.push('앞쪽 위치');
      score += 5;
    } else if (!userPreferences?.preferFront && car.doorPosition === 'back') {
      advantages.push('뒤쪽 위치');
      score += 5;
    }

    // 5. 시간대 기반 추천
    const currentHour = new Date().getHours();
    if (trend.quietHours.includes(currentHour)) {
      // 한산한 시간대면 모든 칸이 비교적 여유로움
      if (car.congestionLevel === 'relaxed' || car.congestionLevel === 'normal') {
        advantages.push('현재 시간대에 적합');
        score += 5;
      }
    } else if (trend.peakHours.includes(currentHour)) {
      // 피크 시간대면 여유로운 칸이 더 중요
      if (car.congestionLevel === 'relaxed') {
        advantages.push('피크 시간대에 최적');
        score += 15;
      }
    }

    // 6. 중간 칸 선호 (일반적으로 가장 여유로움)
    if (car.carNumber >= 4 && car.carNumber <= 7) {
      advantages.push('중간 위치');
      score += 3;
    }

    return {
      carNumber: car.carNumber,
      reason: reasons.join(', ') || '일반적인 추천',
      score: Math.max(0, Math.min(100, score)),
      advantages,
    };
  });

  // 점수 순으로 정렬
  return recommendations.sort((a, b) => b.score - a.score);
};

// AI 인사이트 생성
export const generateAIInsight = (
  stationName: string,
  lineNum: string,
  direction: 'up' | 'down',
  recommendedCars: CarRecommendation[],
  trend: TrendAnalysis
): string => {
  const topCar = recommendedCars[0];
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay();

  const insights: string[] = [];

  // 최고 추천 칸 정보
  if (topCar.score >= 80) {
    insights.push(`${topCar.carNumber}칸이 가장 여유롭고 추천합니다.`);
  } else if (topCar.score >= 60) {
    insights.push(`${topCar.carNumber}칸을 추천하지만, 다른 칸도 고려해보세요.`);
  } else {
    insights.push(`현재 모든 칸이 다소 혼잡합니다. ${topCar.carNumber}칸이 상대적으로 나은 선택입니다.`);
  }

  // 시간대 기반 인사이트
  if (trend.peakHours.includes(currentHour)) {
    insights.push(`현재는 출퇴근 시간대라 혼잡도가 높습니다.`);
  } else if (trend.quietHours.includes(currentHour)) {
    insights.push(`현재는 한산한 시간대입니다.`);
  }

  // 요일 기반 인사이트
  const dayCongestion = trend.averageCongestionByDay[currentDay];
  if (dayCongestion) {
    if (dayCongestion > 70) {
      insights.push(`오늘은 평소보다 혼잡할 수 있습니다.`);
    } else if (dayCongestion < 40) {
      insights.push(`오늘은 평소보다 한산할 것으로 예상됩니다.`);
    }
  }

  // 트렌드 기반 인사이트
  if (trend.trend === 'increasing') {
    insights.push(`최근 이 역의 혼잡도가 증가하는 추세입니다.`);
  } else if (trend.trend === 'decreasing') {
    insights.push(`최근 이 역의 혼잡도가 감소하는 추세입니다.`);
  }

  // 추천 칸의 장점
  if (topCar.advantages.length > 0) {
    insights.push(`추천 이유: ${topCar.advantages.join(', ')}`);
  }

  return insights.join(' ');
};

// 역별 종합 추천 생성
export const generateStationRecommendation = (
  stationName: string,
  lineNum: string,
  direction: 'up' | 'down',
  cars: CarCongestion[],
  nextTrainArrival: number,
  userPreferences?: {
    preferTransfer?: boolean;
    preferQuiet?: boolean;
    preferFront?: boolean;
  }
): StationRecommendation => {
  const trend = analyzeStationTrend(stationName, lineNum, direction);
  const recommendedCars = recommendOptimalCars(
    stationName,
    lineNum,
    direction,
    cars,
    userPreferences
  );

  // 혼잡도 요약
  const congestionValues = cars.map((car) => car.congestionPercent);
  const congestionSummary = {
    average: congestionValues.reduce((sum, val) => sum + val, 0) / congestionValues.length,
    min: Math.min(...congestionValues),
    max: Math.max(...congestionValues),
  };

  // 다음 열차 정보
  const minutes = Math.floor(nextTrainArrival / 60);
  const seconds = nextTrainArrival % 60;
  const estimatedArrival =
    minutes > 0 ? `${minutes}분 후` : seconds > 0 ? `${seconds}초 후` : '곧 도착';

  // AI 인사이트
  const aiInsight = generateAIInsight(stationName, lineNum, direction, recommendedCars, trend);

  return {
    stationName,
    lineNum,
    direction,
    recommendedCars,
    nextTrainInfo: {
      arrivalTime: nextTrainArrival,
      estimatedArrival,
    },
    congestionSummary,
    aiInsight,
  };
};

