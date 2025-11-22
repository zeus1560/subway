import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// 열차 칸별 혼잡도 API
// 쿼리 파라미터: line, station, direction
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const line = searchParams.get('line');
    const station = searchParams.get('station');
    const direction = searchParams.get('direction');
    const isNext = searchParams.get('next') === 'true'; // 다음 열차 여부
    const timestampParam = searchParams.get('timestamp'); // 예측 시간 (ISO 문자열)

    // timestamp가 제공되면 사용, 없으면 현재 시간 사용
    const predictionTime = timestampParam ? new Date(timestampParam) : new Date();

    logger.info('열차 칸별 혼잡도 API 요청', { line, station, direction, isNext, timestamp: predictionTime.toISOString() });

    // 필수 파라미터 검증
    if (!line || !station || !direction) {
      logger.warn('필수 파라미터 누락', { line, station, direction });
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다. line, station, direction이 필요합니다.' },
        { status: 400 }
      );
    }

    // direction 값 검증
    if (direction !== 'UP' && direction !== 'DOWN') {
      logger.warn('잘못된 direction 값', { direction });
      return NextResponse.json(
        { error: 'direction은 UP 또는 DOWN이어야 합니다.' },
        { status: 400 }
      );
    }

            // 실제 혼잡도 데이터 조회 (향후 실제 API 연동 가능)
            // 현재는 예측 시간 기반 모의 데이터 반환
            // TODO: 실제 지하철 API 연동 시 아래 주석 해제
            // const realData = await fetchRealTimeCongestion(line, station, direction, isNext);
            // if (realData) return NextResponse.json({ success: true, data: realData });
            
            const cars = generateMockCarData(line, station, direction, isNext, predictionTime);

    logger.debug('열차 칸별 혼잡도 데이터 생성 완료', { carCount: cars.length });

    return NextResponse.json({
      success: true,
      data: {
        line,
        station,
        direction,
        cars,
        isNext,
      },
    });
  } catch (error) {
    logger.error('열차 칸별 혼잡도 API 오류', error as Error, {
      url: request.url,
      searchParams: Object.fromEntries(request.nextUrl.searchParams),
    });
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 모의 데이터 생성 함수 (실제 API 연동 시 제거)
function generateMockCarData(
  line: string,
  station: string,
  direction: string,
  isNext: boolean = false,
  predictionTime: Date = new Date()
): Array<{ carNo: number; congestionLevel: string; value: number }> {
  const cars = Array.from({ length: 10 }, (_, i) => i + 1);
  const hour = predictionTime.getHours();
  const dayOfWeek = predictionTime.getDay();
  
  // 시간대별 기본 혼잡도
  let baseCongestion = 50;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20);
  
  if (isWeekday && isRushHour) {
    baseCongestion = 70;
  } else if (isWeekday && hour >= 10 && hour <= 17) {
    baseCongestion = 55;
  } else {
    baseCongestion = 40;
  }

  // 다음 열차는 약간 다른 혼잡도 패턴 (보통 조금 더 여유로움)
  if (isNext) {
    baseCongestion = Math.max(0, baseCongestion - 5); // 다음 열차는 약간 더 여유로움
  }

  // 시드 생성 (같은 역/방향에서 일관된 패턴 유지)
  const seed = `${line}_${station}_${direction}_${isNext ? 'next' : 'current'}`;
  let seedValue = 0;
  for (let i = 0; i < seed.length; i++) {
    seedValue += seed.charCodeAt(i);
  }

  return cars.map((carNo) => {
    // 일반적인 패턴: 중간 칸(5-6칸)이 가장 혼잡, 양 끝 칸(1, 10칸)이 여유
    let carCongestion = baseCongestion;
    
    if (carNo === 5 || carNo === 6) {
      carCongestion = baseCongestion + 20;
    } else if (carNo === 1 || carNo === 10) {
      carCongestion = baseCongestion - 20;
    } else if (carNo === 2 || carNo === 9) {
      carCongestion = baseCongestion - 10;
    }
    
    // 시드 기반 랜덤 변동 (일관성 유지)
    const randomSeed = (seedValue + carNo * 17) % 100;
    carCongestion += (randomSeed % 15) - 7;
    carCongestion = Math.max(0, Math.min(100, carCongestion));
    
    // 혼잡도 레벨 결정
    let congestionLevel: string;
    if (carCongestion < 30) {
      congestionLevel = '여유';
    } else if (carCongestion < 50) {
      congestionLevel = '보통';
    } else if (carCongestion < 70) {
      congestionLevel = '주의';
    } else {
      congestionLevel = '혼잡';
    }
    
    return {
      carNo,
      congestionLevel,
      value: carCongestion,
    };
  });
}


