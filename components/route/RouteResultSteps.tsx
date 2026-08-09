'use client';

import { getLineColor } from '@/lib/utils';
import type { RouteSummary } from '@/types/route';

interface RouteResultStepsProps {
  route: RouteSummary;
}

export default function RouteResultSteps({ route }: RouteResultStepsProps) {
  const { subPaths, stations } = route;

  if (!subPaths || subPaths.length === 0) {
    return (
      <div className="text-sm text-[#8A90A2] p-4">
        구간 정보가 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-bg-card p-4 mt-4">
      <div className="space-y-4">
        {subPaths.map((sp, idx) => {
          // 도보 구간 처리
          if (sp.type === 'walk') {
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-[14px] text-xs font-medium">
                  도보
                </span>
                <span className="text-sm text-[#111827] dark:text-white">
                  {sp.minutes != null ? `${sp.minutes}분` : ''}
                </span>
              </div>
            );
          }

          // 버스 구간 처리
          if (sp.type === 'bus') {
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-[14px] text-xs font-medium">
                  {sp.label || '버스'}
                </span>
                <span className="text-sm text-[#111827] dark:text-white">
                  {sp.minutes != null ? `${sp.minutes}분` : ''}
                </span>
              </div>
            );
          }

          // 지하철 구간 처리
          if (sp.type === 'subway') {
            if (!sp.from || !sp.to) {
              const lineNum = sp.label ? sp.label.replace('호선', '').trim() : '';
              if (lineNum) {
                const lineColor = getLineColor(lineNum);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-[14px] bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: lineColor }}
                    >
                      {lineNum}
                    </div>
                    <div className="flex-1 text-sm text-[#111827] dark:text-white">
                      {sp.label} (구간 정보 없음)
                    </div>
                  </div>
                );
              }
              return null;
            }

            const lineNum = sp.label ? sp.label.replace('호선', '').trim() : '';
            if (!lineNum) return null;

            const lineColor = getLineColor(lineNum);
            const routeText = `${sp.from} → ${sp.to}`;

            // 환승/하차 여부 확인
            const transferStations = (stations || []).filter((s) => s.type === 'transfer');
            const endStation = (stations || []).find((s) => s.type === 'end');
            const isLast = idx === subPaths.length - 1;
            const isTransferEnd = transferStations.some(
              (ts) => ts.name === sp.to && (ts.line === lineNum || ts.line === undefined)
            );
            const isFinalEnd = endStation &&
              endStation.name === sp.to &&
              (endStation.line === lineNum || endStation.line === undefined);

            const statusText = isTransferEnd
              ? ' (환승)'
              : (isFinalEnd && isLast ? ' (하차)' : '');

            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: lineColor }}
                >
                  {lineNum}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#111827] dark:text-white font-medium flex-1">
                      <span className="font-semibold">{sp.label}</span>
                      <span className="mx-2">•</span>
                      <span>{routeText}</span>
                      {statusText && (
                        <span className="text-[#2979FF] ml-1">{statusText}</span>
                      )}
                    </div>
                    {sp.minutes != null && (
                      <div className="text-xs text-[#8A90A2] ml-2">
                        {sp.minutes}분
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

