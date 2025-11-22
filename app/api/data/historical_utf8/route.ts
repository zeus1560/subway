import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalData } from '@/lib/cache';
import { readFileSync } from 'fs';
import { join } from 'path';

// CSV 파일 직접 제공 또는 캐시 데이터를 CSV로 변환하여 제공
// GET /api/data/historical_utf8?station={stationId}&line={lineNum}
// station과 line이 없으면 전체 CSV 파일 반환
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stationId = searchParams.get('station');
    const lineNum = searchParams.get('line');

    // station과 line이 지정되지 않으면 원본 CSV 파일 반환
    if (!stationId || !lineNum) {
      try {
        const csvPath = join(process.cwd(), 'subway_passengers.csv');
        const csvContent = readFileSync(csvPath, 'utf-8');
        
        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="historical_utf8.csv"',
          },
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'CSV 파일을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
    }

    // 특정 역의 데이터만 필터링하여 CSV로 반환
    const historicalData = getHistoricalData(stationId, lineNum);

    // CSV 형식으로 변환
    const csvHeader = 'timestamp,stationId,stationName,lineNum,passengerCount,congestionLevel\n';
    const csvRows = historicalData.map((item) => {
      return `${item.timestamp.toISOString()},${item.stationId},${item.stationName},${item.lineNum},${item.passengerCount},${item.congestionLevel}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="historical_${stationId}_${lineNum}.csv"`,
      },
    });
  } catch (error) {
    console.error('CSV 데이터 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

