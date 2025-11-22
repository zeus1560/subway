// 날씨 및 이벤트 기반 혼잡 예측

import { random } from './random';

export interface WeatherData {
  condition: 'sunny' | 'rainy' | 'snowy' | 'cloudy';
  temperature: number;
  precipitation: number;
}

export interface EventData {
  name: string;
  location: string;
  date: Date;
  expectedCrowd: number;
}

// 날씨 데이터 가져오기 (간단한 모의 데이터)
export const getWeatherData = async (): Promise<WeatherData> => {
  // 실제로는 날씨 API를 호출해야 함
  const now = new Date();
  const month = now.getMonth();
  
  // 계절별 기본 날씨 (날짜 기반 시드로 재현 가능)
  const dateSeed = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let condition: WeatherData['condition'] = 'sunny';
  if (month >= 6 && month <= 8) {
    // 여름 - 비 올 확률 높음
    condition = random.contextRandom(dateSeed + '-summer') > 0.7 ? 'rainy' : 'sunny';
  } else if (month >= 11 || month <= 2) {
    // 겨울 - 눈 올 확률
    condition = random.contextRandom(dateSeed + '-winter') > 0.8 ? 'snowy' : 'cloudy';
  } else {
    condition = random.contextRandom(dateSeed + '-other') > 0.6 ? 'cloudy' : 'sunny';
  }

  return {
    condition,
    temperature: 15 + random.contextRandomFloat(dateSeed + '-temp', 0, 20),
    precipitation: condition === 'rainy' ? random.contextRandomFloat(dateSeed + '-precip', 0, 50) : 0,
  };
};

// 날씨 기반 혼잡도 보정
export const adjustCongestionByWeather = (
  baseCongestion: number,
  weather: WeatherData
): number => {
  let adjustment = 0;

  // 비 오는 날은 지하철 이용 증가
  if (weather.condition === 'rainy') {
    adjustment += 0.2;
  }

  // 눈 오는 날은 더 증가
  if (weather.condition === 'snowy') {
    adjustment += 0.3;
  }

  // 맑은 날은 약간 감소 (도보/자전거 이용 증가)
  if (weather.condition === 'sunny' && weather.temperature > 20) {
    adjustment -= 0.1;
  }

  return Math.max(0, Math.min(1, baseCongestion + adjustment));
};

// 이벤트 데이터 (간단한 모의 데이터)
export const getEventData = async (): Promise<EventData[]> => {
  const now = new Date();
  const events: EventData[] = [];

  // 주말 이벤트
  if (now.getDay() === 0 || now.getDay() === 6) {
    events.push({
      name: '주말 관광객',
      location: '명동, 홍대, 강남',
      date: now,
      expectedCrowd: 5000,
    });
  }

  // 특정 날짜 이벤트 (예시)
  const dayOfMonth = now.getDate();
  if (dayOfMonth === 1 || dayOfMonth === 15) {
    events.push({
      name: '월초/월중 출근 러시',
      location: '전체',
      date: now,
      expectedCrowd: 3000,
    });
  }

  return events;
};

// 이벤트 기반 혼잡도 보정
export const adjustCongestionByEvent = (
  baseCongestion: number,
  events: EventData[],
  stationName: string
): number => {
  let adjustment = 0;

  events.forEach((event) => {
    if (event.location.includes(stationName) || event.location === '전체') {
      adjustment += (event.expectedCrowd / 10000) * 0.2;
    }
  });

  return Math.max(0, Math.min(1, baseCongestion + adjustment));
};


