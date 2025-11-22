import React from "react";
import type { RouteSummary } from "@/types/route";
import { getLineColor } from "@/lib/utils";

interface Props {
  route: RouteSummary;
  index: number;
}

export const RouteResultCard: React.FC<Props> = ({ route, index }) => {
  const { totalMinutes, fare, transfers, isBest, subPaths, stations } = route;
  
  // 디버깅: subPaths 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('[RouteResultCard] 받은 subPaths:', JSON.stringify(subPaths, null, 2));
  }


  const totalLabel =
    totalMinutes != null ? `${totalMinutes}분` : "시간 정보 없음";
  const fareLabel =
    fare != null ? `${fare.toLocaleString()}원` : null;

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
      style={{
        borderColor: isBest ? "#60a5fa" : undefined,
        borderWidth: isBest ? 2 : 1,
      }}
    >
      {/* 상단 요약 영역 */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {isBest && (
            <span className="text-xs font-bold px-2 py-1 bg-blue-500 text-white rounded">
              최적
            </span>
          )}
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {totalLabel}
            </div>
            {fareLabel && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {fareLabel}
              </div>
            )}
            {transfers > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                환승 {transfers}회
              </div>
            )}
          </div>
        </div>

        {/* 상단 우측: subPath 기준 칩 */}
        {subPaths.length > 0 && (
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto max-w-[420px]">
            {subPaths.map((sp, i) => {
              const minutes = sp.minutes;
              const timeText =
                minutes != null ? `${minutes}분` : "정보 없음";
              
              // 방어 코드: label이 비어있으면 "구간"으로 표시
              // 디버깅: label 확인
              const rawLabel = sp.label;
              const displayLabel = (rawLabel && typeof rawLabel === 'string' && rawLabel.trim().length > 0)
                ? rawLabel.trim()
                : "구간";
              
              
              // 타입별로 배경색 결정
              let bgClass = "bg-amber-200 text-gray-900"; // 도보: 노란색
              if (sp.type === "subway") {
                // 노선 번호 추출
                const lineNum = displayLabel.replace("호선", "").trim();
                const lineColor = getLineColor(lineNum);
                // Tailwind 클래스 대신 인라인 스타일 사용 (동적 색상)
                return (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: lineColor,
                      color: "#ffffff",
                    }}
                  >
                    {displayLabel} {timeText}
                  </span>
                );
              } else if (sp.type === "bus") {
                bgClass = "bg-emerald-200 text-gray-900"; // 버스: 초록색
              }
              
              return (
                <span
                  key={i}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${bgClass}`}
                >
                  {displayLabel} {timeText}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 역 리스트 – 시간은 표시하지 않고 역 이름만 나열 */}
      {stations.length > 0 && (
        <div className="space-y-2">
          {stations.map((st, i) => (
            <div
              key={`${st.name}-${i}`}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <div
                className="w-1 h-1 rounded-full bg-gray-500 flex-shrink-0"
              />
              <span>{st.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

