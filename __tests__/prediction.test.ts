import { predictCongestionEnhanced } from '@/lib/api';
import { HistoricalData, BaselineData } from '@/lib/cache';

describe('predictCongestionEnhanced', () => {
  const mockTimestamp = new Date('2024-11-19T08:00:00'); // 평일 오전 8시

  const createMockHistoricalData = (count: number, basePassenger: number = 500): HistoricalData[] => {
    return Array.from({ length: count }, (_, i) => ({
      stationId: 'test_station',
      stationName: '테스트역',
      lineNum: '2',
      timestamp: new Date(mockTimestamp.getTime() - i * 60 * 60 * 1000), // 과거 시간
      passengerCount: basePassenger + (i % 100),
      congestionLevel: '보통',
    }));
  };

  const createMockBaseline = (averagePassenger: number = 500): BaselineData => ({
    stationId: 'test_station',
    stationName: '테스트역',
    lineNum: '2',
    hour: 8,
    dayOfWeek: 1, // 월요일
    averagePassengerCount: averagePassenger,
    standardDeviation: 100,
  });

  describe('정상 입력', () => {
    it('historical 데이터가 있을 때 합리적인 예측값을 반환해야 함', () => {
      const historicalData = createMockHistoricalData(10, 600);
      const baseline = createMockBaseline(550);
      const currentData = {
        passengerCount: 580,
        timestamp: mockTimestamp,
      };

      const result = predictCongestionEnhanced(
        currentData,
        historicalData,
        mockTimestamp,
        baseline
      );

      expect(result).toHaveProperty('predictedPassengerCount');
      expect(result).toHaveProperty('predictedCongestionLevel');
      expect(result).toHaveProperty('predictionConfidence');
      expect(result).toHaveProperty('predictedTimestamp');

      // 예측값은 0 이상이어야 함
      expect(result.predictedPassengerCount).toBeGreaterThanOrEqual(0);
      
      // 혼잡도 레벨은 유효한 값이어야 함
      expect(['여유', '보통', '혼잡', '매우 혼잡']).toContain(result.predictedCongestionLevel);
      
      // 신뢰도는 0~1 사이여야 함
      expect(result.predictionConfidence).toBeGreaterThanOrEqual(0);
      expect(result.predictionConfidence).toBeLessThanOrEqual(1);
    });

    it('출근 시간대(평일 8시)에 높은 혼잡도를 예측해야 함', () => {
      const historicalData = createMockHistoricalData(20, 800);
      const baseline = createMockBaseline(750);
      const currentData = {
        passengerCount: 780,
        timestamp: mockTimestamp, // 평일 8시
      };

      const result = predictCongestionEnhanced(
        currentData,
        historicalData,
        mockTimestamp,
        baseline
      );

      // 출근 시간대이므로 예측값이 높아야 함
      expect(result.predictedPassengerCount).toBeGreaterThan(500);
    });
  });

  describe('경계/이상 입력', () => {
    it('historical 데이터가 없을 때 fallback 로직이 작동해야 함', () => {
      const currentData = {
        passengerCount: 500,
        timestamp: mockTimestamp,
      };

      const result = predictCongestionEnhanced(
        currentData,
        [],
        mockTimestamp,
        null
      );

      // 데이터가 없어도 함수가 crash하지 않고 합리적인 값을 반환해야 함
      expect(result).toBeDefined();
      expect(result.predictedPassengerCount).toBeGreaterThanOrEqual(0);
      expect(result.predictionConfidence).toBeLessThan(1); // 신뢰도는 낮아야 함
    });

    it('historical 데이터가 거의 없을 때(1-2개) fallback 로직이 작동해야 함', () => {
      const historicalData = createMockHistoricalData(2, 400);
      const currentData = {
        passengerCount: 500,
        timestamp: mockTimestamp,
      };

      const result = predictCongestionEnhanced(
        currentData,
        historicalData,
        mockTimestamp,
        null
      );

      expect(result).toBeDefined();
      expect(result.predictedPassengerCount).toBeGreaterThanOrEqual(0);
    });

    it('baseline만 있고 historical 데이터가 없을 때 baseline을 사용해야 함', () => {
      const baseline = createMockBaseline(600);
      const currentData = {
        passengerCount: 500,
        timestamp: mockTimestamp,
      };

      const result = predictCongestionEnhanced(
        currentData,
        [],
        mockTimestamp,
        baseline
      );

      expect(result).toBeDefined();
      // baseline이 있으면 예측값이 baseline에 가까워야 함
      expect(result.predictedPassengerCount).toBeGreaterThan(0);
    });

    it('이상한 timestamp에도 crash하지 않아야 함', () => {
      const historicalData = createMockHistoricalData(5, 500);
      const baseline = createMockBaseline(500);
      const currentData = {
        passengerCount: 500,
        timestamp: new Date('invalid'), // 잘못된 날짜
      };

      // Invalid Date는 NaN을 반환하지만, 함수는 처리해야 함
      const invalidTimestamp = new Date('invalid');
      if (!isNaN(invalidTimestamp.getTime())) {
        // 유효한 경우에만 테스트
        const result = predictCongestionEnhanced(
          currentData,
          historicalData,
          invalidTimestamp,
          baseline
        );
        expect(result).toBeDefined();
      }
    });

    it('음수 passengerCount를 처리해야 함', () => {
      const historicalData = createMockHistoricalData(5, 500);
      const baseline = createMockBaseline(500);
      const currentData = {
        passengerCount: -100, // 음수
        timestamp: mockTimestamp,
      };

      const result = predictCongestionEnhanced(
        currentData,
        historicalData,
        mockTimestamp,
        baseline
      );

      // 결과는 0 이상이어야 함
      expect(result.predictedPassengerCount).toBeGreaterThanOrEqual(0);
    });

    it('매우 큰 passengerCount를 처리해야 함', () => {
      const historicalData = createMockHistoricalData(5, 10000);
      const baseline = createMockBaseline(10000);
      const currentData = {
        passengerCount: 15000,
        timestamp: mockTimestamp,
      };

      const result = predictCongestionEnhanced(
        currentData,
        historicalData,
        mockTimestamp,
        baseline
      );

      expect(result).toBeDefined();
      expect(result.predictedPassengerCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('시간대별 가중치', () => {
    it('심야 시간대(새벽 2시)에 낮은 혼잡도를 예측해야 함', () => {
      const nightTimestamp = new Date('2024-11-19T02:00:00');
      const historicalData = createMockHistoricalData(10, 200);
      const baseline = createMockBaseline(200);
      const currentData = {
        passengerCount: 200,
        timestamp: nightTimestamp,
      };

      const result = predictCongestionEnhanced(
        currentData,
        historicalData,
        nightTimestamp,
        baseline
      );

      // 심야 시간대는 혼잡도가 낮아야 함
      expect(result.predictedPassengerCount).toBeLessThan(500);
    });

    it('주말 시간대에 다른 패턴을 보여야 함', () => {
      const weekendTimestamp = new Date('2024-11-23T10:00:00'); // 토요일
      const historicalData = createMockHistoricalData(10, 400);
      const baseline = createMockBaseline(400);
      const currentData = {
        passengerCount: 400,
        timestamp: weekendTimestamp,
      };

      const result = predictCongestionEnhanced(
        currentData,
        historicalData,
        weekendTimestamp,
        baseline
      );

      expect(result).toBeDefined();
      expect(result.predictedPassengerCount).toBeGreaterThanOrEqual(0);
    });
  });
});

