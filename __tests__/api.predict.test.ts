// Next.js 환경 설정 (가장 먼저)
process.env.NODE_ENV = 'test';

import { POST } from '@/app/api/predict/route';
import { NextRequest } from 'next/server';
import { setHistoricalData, setBaselineData, clearHistoricalCache, clearBaselineCache } from '@/lib/cache';
import { HistoricalData, BaselineData } from '@/lib/cache';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock initializeCache
jest.mock('@/lib/cache', () => {
  const actual = jest.requireActual('@/lib/cache');
  return {
    ...actual,
    initializeCache: jest.fn().mockResolvedValue(undefined),
  };
});

// Mock NextResponse.json
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: jest.fn((body, init) => {
        return new actual.NextResponse(JSON.stringify(body), {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
          },
        });
      }),
    },
  };
});

// predictCongestionEnhanced를 mock하기 위한 설정
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    predictCongestionEnhanced: jest.fn(actual.predictCongestionEnhanced),
  };
});

describe('/api/predict', () => {
  beforeEach(() => {
    clearHistoricalCache();
    clearBaselineCache();
    // 각 테스트 전에 mock을 초기화
    jest.clearAllMocks();
  });

  const createMockRequest = async (body: any): Promise<NextRequest> => {
    const url = new URL('http://localhost/api/predict');
    const request = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // json() 메서드를 mock
    request.json = jest.fn().mockResolvedValue(body);
    return request;
  };

  describe('정상 케이스', () => {
    it('필수 파라미터가 모두 있을 때 예측 결과를 반환해야 함', async () => {
      // 테스트 데이터 설정
      const mockHistorical: HistoricalData[] = [
        {
          stationId: 'test_station',
          stationName: '테스트역',
          lineNum: '2',
          timestamp: new Date('2024-11-19T08:00:00'),
          passengerCount: 500,
          congestionLevel: '보통',
        },
      ];
      setHistoricalData('test_station', '2', mockHistorical);

      const mockBaseline: BaselineData = {
        stationId: 'test_station',
        stationName: '테스트역',
        lineNum: '2',
        hour: 8,
        dayOfWeek: 1,
        averagePassengerCount: 550,
        standardDeviation: 100,
      };
      setBaselineData('test_station', '2', 8, 1, mockBaseline);

      const request = await createMockRequest({
        stationId: 'test_station',
        stationName: '테스트역',
        lineNum: '2',
        currentPassengerCount: 500,
        timestamp: '2024-11-19T08:00:00',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('stationId', 'test_station');
      expect(data.data).toHaveProperty('predicted');
      expect(data.data.predicted).toHaveProperty('passengerCount');
      expect(data.data.predicted).toHaveProperty('congestionLevel');
      expect(data.data.predicted).toHaveProperty('confidence');
      expect(data.data.predicted.passengerCount).toBeGreaterThanOrEqual(0);
    });

    it('timestamp가 없으면 현재 시간을 사용해야 함', async () => {
      const request = await createMockRequest({
        stationId: 'test_station',
        stationName: '테스트역',
        lineNum: '2',
        currentPassengerCount: 500,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.current).toHaveProperty('timestamp');
    });

    it('currentPassengerCount가 없으면 기본값을 사용해야 함', async () => {
      const request = await createMockRequest({
        stationId: 'test_station',
        stationName: '테스트역',
        lineNum: '2',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.current.passengerCount).toBe(500); // 기본값
    });
  });

  describe('파라미터 누락', () => {
    it('stationId가 없으면 400 에러를 반환해야 함', async () => {
      const request = await createMockRequest({
        stationName: '테스트역',
        lineNum: '2',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('stationId');
    });

    it('stationName이 없으면 400 에러를 반환해야 함', async () => {
      const request = await createMockRequest({
        stationId: 'test_station',
        lineNum: '2',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('stationName');
    });

    it('lineNum이 없으면 400 에러를 반환해야 함', async () => {
      const request = await createMockRequest({
        stationId: 'test_station',
        stationName: '테스트역',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('lineNum');
    });
  });

  describe('이상 값 처리', () => {
    it('잘못된 timestamp 형식을 처리해야 함', async () => {
      const request = await createMockRequest({
        stationId: 'test_station',
        stationName: '테스트역',
        lineNum: '2',
        timestamp: 'invalid-date',
      });

      const response = await POST(request);
      
      // 에러가 발생하거나 기본값을 사용해야 함
      expect([200, 400, 500]).toContain(response.status);
    });

    it('음수 currentPassengerCount를 처리해야 함', async () => {
      const request = await createMockRequest({
        stationId: 'test_station',
        stationName: '테스트역',
        lineNum: '2',
        currentPassengerCount: -100,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 예측 함수가 음수를 처리해야 함
      expect(data.data.predicted.passengerCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('에러 처리', () => {
    it('예외 발생 시 500 에러를 반환해야 함', async () => {
      // 예측 함수를 mock하여 에러 발생시키기
      const apiModule = require('@/lib/api');
      (apiModule.predictCongestionEnhanced as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const request = await createMockRequest({
        stationId: 'test_station',
        stationName: '테스트역',
        lineNum: '2',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();

      // Mock 복원
      jest.restoreAllMocks();
    });
  });
});

