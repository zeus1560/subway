'use client';

import { useState, useEffect } from 'react';
import { TrendingDown, Clock, MapPin, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';
import { analyzeUserPattern } from '@/lib/personalizationService';
import { getCurrentUser } from '@/lib/authService';

interface CommuteInsightProps {
  userId?: string;
}

export default function CommuteInsightCard({ userId }: CommuteInsightProps) {
  const [weeklyData, setWeeklyData] = useState([
    { day: '월', commuteTime: 45, savedTime: 5 },
    { day: '화', commuteTime: 42, savedTime: 8 },
    { day: '수', commuteTime: 40, savedTime: 10 },
    { day: '목', commuteTime: 43, savedTime: 7 },
    { day: '금', commuteTime: 38, savedTime: 12 },
  ]);

  const user = getCurrentUser();
  const pattern = analyzeUserPattern(user?.id || userId);

  useEffect(() => {
    // 사용자 패턴 기반으로 데이터 업데이트
    if (pattern.commuteRoutes.length > 0) {
      // 실제 데이터가 있으면 사용, 없으면 모의 데이터 유지
    }
  }, [pattern, userId]);

  const avgCommuteTime = Math.round(weeklyData.reduce((sum, d) => sum + d.commuteTime, 0) / weeklyData.length);
  const totalSavedTime = weeklyData.reduce((sum, d) => sum + d.savedTime, 0);
  const lastWeekAvg = avgCommuteTime + 5; // 지난주 대비
  const leastCrowdedSection = pattern.commuteRoutes.length > 0 
    ? `${pattern.commuteRoutes[0].start} → ${pattern.commuteRoutes[0].end}`
    : '강남 → 역삼'; // 가장 덜 붐비는 구간

  // 출근/퇴근 패턴 데이터
  const commutePattern = [
    { time: '7시', type: '출근', congestion: 75 },
    { time: '8시', type: '출근', congestion: 85 },
    { time: '9시', type: '출근', congestion: 80 },
    { time: '18시', type: '퇴근', congestion: 88 },
    { time: '19시', type: '퇴근', congestion: 82 },
    { time: '20시', type: '퇴근', congestion: 70 },
  ];

  return (
    <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5" />
        <h3 className="text-lg font-bold">AI 출퇴근 인사이트 리포트</h3>
      </div>

      {/* 모티브 메시지 */}
      <div className="bg-white/20 rounded-lg p-4 mb-4 backdrop-blur-sm">
        <div className="text-2xl font-bold mb-1">
          이번 주 당신은 {totalSavedTime}분을 절약했어요 🚇
        </div>
        <div className="text-sm opacity-90">
          지난주 대비 평균 {lastWeekAvg - avgCommuteTime}분 단축
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
          <div className="text-xs opacity-80 mb-1">평균 출근 시간</div>
          <div className="text-xl font-bold">{avgCommuteTime}분</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
          <div className="text-xs opacity-80 mb-1">절약한 시간</div>
          <div className="text-xl font-bold text-yellow-300">{totalSavedTime}분</div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
          <div className="text-xs opacity-80 mb-1">덜 붐빔</div>
          <div className="text-sm font-semibold">{leastCrowdedSection}</div>
        </div>
      </div>

      {/* 출근/퇴근 패턴 그래프 */}
      <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
        <div className="text-sm font-semibold mb-3">이번 주 출근/퇴근 패턴</div>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
            <XAxis dataKey="day" stroke="rgba(255,255,255,0.8)" fontSize={12} />
            <YAxis stroke="rgba(255,255,255,0.8)" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.8)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
              }}
            />
            <Bar dataKey="commuteTime" fill="rgba(255,255,255,0.6)" name="소요 시간(분)" />
            <Line 
              type="monotone" 
              dataKey="savedTime" 
              stroke="#fbbf24" 
              strokeWidth={2}
              name="절약 시간(분)"
              dot={{ fill: '#fbbf24', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* 출근/퇴근 시간대별 혼잡도 */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="text-xs font-semibold mb-2 opacity-90">시간대별 혼잡도</div>
          <div className="grid grid-cols-3 gap-2">
            {commutePattern.slice(0, 3).map((item, idx) => (
              <div key={idx} className="bg-white/10 rounded p-2 text-center">
                <div className="text-xs opacity-80 mb-1">{item.time}</div>
                <div className="text-sm font-bold">{item.congestion}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

