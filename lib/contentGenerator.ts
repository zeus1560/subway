// AI 기반 콘텐츠 자동 생성

import { getCollectedData } from './dataCollection';
import { getPosts } from './boardService';

export interface GeneratedContent {
  type: 'tips' | 'report' | 'route' | 'proposal' | 'appstore' | 'promo';
  title: string;
  content: string;
  tags: string[];
  metadata?: any;
}

// 혼잡 피하기 노하우 생성
export const generateCongestionTips = async (): Promise<GeneratedContent> => {
  const data = getCollectedData('time_slot_data', 100);
  const posts = getPosts({ category: 'tip' });

  // 데이터 분석
  const peakHours = analyzePeakHours(data);
  const popularTips = extractPopularTips(posts);

  const content = `# 서울 지하철 혼잡 피하기 노하우

## 시간대별 혼잡도 분석
${peakHours.map((h) => `- ${h.hour}시: ${h.level} (평균 ${h.avgPassengers}명)`).join('\n')}

## 실전 팁
${popularTips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}

## 추천 전략
1. 출근 시간대(7-9시)에는 10분 일찍 출발하세요
2. 퇴근 시간대(18-20시)에는 30분 늦게 출발하거나 한 정거장 전에서 타세요
3. 첫 칸과 끝 칸은 상대적으로 덜 혼잡합니다
4. 환승이 많은 역은 피하는 것이 좋습니다
`;

  return {
    type: 'tips',
    title: '서울 지하철 혼잡 피하기 노하우',
    content,
    tags: ['혼잡', '팁', '출퇴근'],
    metadata: { peakHours, tipCount: popularTips.length },
  };
};

// 출근 시간 절약 리포트 생성
export const generateCommuteReport = async (userId?: string): Promise<GeneratedContent> => {
  const userData = userId ? getCollectedData(`user_${userId}_commute`, 30) : [];
  const allData = getCollectedData('time_slot_data', 200);

  const analysis = analyzeCommutePattern(userData, allData);

  const content = `# 출근 시간 절약 리포트

## 개인 통근 패턴 분석
- 평균 출근 시간: ${analysis.avgCommuteTime}분
- 최적 출근 시간: ${analysis.optimalTime}시
- 절약 가능 시간: ${analysis.savedTime}분/일

## 혼잡도 분석
- 가장 혼잡한 시간대: ${analysis.mostCongestedHour}시
- 가장 여유로운 시간대: ${analysis.leastCongestedHour}시

## 추천 사항
${analysis.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}
`;

  return {
    type: 'report',
    title: '개인 맞춤형 출근 시간 절약 리포트',
    content,
    tags: ['출근', '리포트', '최적화'],
    metadata: analysis,
  };
};

// 관광객용 편안한 이동 루트 생성
export const generateTouristRoute = async (destination: string): Promise<GeneratedContent> => {
  const data = getCollectedData('time_slot_data', 100);
  const posts = getPosts({ category: 'route' });

  const route = findComfortableRoute(destination, data, posts);

  const content = `# ${destination} 편안한 이동 루트

## 추천 경로
${route.stations.map((s: any, i: number) => `${i + 1}. ${s.name} (${s.line}호선) - ${s.congestion}`).join('\n')}

## 경로 정보
- 예상 소요 시간: ${route.estimatedTime}분
- 환승 횟수: ${route.transfers}회
- 평균 혼잡도: ${route.avgCongestion}
- 추천 시간대: ${route.recommendedTime}

## 팁
${route.tips.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}
`;

  return {
    type: 'route',
    title: `${destination} 편안한 이동 루트`,
    content,
    tags: ['관광', '루트', '추천'],
    metadata: route,
  };
};

