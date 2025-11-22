// 푸시 알림 서비스
import { getCurrentUser } from './authService';
import { analyzeUserPattern } from './personalizationService';
import { getStationCongestion, predictCongestion, calculateCongestionLevel } from './api';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

// 알림 권한 요청
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// 알림 전송
export const sendNotification = async (options: NotificationOptions): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('알림 권한이 없습니다.');
    return;
  }

  const notificationOptions: NotificationOptions = {
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    ...options,
  };

  new Notification(options.title, {
    body: options.body,
    icon: notificationOptions.icon,
    badge: notificationOptions.badge,
    tag: options.tag,
    data: options.data,
    requireInteraction: options.requireInteraction,
  });
};

// 혼잡도 알림 설정 저장
export const saveNotificationSettings = (settings: {
  enabled: boolean;
  stationName?: string;
  lineNum?: string;
  threshold?: number; // 혼잡도 임계값 (1-4)
  timeSlots?: number[]; // 알림 받을 시간대
}): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('notification_settings', JSON.stringify(settings));
};

// 알림 설정 조회
export const getNotificationSettings = (): {
  enabled: boolean;
  stationName?: string;
  lineNum?: string;
  threshold?: number;
  timeSlots?: number[];
} => {
  if (typeof window === 'undefined') {
    return { enabled: false };
  }

  try {
    const settings = localStorage.getItem('notification_settings');
    return settings ? JSON.parse(settings) : { enabled: false };
  } catch (error) {
    return { enabled: false };
  }
};

// 혼잡도 알림 체크 및 전송
export const checkAndSendCongestionNotification = async (
  stationName: string,
  lineNum: string,
  congestionLevel: number
): Promise<void> => {
  const settings = getNotificationSettings();
  
  if (!settings.enabled) return;
  if (settings.stationName !== stationName || settings.lineNum !== lineNum) return;
  if (!settings.threshold || congestionLevel < settings.threshold) return;

  const currentHour = new Date().getHours();
  if (settings.timeSlots && !settings.timeSlots.includes(currentHour)) return;

  const levelText = ['여유', '보통', '혼잡', '매우 혼잡'][congestionLevel - 1] || '혼잡';
  
  await sendNotification({
    title: `${stationName} 혼잡도 알림`,
    body: `현재 혼잡도: ${levelText} (${congestionLevel}단계)`,
    tag: `congestion-${stationName}-${lineNum}`,
    data: {
      stationName,
      lineNum,
      congestionLevel,
    },
  });
};

// 주기적 알림 체크 시작
export const startNotificationCheck = (
  intervalMinutes: number = 5,
  checkFunction: () => Promise<void>
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const interval = setInterval(() => {
    checkFunction().catch(console.error);
  }, intervalMinutes * 60 * 1000);

  // 즉시 한 번 실행
  checkFunction().catch(console.error);

  // 정리 함수 반환
  return () => clearInterval(interval);
};

// AI 기반 맞춤형 알림 생성
export const generatePersonalizedNotification = async (): Promise<void> => {
  const user = getCurrentUser();
  if (!user) return;

  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const pattern = analyzeUserPattern(user.id);
  if (pattern.frequentStations.length === 0) return;

  // 가장 자주 이용하는 역 확인
  const topStation = pattern.frequentStations[0];
  const now = new Date();
  const currentHour = now.getHours();

  // 출퇴근 시간대가 아니면 알림 안 보냄
  if (currentHour < 7 || (currentHour > 9 && currentHour < 18) || currentHour > 20) {
    return;
  }

  try {
    // 현재 혼잡도 확인
    const currentData = await getStationCongestion(topStation.station, topStation.line);
    const currentPassengers = currentData?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 500;
    const currentCongestion = calculateCongestionLevel(currentPassengers);

    // 10분 후 예상 혼잡도
    const predictedData = predictCongestion(
      { passengerCount: currentPassengers },
      [{ passengerCount: currentPassengers * 0.9 }]
    );
    const predictedCongestion = calculateCongestionLevel(predictedData.predictedPassengerCount);

    // 혼잡도가 감소하는 경우 알림 전송
    const congestionLevels = ['여유', '보통', '혼잡', '매우 혼잡'];
    const currentLevel = congestionLevels.indexOf(currentCongestion.level);
    const predictedLevel = congestionLevels.indexOf(predictedCongestion.level);

    if (predictedLevel < currentLevel) {
      const reduction = ((currentPassengers - predictedData.predictedPassengerCount) / currentPassengers) * 100;
      
      await sendNotification({
        title: `🚇 ${topStation.station} 혼잡도 알림`,
        body: `지금 출발하면 ${Math.round(reduction)}% 덜 붐빔! (${currentCongestion.level} → ${predictedCongestion.level})`,
        tag: `personalized-${topStation.station}-${topStation.line}`,
        data: {
          stationName: topStation.station,
          lineNum: topStation.line,
          type: 'congestion_reduction',
        },
      });
    } else if (currentLevel >= 2) {
      // 혼잡한 경우 대체 루트 추천
      await sendNotification({
        title: `⚠️ ${topStation.station} 현재 혼잡`,
        body: `${currentCongestion.level} 상태입니다. 대체 루트를 확인해보세요.`,
        tag: `congestion-alert-${topStation.station}-${topStation.line}`,
        data: {
          stationName: topStation.station,
          lineNum: topStation.line,
          type: 'congestion_alert',
        },
      });
    }
  } catch (error) {
    console.error('맞춤형 알림 생성 실패:', error);
  }
};

// 맞춤형 알림 주기적 체크 시작
export const startPersonalizedNotificationCheck = (): (() => void) => {
  return startNotificationCheck(10, generatePersonalizedNotification); // 10분마다 체크
};

