'use client';

import { Clock, DollarSign, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export type RouteSortOption = 'lessCrowded' | 'minTime' | 'lowerFare';

interface RouteResultSummaryProps {
  totalMinutes: number | null;
  fare: number | null;
  transfers: number;
  isBest?: boolean;
  onSortChange?: (option: RouteSortOption) => void;
}

export default function RouteResultSummary({
  totalMinutes,
  fare,
  transfers,
  isBest = false,
  onSortChange,
}: RouteResultSummaryProps) {
  const [selectedOption, setSelectedOption] = useState<RouteSortOption>('minTime');
  const totalLabel = totalMinutes != null ? `${totalMinutes}분` : '시간 정보 없음';
  const fareLabel = fare != null ? `${fare.toLocaleString()}원` : null;

  const handleOptionClick = (option: RouteSortOption) => {
    setSelectedOption(option);
    onSortChange?.(option);
  };

  return (
    <>
      {/* 요약 한 줄 */}
      <div className="text-sm text-text-strong font-medium mb-2">
        {totalLabel} · {fareLabel || '요금 정보 없음'} · 환승 {transfers}회
      </div>

      {/* 옵션 버튼 세그먼트 토글 */}
      <div className="flex bg-bg-subtle rounded-full p-1 mb-4">
        <button
          onClick={() => handleOptionClick('lessCrowded')}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedOption === 'lessCrowded'
              ? 'bg-brand-primary text-white'
              : 'text-text-muted'
          }`}
        >
          혼잡도 낮음
        </button>
        <button
          onClick={() => handleOptionClick('minTime')}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedOption === 'minTime'
              ? 'bg-brand-primary text-white'
              : 'text-text-muted'
          }`}
        >
          최소시간
        </button>
        <button
          onClick={() => handleOptionClick('lowerFare')}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedOption === 'lowerFare'
              ? 'bg-brand-primary text-white'
              : 'text-text-muted'
          }`}
        >
          요금낮음
        </button>
      </div>

      {/* 상세 요약 카드 */}
      <div className="bg-white dark:bg-gray-800 rounded-[16px] p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 요약 정보 */}
          <div className="flex items-center gap-6">
            {isBest && (
              <span className="px-3 py-1 bg-[#2979FF] text-white rounded-[14px] text-xs font-bold">
                최적
              </span>
            )}
            
            <div className="flex items-center gap-2">
              <Clock className="w-[20px] h-[20px] text-[#2979FF]" />
              <div>
                <div className="text-xs text-[#8A90A2] mb-1">총 소요 시간</div>
                <div className="text-2xl font-bold text-[#111827] dark:text-white">
                  {totalLabel}
                </div>
              </div>
            </div>

            {transfers > 0 && (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-[20px] h-[20px] text-[#8B5CF6]" />
                <div>
                  <div className="text-xs text-[#8A90A2] mb-1">환승</div>
                  <div className="text-xl font-bold text-[#111827] dark:text-white">
                    {transfers}회
                  </div>
                </div>
              </div>
            )}

            {fareLabel && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-[20px] h-[20px] text-[#8B5CF6]" />
                <div>
                  <div className="text-xs text-[#8A90A2] mb-1">요금</div>
                  <div className="text-xl font-bold text-[#111827] dark:text-white">
                    {fareLabel}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

