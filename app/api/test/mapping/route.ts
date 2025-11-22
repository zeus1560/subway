// 역명 매칭 테스트 API
// GET /api/test/mapping

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV } from '@/lib/csvParser';
import { collectStationMappingStats } from '@/lib/stationNameMapper';
import iconv from 'iconv-lite';

// 인코딩 감지 및 변환 (EUC-KR/CP949 -> UTF-8)
function readCSVWithEncoding(filePath: string): string {
  const buffer = readFileSync(filePath);
  
  // CP949 (Windows 한국어 인코딩)로 먼저 시도 (한국 CSV 파일은 대부분 CP949)
  try {
    const cp949Text = iconv.decode(buffer, 'cp949');
    const cp949KoreanCount = (cp949Text.match(/[가-힣]/g) || []).length;
    // 한글 문자가 충분히 많으면 (헤더 + 데이터에 한글이 많음)
    if (cp949KoreanCount > 10000) {
      return cp949Text;
    }
  } catch {
    // CP949 변환 실패
  }
  
  // EUC-KR로 시도
  try {
    const eucKrText = iconv.decode(buffer, 'euc-kr');
    const eucKrKoreanCount = (eucKrText.match(/[가-힣]/g) || []).length;
    if (eucKrKoreanCount > 10000) {
      return eucKrText;
    }
  } catch {
    // EUC-KR 변환 실패
  }
  
  // 마지막으로 UTF-8로 시도
  try {
    const utf8Text = buffer.toString('utf-8');
    const utf8KoreanCount = (utf8Text.match(/[가-힣]/g) || []).length;
    if (utf8KoreanCount > 10000) {
      return utf8Text;
    }
  } catch {
    // UTF-8 변환 실패
  }
  
  // 기본값: CP949로 반환 (한국 CSV 파일이므로)
  return iconv.decode(buffer, 'cp949');
}

export async function GET() {
  try {
    // CSV 파일 읽기 (인코딩 자동 감지)
    const csvPath = join(process.cwd(), 'subway_passengers.csv');
    const csvText = readCSVWithEncoding(csvPath);

    // 디버깅: 인코딩 확인
    const koreanCharCount = (csvText.match(/[가-힣]/g) || []).length;
    const sampleText = csvText.substring(0, 500);
    console.log('[Test Mapping] 한글 문자 개수:', koreanCharCount);
    console.log('[Test Mapping] 샘플 텍스트:', sampleText);

    // CSV 파싱
    const csvRows = parseCSV(csvText);
    
    // 디버깅: 파싱된 첫 몇 개 행 확인
    if (csvRows.length > 0) {
      console.log('[Test Mapping] 첫 번째 행:', {
        date: csvRows[0].date,
        lineNum: csvRows[0].lineNum,
        stationName: csvRows[0].stationName,
        stationNameBytes: Buffer.from(csvRows[0].stationName).toString('hex'),
      });
    }

    // 역명 매칭 통계 수집
    const stats = collectStationMappingStats(csvRows);

    // 고유한 매칭 실패 역 목록 (중복 제거)
    const uniqueUnmatched = Array.from(
      new Map(stats.unmatchedStations.map(s => [`${s.lineNum}_${s.name}`, s])).values()
    ).slice(0, 50); // 최대 50개

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: csvRows.length,
        matched: stats.matched,
        unmatched: stats.unmatched,
        successRate: ((stats.matched / (stats.matched + stats.unmatched)) * 100).toFixed(2) + '%',
      },
      unmatchedStations: uniqueUnmatched,
      message: `총 ${csvRows.length}개 행 중 ${stats.matched}개 매칭 성공, ${stats.unmatched}개 매칭 실패`,
    });
  } catch (error) {
    console.error('[Test Mapping API] 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