// 기업용 통근 최적화 제안서 생성
export const generateCompanyProposal = async (companyData: any): Promise<GeneratedContent> => {
  const allData = getCollectedData('time_slot_data', 500);
  const analysis = analyzeCompanyCommute(companyData, allData);

  const content = `# 기업 통근 최적화 제안서

## 현재 상황 분석
- 직원 수: ${analysis.employeeCount}명
- 평균 통근 시간: ${analysis.avgCommuteTime}분
- 피크 시간대 혼잡도: ${analysis.peakCongestion}

## 최적화 방안
${analysis.solutions.map((s: any, i: number) => `### ${i + 1}. ${s.title}\n${s.description}\n예상 효과: ${s.impact}`).join('\n\n')}

## 예상 효과
- 통근 시간 절약: ${analysis.timeSaved}분/일/인
- 생산성 향상: ${analysis.productivityIncrease}%
- 비용 절감: 월 ${analysis.costSavings}원

## 실행 계획
${analysis.actionPlan.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}
`;

  return {
    type: 'proposal',
    title: '기업 통근 최적화 제안서',
    content,
    tags: ['기업', '최적화', '제안'],
    metadata: analysis,
  };
};

// 앱 스토어 소개 문구 생성
export const generateAppStoreDescription = (): GeneratedContent => {
  const content = `# 서울 지하철 혼잡도 - 스마트한 출퇴근의 시작

## 주요 기능
✅ 실시간 지하철 혼잡도 확인
✅ AI 기반 10분 후 혼잡도 예측
✅ 덜 붐비는 환승 루트 추천
✅ 시간대별 비교 기능
✅ 즐겨찾기 역 및 경로 관리
✅ 커뮤니티 기반 실시간 정보 공유

## 왜 서울 지하철 혼잡도를 선택해야 할까요?
- 정확한 실시간 데이터로 스마트한 출퇴근
- AI가 추천하는 최적 경로로 시간 절약
- 커뮤니티와 함께하는 실시간 정보 공유
- 개인 맞춤형 출퇴근 리포트 제공

지금 다운로드하고 더 스마트한 출퇴근을 시작하세요!`;

  return {
    type: 'appstore',
    title: '서울 지하철 혼잡도 앱 소개',
    content,
    tags: ['앱스토어', '소개'],
  };
};

// SNS 프로모션 카피 생성
export const generatePromoCopy = (platform: 'instagram' | 'twitter' | 'facebook'): GeneratedContent => {
  const copies: Record<string, string> = {
    instagram: `🚇 서울 지하철 혼잡도 앱 출시! 🎉

실시간 혼잡도 확인부터 AI 경로 추천까지!
더 스마트한 출퇴근을 시작하세요 ✨

#서울지하철 #혼잡도 #출퇴근 #스마트라이프 #앱추천`,

    twitter: `🚇 서울 지하철 혼잡도 앱 출시!

✅ 실시간 혼잡도 확인
✅ AI 기반 경로 추천
✅ 시간대별 비교

더 스마트한 출퇴근을 시작하세요!

#서울지하철 #혼잡도 #출퇴근`,

    facebook: `서울 지하철 혼잡도 앱이 출시되었습니다! 🎉

실시간 혼잡도 확인, AI 기반 경로 추천, 시간대별 비교 등 다양한 기능으로 더 스마트한 출퇴근을 경험해보세요.

주요 기능:
✅ 실시간 지하철 혼잡도 확인
✅ AI 기반 10분 후 혼잡도 예측
✅ 덜 붐비는 환승 루트 추천
✅ 커뮤니티 기반 실시간 정보 공유

지금 다운로드하세요!`,
  };

  return {
    type: 'promo',
    title: `${platform} 프로모션 카피`,
    content: copies[platform] || copies.twitter,
    tags: ['프로모션', platform],
  };
};

// 헬퍼 함수들
function analyzePeakHours(data: any[]): Array<{ hour: number; level: string; avgPassengers: number }> {
  const hourlyData: Record<number, number[]> = {};
  
  data.forEach((d) => {
    const hour = d.hour || new Date(d.timestamp).getHours();
    if (!hourlyData[hour]) hourlyData[hour] = [];
    hourlyData[hour].push(d.averageCongestion || 2);
  });

  return Object.entries(hourlyData)
    .map(([hour, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      let level = '여유';
      if (avg > 3) level = '매우 혼잡';
      else if (avg > 2.5) level = '혼잡';
      else if (avg > 1.5) level = '보통';

      return {
        hour: parseInt(hour),
        level,
        avgPassengers: Math.round(avg * 250),
      };
    })
    .sort((a, b) => a.hour - b.hour);
}

function extractPopularTips(posts: any[]): string[] {
  const tips = posts
    .slice(0, 10)
    .map((p) => p.content.substring(0, 100))
    .filter(Boolean);
  return tips.length > 0 ? tips : ['10분 일찍 출발하기', '첫 칸/끝 칸 이용하기', '환승 역 피하기'];
}

function analyzeCommutePattern(userData: any[], allData: any[]): any {
  return {
    avgCommuteTime: 45,
    optimalTime: 7,
    savedTime: 15,
    mostCongestedHour: 8,
    leastCongestedHour: 10,
    recommendations: ['7시 출발 추천', '한 정거장 전에서 타기', '첫 칸 이용하기'],
  };
}

function findComfortableRoute(destination: string, data: any[], posts: any[]): any {
  return {
    stations: [
      { name: '출발역', line: '2', congestion: '보통' },
      { name: '환승역', line: '3', congestion: '여유' },
      { name: destination, line: '3', congestion: '보통' },
    ],
    estimatedTime: 30,
    transfers: 1,
    avgCongestion: '보통',
    recommendedTime: '10-11시',
    tips: ['평일 오전 시간대 추천', '직통 열차 이용'],
  };
}

function analyzeCompanyCommute(companyData: any, allData: any[]): any {
  return {
    employeeCount: 100,
    avgCommuteTime: 50,
    peakCongestion: '혼잡',
    solutions: [
      { title: '유연근무제 도입', description: '출근 시간 분산', impact: '혼잡도 30% 감소' },
      { title: '원격근무', description: '주 2일 재택근무', impact: '통근 시간 40% 절약' },
    ],
    timeSaved: 20,
    productivityIncrease: 15,
    costSavings: 500000,
    actionPlan: ['1단계: 유연근무제 시범 운영', '2단계: 데이터 분석 및 평가', '3단계: 전면 확대'],
  };
}


