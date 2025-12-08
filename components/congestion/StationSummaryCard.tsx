'use client';

import { Sparkles, Clock } from 'lucide-react';
import { getLineColor } from '@/lib/utils';

interface StationSummaryCardProps {
  lineNum: string;
  stationName: string;
  direction: 'up' | 'down';
  directionText: string;
  arrivalMinutes: number;
  recommendedCars: number[];
  recommendedReason: string;
}

export default function StationSummaryCard({
  lineNum,
  stationName,
  direction,
  directionText,
  arrivalMinutes,
  recommendedCars,
  recommendedReason,
}: StationSummaryCardProps) {
  const recommendedCarsText = recommendedCars.map(n => `${n}칸`).join('·');

  return (
    <section className="w-full mb-8">
      <div className="bg-gradient-to-br from-[#2979FF] via-[#8B5CF6] to-[#2979FF] rounded-[16px] p-6 md:p-8 text-white">
        {/* 상단: 노선/방향 라벨 및 기준역 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg bg-white/20"
              style={{ backgroundColor: getLineColor(lineNum) }}
            >
              {lineNum}호선
            </div>
            <div className="text-sm opacity-90">{directionText}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-75 mb-1">기준역</div>
            <div className="text-lg font-semibold bg-white/20 px-3 py-1.5 rounded-[14px]">
              {stationName}역
            </div>
          </div>
        </div>

        {/* 중앙: 도착 예정 시간 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 opacity-90" />
            <span className="text-sm opacity-90">도착 예정</span>
          </div>
          <div className="text-3xl md:text-4xl font-bold">
            {arrivalMinutes}분 후
          </div>
        </div>

        {/* 하단: AI 추천 탑승 칸 */}
        <div className="pt-6 border-t border-white/20">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-semibold">AI 추천 탑승 칸:</span>
            <span className="text-lg font-bold bg-white/20 px-4 py-2 rounded-[14px]">
              {recommendedCarsText}
            </span>
            <span className="text-xs opacity-90">({recommendedReason})</span>
          </div>
        </div>

        {/* 다음 열차 정보 */}
        <div className="border-t border-border-subtle pt-4 mt-4 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>다음 열차 도착 예정: {arrivalMinutes}분 후</span>
          </div>
        </div>
      </div>
    </section>
  );
}

