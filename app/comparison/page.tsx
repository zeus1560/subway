'use client';

import { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, ArrowRight, Search } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { getStationCongestion, calculateCongestionLevel, predictCongestion } from '@/lib/api';
import { getLineColor } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// 주요 역 목록
const STATIONS = [
  { name: '강남', lines: ['2', '신분당'] },
  { name: '홍대입구', lines: ['2', '6', '경의중앙', '공항철도'] },
  { name: '명동', lines: ['4'] },
  { name: '동대문', lines: ['1', '4'] },
  { name: '이태원', lines: ['6'] },
  { name: '잠실', lines: ['2', '8'] },
  { name: '신촌', lines: ['2'] },
  { name: '을지로입구', lines: ['2', '5'] },
  { name: '을지로3가', lines: ['2', '3'] },
  { name: '을지로4가', lines: ['2', '5'] },
  { name: '종로3가', lines: ['1', '3', '5'] },
  { name: '종로5가', lines: ['1'] },
  { name: '시청', lines: ['1', '2'] },
  { name: '서울역', lines: ['1', '4', '경의중앙', '공항철도'] },
  { name: '회현', lines: ['4'] },
  { name: '충무로', lines: ['3', '4'] },
  { name: '동대문역사문화공원', lines: ['2', '4', '5'] },
  { name: '왕십리', lines: ['2', '5', '경의중앙', '분당'] },
  { name: '건대입구', lines: ['2', '7'] },
  { name: '성수', lines: ['2'] },
  { name: '삼성', lines: ['2'] },
  { name: '선릉', lines: ['2', '분당'] },
  { name: '역삼', lines: ['2'] },
  { name: '교대', lines: ['2', '3'] },
  { name: '사당', lines: ['2', '4'] },
  { name: '방배', lines: ['2'] },
  { name: '서초', lines: ['2'] },
  { name: '잠원', lines: ['3'] },
  { name: '고속터미널', lines: ['3', '7', '9'] },
  { name: '옥수', lines: ['3'] },
  { name: '압구정', lines: ['3'] },
  { name: '신사', lines: ['3'] },
  { name: '약수', lines: ['3', '6'] },
  { name: '동대입구', lines: ['3'] },
  { name: '안국', lines: ['3'] },
  { name: '경복궁', lines: ['3'] },
  { name: '독립문', lines: ['3'] },
  { name: '홍제', lines: ['3'] },
  { name: '무악재', lines: ['3'] },
  { name: '불광', lines: ['3', '6'] },
  { name: '연신내', lines: ['3', '6'] },
];

export default function ComparisonPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedStation, setSelectedStation] = useState('강남');
  const [selectedLine, setSelectedLine] = useState('2');
  const [stationData, setStationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showStationSelector, setShowStationSelector] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadStationData();
  }, [selectedStation, selectedLine]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showStationSelector && !target.closest('.station-selector')) {
        setShowStationSelector(false);
      }
    };

    if (showStationSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStationSelector]);

  const loadStationData = async () => {
    setLoading(true);
    try {
      const data = await getStationCongestion(selectedStation, selectedLine);
      setStationData(data);
    } catch (error) {
      console.error('역 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = (stationName: string, lineNum: string) => {
    setSelectedStation(stationName);
    setSelectedLine(lineNum);
    setShowStationSelector(false);
  };

  // 현재 시간대 데이터
  const currentHour = currentTime.getHours();
  const currentPassengers = stationData?.CardSubwayStatsNew?.row?.[0]?.RIDE_PASGR_NUM || 
    (500 + Math.sin((currentHour - 6) * Math.PI / 12) * 300);
  
  // 10분 후 예상 데이터
  const futureTime = new Date(currentTime.getTime() + 10 * 60 * 1000);
  const futureHour = futureTime.getHours();
  const predictedData = predictCongestion(
    { passengerCount: currentPassengers },
    [{ passengerCount: currentPassengers * 0.9 }]
  );
  const futurePassengers = predictedData.predictedPassengerCount || 
    (500 + Math.sin((futureHour - 6) * Math.PI / 12) * 300 + (futureHour >= 7 && futureHour <= 9 ? 100 : 0));

  const currentCongestion = calculateCongestionLevel(currentPassengers);
  const futureCongestion = calculateCongestionLevel(futurePassengers);

  const comparisonData = [
    { time: '지금', passengers: currentPassengers, level: currentCongestion.level },
    { time: '10분 후', passengers: futurePassengers, level: futureCongestion.level },
  ];

  const hourlyComparison = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}시`,
    now: 500 + Math.sin((i - 6) * Math.PI / 12) * 300,
    later: 500 + Math.sin((i - 6) * Math.PI / 12) * 300 + (i >= 7 && i <= 9 ? 100 : 0),
  }));

  const isBetter = futurePassengers < currentPassengers;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">시간대별 비교</h1>
          
          {/* 역 선택 */}
          <div className="relative station-selector">
            <button
              onClick={() => setShowStationSelector(!showStationSelector)}
              className="w-full flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Search className="w-5 h-5 text-gray-500" />
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedStation}</span>
                  <span
                    className="px-2 py-1 rounded text-xs font-semibold text-white"
                    style={{ backgroundColor: getLineColor(selectedLine) }}
                  >
                    {selectedLine}호선
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">역 선택하기</div>
              </div>
            </button>

            {/* 역 선택 드롭다운 */}
            {showStationSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                <div className="p-2">
                  {STATIONS.map((station, index) =>
                    station.lines.map((line) => (
                      <button
                        key={`${station.name}_${line}_${index}`}
                        onClick={() => handleStationSelect(station.name, line)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          selectedStation === station.name && selectedLine === line
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : ''
                        }`}
                      >
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: getLineColor(line) }}
                        >
                          {line}호선
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {station.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">데이터를 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 현재 시간 표시 */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-5 h-5" />
                  <span className="font-mono">
                    {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedStation} ({selectedLine}호선)
                </div>
              </div>
            </div>

        {/* 비교 카드 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">지금 출발</div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2 h-12 rounded-full"
                style={{ backgroundColor: currentCongestion.color }}
              />
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentCongestion.level}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round(currentPassengers).toLocaleString()}명
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">10분 후 출발</div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2 h-12 rounded-full"
                style={{ backgroundColor: futureCongestion.color }}
              />
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {futureCongestion.level}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round(futurePassengers).toLocaleString()}명
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 추천 */}
        {isBetter ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <TrendingDown className="w-5 h-5" />
              <span className="font-semibold">10분 후 출발을 추천합니다</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              혼잡도가 {Math.round(currentPassengers - futurePassengers)}명 감소할 예정입니다.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">지금 출발을 추천합니다</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              혼잡도가 증가할 예정입니다.
            </p>
          </div>
        )}

        {/* 비교 차트 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            시간대별 혼잡도 비교
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="passengers" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 시간대별 추이 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            하루 종일 혼잡도 추이
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="now"
                name="지금"
                stroke="#3b82f6"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="later"
                name="10분 후"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}

