'use client';

import { TrendingUp, TrendingDown, BarChart3, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TrendNewsCard() {
  // AI 생성 뉴스 데이터
  const topCrowdedLines = [
    { line: '2호선', congestion: 85, change: +3 },
    { line: '1호선', congestion: 78, change: -2 },
    { line: '3호선', congestion: 72, change: +1 },
  ];

  const relaxedTimeSlots = [
    { time: '오전 10시', reduction: 35 },
    { time: '오후 2시', reduction: 28 },
    { time: '오후 9시', reduction: 42 },
  ];

  const weeklyTrend = [
    { day: '월', congestion: 80 },
    { day: '화', congestion: 82 },
    { day: '수', congestion: 78 },
    { day: '목', congestion: 85 },
    { day: '금', congestion: 88 },
    { day: '토', congestion: 45 },
    { day: '일', congestion: 40 },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">서울 지하철 주간 혼잡 리포트</h3>
      </div>

      {/* 가장 혼잡한 노선 TOP3 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          이번 주 가장 혼잡한 노선 TOP3
        </h4>
        <div className="space-y-2">
          {topCrowdedLines.map((item, index) => (
            <div
              key={item.line}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center font-bold text-red-600 dark:text-red-400">
                  {index + 1}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{item.line}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    평균 혼잡도 {item.congestion}%
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                item.change > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {item.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(item.change)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 출근 혼잡 완화 시간대 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          출근 혼잡이 가장 완화된 시간대는?
        </h4>
        <div className="space-y-2">
          {relaxedTimeSlots.map((slot, index) => (
            <div
              key={slot.time}
              className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-gray-900 dark:text-white">{slot.time}</span>
              </div>
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                {slot.reduction}% 감소
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 주간 트렌드 그래프 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          이번 주 혼잡도 추이
        </h4>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={weeklyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="congestion"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


