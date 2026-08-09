'use client';

import { Sparkles } from 'lucide-react';

export type CongestionLevel = '여유' | '보통' | '주의' | '혼잡';

interface CarCongestion {
  carNumber: number; // 1~10
  level: CongestionLevel;
  percentage: number;
  isRecommended?: boolean;
}

interface CarCongestionGridProps {
  cars: CarCongestion[];
}

const CONGESTION_COLORS: Record<CongestionLevel, { bg: string; text: string }> = {
  '여유': {
    bg: '#dcfce7',
    text: '#166534',
  },
  '보통': {
    bg: '#fef9c3',
    text: '#854d0e',
  },
  '주의': {
    bg: '#fed7aa',
    text: '#9a3412',
  },
  '혼잡': {
    bg: '#fee2e2',
    text: '#991b1b',
  },
};

export default function CarCongestionGrid({ cars }: CarCongestionGridProps) {
  if (cars.length === 0) {
    return (
      <div className="text-center py-12 text-[#8A90A2]">
        칸별 혼잡도 데이터가 없습니다.
      </div>
    );
  }

  return (
    <section className="w-full mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-[16px] p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-[#111827] dark:text-white mb-6">
          칸별 혼잡도
        </h3>

        {/* 범례 - 상단 고정 */}
        <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22C55E' }}></span>
            여유
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FACC15' }}></span>
            보통
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FB923C' }}></span>
            주의
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }}></span>
            혼잡
          </span>
        </div>

        {/* 칸별 카드 그리드 */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-4">
          {cars.map((car) => {
            const color = CONGESTION_COLORS[car.level];
            const isRecommended = car.isRecommended || false;

            return (
              <div
                key={car.carNumber}
                className={`relative rounded-xl p-3 bg-bg-card flex flex-col items-center gap-2 transition-all ${
                  isRecommended ? 'ring-2 ring-brand-primary ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: color.bg,
                  minWidth: '72px',
                  minHeight: '80px',
                }}
              >
                {/* AI 추천 배지 - 상단 오른쪽 */}
                {isRecommended && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <span className="text-xs bg-brand-primary/20 text-brand-primary px-2 py-1 rounded-full">
                      AI 추천
                    </span>
                  </div>
                )}

                {/* 상단: 칸 번호 */}
                <div className="text-sm font-bold" style={{ color: color.text }}>
                  {car.carNumber}칸
                </div>

                {/* 중앙: 혼잡도 레벨 */}
                <div className="text-xs font-semibold" style={{ color: color.text }}>
                  {car.level}
                </div>

                {/* 하단: 퍼센트 (선택적) */}
                <div className="text-[10px] opacity-75" style={{ color: color.text }}>
                  {car.percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

