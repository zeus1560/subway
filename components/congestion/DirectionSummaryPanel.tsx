'use client';

import { Clock } from 'lucide-react';

export type CongestionLevel = '여유' | '보통' | '주의' | '혼잡';

interface DirectionSummary {
  etaMinutes: number;
  congestionLevel: CongestionLevel;
  relaxedCount: number;
  crowdedCount: number;
}

interface DirectionSummaryPanelProps {
  summary: DirectionSummary;
}

export default function DirectionSummaryPanel({
  summary,
}: DirectionSummaryPanelProps) {

  return (
    <section className="w-full mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-[16px] p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 도착 예정 시간 */}
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#2979FF]" />
            <div>
              <div className="text-xs text-[#8A90A2] mb-1">도착 예정</div>
              <div className="text-xl font-bold text-[#111827] dark:text-white">
                {summary.etaMinutes}분 후
              </div>
            </div>
          </div>

          {/* 오른쪽: 예상 혼잡도 */}
          <div className="text-right">
            <div className="text-xs text-[#8A90A2] mb-1">예상 혼잡도</div>
            <div className={`text-lg font-bold ${
              summary.congestionLevel === '여유' ? 'text-green-600' :
              summary.congestionLevel === '보통' ? 'text-yellow-600' :
              summary.congestionLevel === '주의' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {summary.congestionLevel}
            </div>
          </div>
        </div>

        {/* 요약 정보 */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <div>
              <div className="text-xs text-[#8A90A2]">여유</div>
              <div className="text-sm font-semibold text-[#111827] dark:text-white">
                {summary.relaxedCount}칸
              </div>
            </div>
          </div>
          {summary.crowdedCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div>
                <div className="text-xs text-[#8A90A2]">혼잡</div>
                <div className="text-sm font-semibold text-[#111827] dark:text-white">
                  {summary.crowdedCount}칸
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

