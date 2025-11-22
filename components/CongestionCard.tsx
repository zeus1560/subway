'use client';

import Link from 'next/link';
import { calculateCongestionLevel } from '@/lib/api';
import { getLineColor } from '@/lib/utils';

interface CongestionCardProps {
  station: string;
  line: string;
  passengerCount: number;
  onPress?: () => void;
  showPrediction?: boolean;
  predictedCount?: number;
  stationId?: string;
}

export default function CongestionCard({
  station,
  line,
  passengerCount,
  showPrediction = false,
  predictedCount,
  stationId,
}: CongestionCardProps) {
  const congestion = calculateCongestionLevel(passengerCount);
  const predictedCongestion = predictedCount ? calculateCongestionLevel(predictedCount) : null;

  const cardContent = (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{station}</h3>
          <span
            className="px-2 py-1 rounded text-xs font-semibold text-white"
            style={{ backgroundColor: getLineColor(line) }}
          >
            {line}호선
          </span>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="w-1 h-12 rounded-full"
            style={{ backgroundColor: congestion.color }}
          />
          <div className="flex-1">
            <div className="font-semibold text-gray-900 dark:text-white">{congestion.level}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              현재: {passengerCount.toLocaleString()}명
            </div>
          </div>
          <div className="text-2xl">{getCongestionIcon(congestion.level)}</div>
        </div>

        {showPrediction && predictedCongestion && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-1 h-12 rounded-full opacity-70"
                  style={{ backgroundColor: predictedCongestion.color }}
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    예상: {predictedCongestion.level}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    10분 후: {predictedCount?.toLocaleString()}명
                  </div>
                </div>
                <div className="text-2xl opacity-70">{getCongestionIcon(predictedCongestion.level)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (stationId) {
    return (
      <Link href={`/stations/${encodeURIComponent(stationId)}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

function getCongestionIcon(level: string) {
  const icons: Record<string, string> = {
    '여유': '😊',
    '보통': '😐',
    '혼잡': '😰',
    '매우 혼잡': '😱',
  };
  return icons[level] || '😐';
}

