import {
  setHistoricalData,
  getHistoricalData,
  clearHistoricalCache,
  setBaselineData,
  getBaselineData,
  clearBaselineCache,
  HistoricalData,
  BaselineData,
} from '@/lib/cache';

describe('Cache System', () => {
  beforeEach(() => {
    clearHistoricalCache();
    clearBaselineCache();
  });

  describe('Historical Data Cache', () => {
    const mockHistoricalData: HistoricalData[] = [
      {
        stationId: 'test_station_1',
        stationName: '테스트역1',
        lineNum: '2',
        timestamp: new Date('2024-11-19T08:00:00'),
        passengerCount: 500,
        congestionLevel: '보통',
      },
      {
        stationId: 'test_station_1',
        stationName: '테스트역1',
        lineNum: '2',
        timestamp: new Date('2024-11-19T09:00:00'),
        passengerCount: 600,
        congestionLevel: '혼잡',
      },
    ];

    it('데이터를 저장하고 조회할 수 있어야 함', () => {
      setHistoricalData('test_station_1', '2', mockHistoricalData);
      
      const result = getHistoricalData('test_station_1', '2');
      
      expect(result).toHaveLength(2);
      expect(result[0].stationId).toBe('test_station_1');
      expect(result[0].lineNum).toBe('2');
      expect(result[0].passengerCount).toBe(500);
    });

    it('존재하지 않는 역에 대해 빈 배열을 반환해야 함', () => {
      const result = getHistoricalData('nonexistent_station', '1');
      
      expect(result).toEqual([]);
    });

    it('캐시를 초기화하면 모든 데이터가 삭제되어야 함', () => {
      setHistoricalData('test_station_1', '2', mockHistoricalData);
      clearHistoricalCache();
      
      const result = getHistoricalData('test_station_1', '2');
      expect(result).toEqual([]);
    });

    it('같은 역에 다른 노선 데이터를 별도로 저장할 수 있어야 함', () => {
      const line2Data: HistoricalData[] = [
        {
          stationId: 'test_station_1',
          stationName: '테스트역1',
          lineNum: '2',
          timestamp: new Date('2024-11-19T08:00:00'),
          passengerCount: 500,
          congestionLevel: '보통',
        },
      ];
      
      const line3Data: HistoricalData[] = [
        {
          stationId: 'test_station_1',
          stationName: '테스트역1',
          lineNum: '3',
          timestamp: new Date('2024-11-19T08:00:00'),
          passengerCount: 300,
          congestionLevel: '여유',
        },
      ];

      setHistoricalData('test_station_1', '2', line2Data);
      setHistoricalData('test_station_1', '3', line3Data);

      const result2 = getHistoricalData('test_station_1', '2');
      const result3 = getHistoricalData('test_station_1', '3');

      expect(result2).toHaveLength(1);
      expect(result3).toHaveLength(1);
      // lineNum은 저장된 데이터의 lineNum을 확인
      expect(result2[0].lineNum).toBe('2');
      expect(result3[0].lineNum).toBe('3');
      // passengerCount로도 구분 가능
      expect(result2[0].passengerCount).toBe(500);
      expect(result3[0].passengerCount).toBe(300);
    });

    it('빈 배열을 저장하고 조회할 수 있어야 함', () => {
      setHistoricalData('test_station_1', '2', []);
      const result = getHistoricalData('test_station_1', '2');
      expect(result).toEqual([]);
    });
  });

  describe('Baseline Data Cache', () => {
    const mockBaseline: BaselineData = {
      stationId: 'test_station_1',
      stationName: '테스트역1',
      lineNum: '2',
      hour: 8,
      dayOfWeek: 1, // 월요일
      averagePassengerCount: 550,
      standardDeviation: 100,
    };

    it('baseline 데이터를 저장하고 조회할 수 있어야 함', () => {
      setBaselineData('test_station_1', '2', 8, 1, mockBaseline);
      
      const result = getBaselineData('test_station_1', '2', 8, 1);
      
      expect(result).not.toBeNull();
      if (result) {
        expect(result.stationId).toBe('test_station_1');
        expect(result.lineNum).toBe('2');
        expect(result.hour).toBe(8);
        expect(result.dayOfWeek).toBe(1);
        expect(result.averagePassengerCount).toBe(550);
        expect(result.standardDeviation).toBe(100);
      }
    });

    it('존재하지 않는 baseline에 대해 null을 반환해야 함', () => {
      const result = getBaselineData('nonexistent_station', '1', 8, 1);
      expect(result).toBeNull();
    });

    it('다른 시간대의 baseline은 별도로 저장되어야 함', () => {
      const baseline8am: BaselineData = {
        ...mockBaseline,
        hour: 8,
        averagePassengerCount: 550,
      };
      
      const baseline9am: BaselineData = {
        ...mockBaseline,
        hour: 9,
        averagePassengerCount: 600,
      };

      setBaselineData('test_station_1', '2', 8, 1, baseline8am);
      setBaselineData('test_station_1', '2', 9, 1, baseline9am);

      const result8 = getBaselineData('test_station_1', '2', 8, 1);
      const result9 = getBaselineData('test_station_1', '2', 9, 1);

      expect(result8).not.toBeNull();
      expect(result9).not.toBeNull();
      if (result8 && result9) {
        expect(result8.averagePassengerCount).toBe(550);
        expect(result9.averagePassengerCount).toBe(600);
      }
    });

    it('다른 요일의 baseline은 별도로 저장되어야 함', () => {
      const weekdayBaseline: BaselineData = {
        ...mockBaseline,
        dayOfWeek: 1, // 월요일
        averagePassengerCount: 550,
      };
      
      const weekendBaseline: BaselineData = {
        ...mockBaseline,
        dayOfWeek: 0, // 일요일
        averagePassengerCount: 400,
      };

      setBaselineData('test_station_1', '2', 8, 1, weekdayBaseline);
      setBaselineData('test_station_1', '2', 8, 0, weekendBaseline);

      const resultWeekday = getBaselineData('test_station_1', '2', 8, 1);
      const resultWeekend = getBaselineData('test_station_1', '2', 8, 0);

      expect(resultWeekday).not.toBeNull();
      expect(resultWeekend).not.toBeNull();
      if (resultWeekday && resultWeekend) {
        expect(resultWeekday.averagePassengerCount).toBe(550);
        expect(resultWeekend.averagePassengerCount).toBe(400);
      }
    });

    it('baseline 캐시를 초기화하면 모든 데이터가 삭제되어야 함', () => {
      setBaselineData('test_station_1', '2', 8, 1, mockBaseline);
      clearBaselineCache();
      
      const result = getBaselineData('test_station_1', '2', 8, 1);
      expect(result).toBeNull();
    });
  });
});

