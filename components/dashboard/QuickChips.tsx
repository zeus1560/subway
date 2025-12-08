'use client';

import { Zap, Clock, Users } from 'lucide-react';

interface QuickChipsProps {
  commuteReport?: {
    averageTime: number;
    diff: number;
    recommendedTimes: Array<{ time: string; congestion: string }>;
  } | null;
  userComparison?: {
    myAverage: number;
    userAverage: number;
    difference: number;
  } | null;
}

export default function QuickChips({ commuteReport, userComparison }: QuickChipsProps) {
  return (
    <section className="w-full mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI 출퇴근 리포트 */}
        {commuteReport && (
          <div className="bg-white rounded-[14px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-[20px] h-[20px] text-[#2979FF]" />
              <h3 className="text-base font-semibold text-[#111827]">AI 출퇴근 리포트</h3>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-[#8A90A2] mb-1">이번 주 평균</div>
                <div className="text-xl font-bold text-[#111827]">
                  {commuteReport.averageTime}분
                </div>
                <div className={`text-xs mt-1 ${commuteReport.diff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {commuteReport.diff < 0 ? '↓' : '↑'} 지난주 대비 {Math.abs(commuteReport.diff)}분
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-[#8A90A2] mb-2">추천 시간</div>
                <div className="flex flex-wrap gap-2">
                  {commuteReport.recommendedTimes.slice(0, 3).map((item, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 bg-[#2979FF] text-white rounded-lg text-xs font-medium"
                    >
                      {item.time}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 이용자 평균 비교 */}
        {userComparison && (
          <div className="bg-white rounded-[14px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-[20px] h-[20px] text-[#2979FF]" />
              <h3 className="text-base font-semibold text-[#111827]">이용자 평균 비교</h3>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-[#8A90A2] mb-1">내 평균</div>
                <div className="text-xl font-bold text-[#111827]">
                  {userComparison.myAverage}분
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-[#8A90A2] mb-1">전체 평균</div>
                <div className="text-lg font-bold text-[#111827]">
                  {userComparison.userAverage}분
                </div>
                <div className={`text-xs mt-1 ${userComparison.difference < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {userComparison.difference < 0 ? '↓' : '↑'} 평균보다 {Math.abs(userComparison.difference)}분 {userComparison.difference < 0 ? '빠름' : '느림'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

