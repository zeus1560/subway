import { NextRequest, NextResponse } from 'next/server';
import { predictCongestionEnhanced } from '@/lib/api';
import { getHistoricalData, getBaselineData, initializeCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

// 캐시가 초기화되지 않았으면 초기화
let cacheInitialized = false;

// 혼잡도 예측 API
// POST /api/predict
// Body: { stationId, stationName, lineNum, currentPassengerCount?, timestamp? }
export async function POST(request: NextRequest) {
  try {
    // 캐시 초기화 (최초 1회만)
    if (!cacheInitialized) {
      try {
        logger.info('예측 API: 캐시 초기화 시작');
        await initializeCache();
        cacheInitialized = true;
        logger.info('예측 API: 캐시 초기화 완료');
      } catch (error) {
        logger.warn('예측 API: 캐시 초기화 실패, 계속 진행', { error });
      }
    }

    const body = await request.json();
    const { stationId, stationName, lineNum, currentPassengerCount, timestamp } = body;

    logger.info('예측 API 요청', { stationId, stationName, lineNum });

    if (!stationId || !stationName || !lineNum) {
      logger.warn('예측 API: 필수 파라미터 누락', { body });
      return NextResponse.json(
        { error: 'stationId, stationName, lineNum이 필요합니다.' },
        { status: 400 }
      );
    }

    // 현재 시간 또는 제공된 타임스탬프 사용
    const now = timestamp ? new Date(timestamp) : new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // 캐시에서 과거 데이터 및 기준선 데이터 조회
    const historicalData = getHistoricalData(stationId, lineNum);
    const baseline = getBaselineData(stationId, lineNum, currentHour, currentDay);

    logger.debug('예측 데이터 조회', {
      stationId,
      historicalDataCount: historicalData.length,
      hasBaseline: !!baseline,
    });

    // 현재 승객 수 (제공되지 않으면 기본값 사용)
    const currentData = {
      passengerCount: currentPassengerCount || 500,
      timestamp: now,
    };

    // 고급 예측 함수 호출
    const prediction = predictCongestionEnhanced(
      currentData,
      historicalData,
      now,
      baseline
    );

    logger.info('예측 완료', {
      stationId,
      predictedPassengerCount: prediction.predictedPassengerCount,
      confidence: prediction.predictionConfidence,
    });

    return NextResponse.json({
      success: true,
      data: {
        stationId,
        stationName,
        lineNum,
        current: {
          passengerCount: currentData.passengerCount,
          timestamp: now.toISOString(),
        },
        predicted: {
          passengerCount: prediction.predictedPassengerCount,
          congestionLevel: prediction.predictedCongestionLevel,
          confidence: prediction.predictionConfidence,
          timestamp: prediction.predictedTimestamp?.toISOString() || now.toISOString(),
        },
        baseline: baseline ? {
          averagePassengerCount: baseline.averagePassengerCount,
          standardDeviation: baseline.standardDeviation,
        } : null,
      },
    });
  } catch (error) {
    logger.error('예측 API 오류', error as Error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

