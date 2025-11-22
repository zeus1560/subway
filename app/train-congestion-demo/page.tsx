'use client';

import TrainCarCongestion, { DirectionCongestion } from '@/components/TrainCarCongestion';

// Mock 데이터 예시
const mockDirections: DirectionCongestion[] = [
  {
    label: '용산 방향 광운대행',
    direction: '상행',
    etaText: '곧 도착',
    trainNumber: 1,
    cars: [
      { carNumber: 1, level: '혼잡', percentage: 88 },
      { carNumber: 2, level: '주의', percentage: 72 },
      { carNumber: 3, level: '보통', percentage: 55 },
      { carNumber: 4, level: '보통', percentage: 50 },
      { carNumber: 5, level: '여유', percentage: 25 },
      { carNumber: 6, level: '여유', percentage: 30 },
      { carNumber: 7, level: '보통', percentage: 48 },
      { carNumber: 8, level: '주의', percentage: 75 },
      { carNumber: 9, level: '주의', percentage: 78 },
      { carNumber: 10, level: '혼잡', percentage: 90 },
    ],
  },
  {
    label: '대방 방향 서동탄행',
    direction: '하행',
    etaText: '2분 후 도착',
    trainNumber: 1,
    cars: [
      { carNumber: 1, level: '보통', percentage: 52 },
      { carNumber: 2, level: '보통', percentage: 48 },
      { carNumber: 3, level: '여유', percentage: 28 },
      { carNumber: 4, level: '여유', percentage: 25 },
      { carNumber: 5, level: '여유', percentage: 30 },
      { carNumber: 6, level: '보통', percentage: 50 },
      { carNumber: 7, level: '보통', percentage: 55 },
      { carNumber: 8, level: '주의', percentage: 70 },
      { carNumber: 9, level: '보통', percentage: 52 },
      { carNumber: 10, level: '보통', percentage: 48 },
    ],
  },
];

export default function TrainCongestionDemoPage() {
  const handleStationChange = (station: string) => {
    console.log('역 변경:', station);
    // 실제 구현에서는 라우팅 또는 상태 업데이트
  };

  const handleNextTrain = (directionIndex: number) => {
    console.log('다음 열차:', directionIndex);
    // 실제 구현에서는 다음 열차 데이터 로드
  };

  const handlePrevTrain = (directionIndex: number) => {
    console.log('이전 열차:', directionIndex);
    // 실제 구현에서는 이전 열차 데이터 로드
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            열차 칸별 혼잡도 데모
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            TrainCarCongestion 컴포넌트 예시
          </p>
        </div>

        {/* 컴포넌트 사용 예시 */}
        <TrainCarCongestion
          currentStation="노량진"
          lineNumber="1"
          directions={mockDirections}
          nearbyStations={['용산', '노량진', '대방']}
          onStationChange={handleStationChange}
          onNextTrain={handleNextTrain}
          onPrevTrain={handlePrevTrain}
        />

        {/* 추가 예시: 다른 역 */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
            다른 역 예시 (강남역)
          </h2>
          <TrainCarCongestion
            currentStation="강남"
            lineNumber="2"
            directions={[
              {
                label: '을지로입구 방향 성수행',
                direction: '상행',
                etaText: '2분 후 도착',
                trainNumber: 1,
                cars: [
                  { carNumber: 1, level: '혼잡', percentage: 92 },
                  { carNumber: 2, level: '혼잡', percentage: 88 },
                  { carNumber: 3, level: '주의', percentage: 75 },
                  { carNumber: 4, level: '보통', percentage: 55 },
                  { carNumber: 5, level: '보통', percentage: 50 },
                  { carNumber: 6, level: '보통', percentage: 52 },
                  { carNumber: 7, level: '주의', percentage: 72 },
                  { carNumber: 8, level: '주의', percentage: 78 },
                  { carNumber: 9, level: '혼잡', percentage: 85 },
                  { carNumber: 10, level: '혼잡', percentage: 90 },
                ],
              },
              {
                label: '잠실 방향 신정네거리행',
                direction: '하행',
                etaText: '5분 후 도착',
                trainNumber: 1,
                cars: [
                  { carNumber: 1, level: '보통', percentage: 48 },
                  { carNumber: 2, level: '여유', percentage: 28 },
                  { carNumber: 3, level: '여유', percentage: 25 },
                  { carNumber: 4, level: '보통', percentage: 50 },
                  { carNumber: 5, level: '보통', percentage: 52 },
                  { carNumber: 6, level: '보통', percentage: 48 },
                  { carNumber: 7, level: '여유', percentage: 30 },
                  { carNumber: 8, level: '보통', percentage: 55 },
                  { carNumber: 9, level: '보통', percentage: 50 },
                  { carNumber: 10, level: '보통', percentage: 48 },
                ],
              },
            ]}
            nearbyStations={['역삼', '강남', '선릉']}
            onStationChange={handleStationChange}
          />
        </div>

        {/* 사용법 안내 */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            사용법
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• 각 칸을 클릭하면 하단에 상세 정보가 표시됩니다 (N칸 · 혼잡도 수준 · 예측 혼잡도 퍼센트).</p>
            <p>• 가장 여유로운 칸(1-3개)은 초록색 테두리와 "추천" 뱃지로 강조됩니다.</p>
            <p>• 열차 위에 "지금 추천 탑승: N칸 (여유)" 요약 문구가 표시됩니다.</p>
            <p>• "다음 열차 보기" 아코디언을 클릭하면 다음 열차의 혼잡도를 비교할 수 있습니다.</p>
            <p>• 상단 노선 탭으로 1~9호선을 선택할 수 있습니다.</p>
            <p>• 상행/하행 토글로 방향별로 필터링할 수 있습니다.</p>
            <p>• 상단 탭으로 인근 역의 혼잡도를 확인할 수 있습니다.</p>
            <p>• 하단 도움말 아이콘(?)을 클릭하면 설명을 볼 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

