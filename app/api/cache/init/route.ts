import { NextResponse } from 'next/server';
import { initializeCache } from '@/lib/cache';

// 캐시 초기화 API
// GET /api/cache/init
export async function GET() {
  try {
    await initializeCache();
    return NextResponse.json({
      success: true,
      message: '캐시가 성공적으로 초기화되었습니다.',
    });
  } catch (error) {
    console.error('캐시 초기화 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '캐시 초기화 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

