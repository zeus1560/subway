import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalData, initializeCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

// 캐시가 초기화되지 않았으면 초기화
let cacheInitialized = false;

// 데이터 제공 API
// GET /api/data?type=historical&station={stationId}&line={lineNum}
export async function GET(request: NextRequest) {
  try {
    // 캐시 초기화 (최초 1회만)
    if (!cacheInitialized) {
      try {
        logger.info('캐시 초기화 시작');
        await initializeCache();
        cacheInitialized = true;
        logger.info('캐시 초기화 완료');
      } catch (error) {
        logger.warn('캐시 초기화 실패, 계속 진행', { error });
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'historical' 또는 'baseline'
    const stationId = searchParams.get('station');
    const lineNum = searchParams.get('line');

    logger.info('데이터 API 요청', { type, stationId, lineNum });

    if (!type) {
      logger.warn('type 파라미터 누락');
      return NextResponse.json(
        { error: 'type 파라미터가 필요합니다. (historical 또는 baseline)' },
        { status: 400 }
      );
    }

    if (type === 'historical') {
      if (!stationId || !lineNum) {
        logger.warn('historical 타입 요청 시 필수 파라미터 누락', { stationId, lineNum });
        return NextResponse.json(
          { error: 'historical 타입의 경우 station과 line 파라미터가 필요합니다.' },
          { status: 400 }
        );
      }

      // 캐시에서 과거 데이터 조회
      const historicalData = getHistoricalData(stationId, lineNum);
      
      logger.info('과거 데이터 조회 완료', { 
        stationId, 
        lineNum, 
        dataCount: historicalData.length 
      });

      return NextResponse.json({
        success: true,
        data: {
          stationId,
          lineNum,
          historical: historicalData.map((item) => ({
            ...item,
            timestamp: item.timestamp.toISOString(),
          })),
        },
      });
    } else if (type === 'baseline') {
      // baseline 데이터는 별도 엔드포인트로 분리 가능
      return NextResponse.json({
        success: true,
        data: {
          message: 'baseline 데이터는 /api/data/baseline 엔드포인트를 사용하세요.',
        },
      });
    } else {
      logger.warn('지원하지 않는 타입', { type });
      return NextResponse.json(
        { error: '지원하지 않는 타입입니다.' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('데이터 API 오류', error as Error, {
      url: request.url,
      searchParams: Object.fromEntries(request.nextUrl.searchParams),
    });
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

