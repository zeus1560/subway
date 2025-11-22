// Next.js 환경 설정 (가장 먼저)
process.env.NODE_ENV = 'test';

import { GET } from '@/app/api/data/route';
import { NextRequest } from 'next/server';
import { setHistoricalData, clearHistoricalCache } from '@/lib/cache';
import { HistoricalData } from '@/lib/cache';

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

describe('/api/data', () => {
  beforeEach(() => {
    clearHistoricalCache();
  });

  const createMockRequest = (searchParams: Record<string, string>): NextRequest => {
    const url = new URL('http://localhost/api/data');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  describe('정상 케이스', () => {
    it('historical 타입 요청 시 데이터를 반환해야 함', async () => {
      // 테스트 데이터 설정
      const mockData: HistoricalData[] = [
        {
          stationId: 'test_station',
          stationName: '테스트역',
          lineNum: '2',
          timestamp: new Date('2024-11-19T08:00:00'),
          passengerCount: 500,
          congestionLevel: '보통',
        },
      ];
      setHistoricalData('test_station', '2', mockData);

      const request = createMockRequest({
        type: 'historical',
        station: 'test_station',
        line: '2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('stationId', 'test_station');
      expect(data.data).toHaveProperty('lineNum', '2');
      expect(data.data.historical).toHaveLength(1);
      expect(data.data.historical[0].passengerCount).toBe(500);
    });

    it('baseline 타입 요청 시 안내 메시지를 반환해야 함', async () => {
      const request = createMockRequest({
        type: 'baseline',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('message');
    });
  });

  describe('파라미터 누락', () => {
    it('type 파라미터가 없으면 400 에러를 반환해야 함', async () => {
      const request = createMockRequest({});

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('type 파라미터');
    });

    it('historical 타입에서 station 파라미터가 없으면 400 에러를 반환해야 함', async () => {
      const request = createMockRequest({
        type: 'historical',
        line: '2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('station');
    });

    it('historical 타입에서 line 파라미터가 없으면 400 에러를 반환해야 함', async () => {
      const request = createMockRequest({
        type: 'historical',
        station: 'test_station',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('line');
    });
  });

  describe('이상 값 처리', () => {
    it('지원하지 않는 type에 대해 400 에러를 반환해야 함', async () => {
      const request = createMockRequest({
        type: 'invalid_type',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('지원하지 않는 타입');
    });

    it('존재하지 않는 역에 대해 빈 배열을 반환해야 함', async () => {
      const request = createMockRequest({
        type: 'historical',
        station: 'nonexistent_station',
        line: '1',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.historical).toEqual([]);
    });
  });

  describe('에러 처리', () => {
    it('예외 발생 시 500 에러를 반환해야 함', async () => {
      // 캐시 함수를 mock하여 에러 발생시키기
      jest.spyOn(require('@/lib/cache'), 'getHistoricalData').mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = createMockRequest({
        type: 'historical',
        station: 'test_station',
        line: '2',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();

      // Mock 복원
      jest.restoreAllMocks();
    });
  });
});

