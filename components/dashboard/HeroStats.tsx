'use client';

import { Clock, MapPin, TrendingUp } from 'lucide-react';
import { getLineColor } from '@/lib/utils';

interface HeroStatsProps {
  currentTime: string;
  currentStation: {
    stationName: string;
    lineNum: string;
  } | null;
  currentCongestion: {
    level: number;
    text: string;
    color: string;
  } | null;
  averageWaitTime: number;
  hasIssues: boolean;
  recommendation: string;
}

export default function HeroStats({
  currentTime,
  currentStation,
  currentCongestion,
  averageWaitTime,
  hasIssues,
  recommendation,
}: HeroStatsProps) {
  const getCongestionBgColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-orange-500';
      case 4: return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <section className="w-full mb-8">
      <div className="bg-gradient-to-br from-[#2979FF] via-[#8B5CF6] to-[#2979FF] rounded-[14px] p-8 md:p-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* 현재 시간 */}
          <div className="flex flex-col">
            <div className="text-white/80 text-sm mb-2 flex items-center gap-2">
              <Clock className="w-[20px] h-[20px]" />
              <span>현재 시간</span>
            </div>
            <div className="text-white text-3xl md:text-4xl font-bold">
              {currentTime}
            </div>
          </div>

          {/* 현재 주변 혼잡도 */}
          <div className="flex flex-col">
            <div className="text-white/80 text-sm mb-2 flex items-center gap-2">
              <MapPin className="w-[20px] h-[20px]" />
              <span>주변 혼잡도</span>
            </div>
            {currentStation && currentCongestion ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: getLineColor(currentStation.lineNum) }}
                  >
                    {currentStation.lineNum}
                  </div>
                  <div className="text-white text-2xl md:text-3xl font-bold">
                    {currentStation.stationName}역
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-[14px] ${getCongestionBgColor(currentCongestion.level)} flex items-center justify-center text-white text-lg font-bold`}>
                    {currentCongestion.level}
                  </div>
                  <div className="text-white text-xl md:text-2xl font-semibold">
                    {currentCongestion.text}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-white/60 text-lg">역 정보 없음</div>
            )}
          </div>

          {/* 추천 정보 */}
          <div className="flex flex-col">
            <div className="text-white/80 text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="w-[20px] h-[20px]" />
              <span>지금 추천</span>
            </div>
            <div className="text-white text-2xl md:text-3xl font-bold mb-4">
              {recommendation}
            </div>
            <div className="flex items-center gap-6 mt-auto pt-4 border-t border-white/20">
              <div>
                <div className="text-white/80 text-xs mb-1">평균 대기</div>
                <div className="text-white text-xl font-semibold">{averageWaitTime}분</div>
              </div>
              <div>
                <div className="text-white/80 text-xs mb-1">지연/이슈</div>
                <div className={`text-xl font-semibold ${hasIssues ? 'text-red-200' : 'text-green-200'}`}>
                  {hasIssues ? '있음' : '없음'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

