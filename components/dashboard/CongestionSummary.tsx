'use client';

import { useState } from 'react';
import { Train } from 'lucide-react';
import CongestionBar from './CongestionBar';

interface CarCongestion {
  carNo: number;
  congestionLevel: string;
  value: number;
}

interface CongestionSummaryProps {
  stationName: string;
  lineNum: string;
  carCongestionData: {
    up: CarCongestion[];
    down: CarCongestion[];
  };
}

export default function CongestionSummary({
  stationName,
  lineNum,
  carCongestionData,
}: CongestionSummaryProps) {
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down'>('up');

  const currentData = carCongestionData[selectedDirection];

  if (currentData.length === 0) {
    return (
      <section className="w-full mb-8">
        <div className="bg-white rounded-[14px] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Train className="w-[20px] h-[20px] text-[#2979FF]" />
            <h3 className="text-lg font-semibold text-[#111827]">칸별 혼잡도 예측</h3>
            <span className="text-sm text-[#8A90A2]">
              {stationName}역 · {lineNum}호선
            </span>
          </div>
          <div className="text-center py-8 text-[#8A90A2]">
            칸별 혼잡도 데이터를 불러오는 중...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full mb-8">
      <div className="bg-white rounded-[14px] p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Train className="w-[20px] h-[20px] text-[#2979FF]" />
            <h3 className="text-lg font-semibold text-[#111827]">칸별 혼잡도 예측</h3>
            <span className="text-sm text-[#8A90A2]">
              {stationName}역 · {lineNum}호선
            </span>
          </div>
          
          {/* 상행/하행 토글 */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDirection('up')}
              className={`px-4 py-2 rounded-[14px] text-sm font-medium transition-colors ${
                selectedDirection === 'up'
                  ? 'bg-[#2979FF] text-white'
                  : 'bg-gray-100 text-[#8A90A2] hover:bg-gray-200'
              }`}
            >
              상행
            </button>
            <button
              onClick={() => setSelectedDirection('down')}
              className={`px-4 py-2 rounded-[14px] text-sm font-medium transition-colors ${
                selectedDirection === 'down'
                  ? 'bg-[#2979FF] text-white'
                  : 'bg-gray-100 text-[#8A90A2] hover:bg-gray-200'
              }`}
            >
              하행
            </button>
          </div>
        </div>

        {/* 칸별 혼잡도 그리드 */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-4 mb-4">
          {currentData.map((car, index) => (
            <CongestionBar key={index} car={car} index={index} />
          ))}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-6 text-xs text-[#8A90A2] pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>여유</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span>보통</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500"></div>
            <span>주의</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>혼잡</span>
          </div>
          <div className="ml-auto text-[#2979FF] font-medium">
            <span className="text-green-600">✓</span> 표시된 칸 추천
          </div>
        </div>
      </div>
    </section>
  );
}

