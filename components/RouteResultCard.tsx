import React from "react";
import type { RouteSummary } from "@/types/route";
import { getLineColor } from "@/lib/utils";

interface Props {
  route: RouteSummary;
  index: number;
}

export const RouteResultCard: React.FC<Props> = ({ route, index }) => {
  const { totalMinutes, fare, transfers, isBest, subPaths, stations } = route;
  
  // 디버깅: props.route 전체 구조 확인
  console.debug('[RouteCard-DEBUG] route props', {
    totalMinutes,
    fare,
    transfers,
    subPathsCount: subPaths?.length || 0,
    subPaths: subPaths?.map(sp => ({
      type: sp.type,
      label: sp.label,
      from: sp.from,
      to: sp.to,
      minutes: sp.minutes,
      stationCount: sp.stationCount,
      stations: sp.stations,
      stationsCount: sp.stations?.length || 0,
    })),
    stationsCount: stations?.length || 0,
    stations: stations,
  });


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

      {/* 하단 구간 리스트 – subPaths 기반으로 라인 구간 단위로만 표시 */}
      {/* 중요: 더 이상 stations 배열을 직접 사용하지 않고, 반드시 subPaths만 사용 */}
      <div className="space-y-3 mt-4">
        {subPaths && subPaths.length > 0 ? (
          <>
            {subPaths.map((sp, idx) => {
              // 도보 구간 처리
              if (sp.type === "walk") {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded text-xs">
                      도보
                    </span>
                    <span>{sp.minutes != null ? `${sp.minutes}분` : ''}</span>
                  </div>
                );
              }
              
              // 버스 구간 처리
              if (sp.type === "bus") {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded text-xs">
                      {sp.label || '버스'}
                    </span>
                    <span>{sp.minutes != null ? `${sp.minutes}분` : ''}</span>
                  </div>
                );
              }
              
              // 지하철 구간 처리 (핵심)
              // from/to가 없으면 경고 로그만 찍고 기본값 사용
              if (!sp.from || !sp.to) {
                console.warn('[RouteResultCard] subPath에 from/to가 없음', { 
                  sp, 
                  idx,
                  type: sp.type,
                  label: sp.label 
                });
                // from/to가 없어도 라인 정보라도 표시
                const lineNum = sp.label ? sp.label.replace("호선", "").trim() : '';
                if (lineNum) {
                  const lineColor = getLineColor(lineNum);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: lineColor }}
                      >
                        {lineNum}
                      </div>
                      <div className="flex-1 text-gray-500 dark:text-gray-400">
                        {sp.label} (구간 정보 없음)
                      </div>
                    </div>
                  );
                }
                return null;
              }
              
              // 라인 번호 추출
              const lineNum = sp.label ? sp.label.replace("호선", "").trim() : '';
              if (!lineNum) {
                console.warn('[RouteResultCard] subPath에 라인 번호가 없음', { sp, idx });
                return null;
              }
              
              const lineColor = getLineColor(lineNum);
              
              // 환승역/도착역 정보 추출
              const transferStations = (stations || []).filter(
                (s) => s.type === 'transfer'
              );
              const endStation = (stations || []).find(
                (s) => s.type === 'end'
              );
              
              // 환승/하차 여부 확인
              const isLast = idx === subPaths.length - 1;
              const isTransferEnd = transferStations.some(
                (ts) => ts.name === sp.to && (ts.line === lineNum || ts.line === undefined)
              );
              const isFinalEnd = endStation && 
                endStation.name === sp.to && 
                (endStation.line === lineNum || endStation.line === undefined);
              
              // 구간 텍스트 구성 - from → to만 표시 (중간 역은 숨김)
              const routeText = `${sp.from} → ${sp.to}`;
              
              const statusText = isTransferEnd 
                ? ' (환승)' 
                : (isFinalEnd && isLast ? ' (하차)' : '');
              
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 text-sm"
                >
                  {/* 원형 라벨 (노선 번호) */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: lineColor }}
                  >
                    {lineNum}
                  </div>
                  
                  {/* 구간 정보 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-900 dark:text-white font-medium flex-1">
                        <span className="font-semibold">{sp.label}</span>
                        <span className="mx-2">•</span>
                        <span>{routeText}</span>
                        {statusText && (
                          <span className="text-blue-600 dark:text-blue-400 ml-1">
                            {statusText}
                          </span>
                        )}
                      </div>
                      {sp.minutes != null && (
                        <div className="text-gray-600 dark:text-gray-400 text-xs ml-2">
                          {sp.minutes}분
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          // subPaths가 없을 때 fallback (디버깅용)
          <div className="text-sm text-gray-500 dark:text-gray-400">
            구간 정보가 없습니다. (subPaths: {subPaths?.length || 0}개)
            {stations && stations.length > 0 && (
              <div className="mt-2 text-xs">
                대신 stations 정보: {stations.map(s => s.name).join(' → ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

