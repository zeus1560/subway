'use client';

import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Clock } from 'lucide-react';

interface EvaluationMetrics {
  mae: number;
  rmse: number;
  levelAccuracy: number;
  totalSamples: number;
}

interface AggregatedMetrics {
  hour?: number;
  line?: string;
  baseline: EvaluationMetrics;
  enhanced: EvaluationMetrics;
}

interface OverallMetrics {
  baseline: EvaluationMetrics;
  enhanced: EvaluationMetrics;
  splitDate: string;
  testSamples: number;
}

export default function AnalyticsPage() {
  const [hourlyMetrics, setHourlyMetrics] = useState<AggregatedMetrics[]>([]);
  const [lineMetrics, setLineMetrics] = useState<AggregatedMetrics[]>([]);
  const [overallMetrics, setOverallMetrics] = useState<OverallMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // 시간대별 메트릭 로드
      const hourlyResponse = await fetch('/eval/mae_by_hour.json');
      if (!hourlyResponse.ok) throw new Error('시간대별 메트릭 로드 실패');
      const hourlyData = await hourlyResponse.json();
      setHourlyMetrics(hourlyData);

      // 노선별 메트릭 로드
      const lineResponse = await fetch('/eval/mae_by_line.json');
      if (!lineResponse.ok) {
        console.error('노선별 메트릭 로드 실패:', lineResponse.status);
        throw new Error('노선별 메트릭 로드 실패');
      }
      const lineData = await lineResponse.json();
      setLineMetrics(lineData);

      // 전체 메트릭 로드
      const overallResponse = await fetch('/eval/overall_metrics.json');
      if (overallResponse.ok) {
        const overallData = await overallResponse.json();
        setOverallMetrics(overallData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
      console.error('메트릭 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 개선율 계산 함수 (hooks 밖에서 정의)
  const calculateImprovement = (baseline: number, enhanced: number): number => {
    if (baseline === 0) return 0;
    return ((baseline - enhanced) / baseline) * 100;
  };

  // 모든 hooks는 early return 전에 호출해야 함 (React Hooks 규칙)
  // 그래프 데이터 포맷팅 (useMemo로 최적화)
  const hourlyChartData = useMemo(() => {
    return hourlyMetrics.map(m => ({
      hour: `${m.hour}시`,
      baseline: m.baseline.mae,
      enhanced: m.enhanced.mae,
    }));
  }, [hourlyMetrics]);

  // 노선별 차트 데이터 생성 (useMemo로 최적화)
  const lineChartData = useMemo(() => {
    // 노선별로 정렬하여 보기 좋게 만들기
    return lineMetrics
      .map(m => ({
        line: `${m.line}호선`,
        baselineMae: m.baseline.mae,
        enhancedMae: m.enhanced.mae,
      }))
      .sort((a, b) => {
        // 노선 번호로 정렬 (1호선, 2호선 순서)
        const lineA = parseInt(a.line.replace('호선', ''));
        const lineB = parseInt(b.line.replace('호선', ''));
        return lineA - lineB;
      });
  }, [lineMetrics]);

  // 개선율 계산 (useMemo로 최적화)
  const overallImprovement = useMemo(() => {
    return overallMetrics
      ? calculateImprovement(overallMetrics.baseline.mae, overallMetrics.enhanced.mae)
      : 0;
  }, [overallMetrics]);

  // early return은 모든 hooks 호출 후에
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            평가 스크립트를 먼저 실행해주세요:
          </p>
          <code className="bg-gray-800 text-white px-4 py-2 rounded">
            npx tsx scripts/evaluateCongestion.ts
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            혼잡도 예측 모델 성능 평가
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Baseline 모델과 Enhanced 모델의 성능을 비교합니다.
          </p>
        </div>

        {/* 전체 요약 카드 */}
        {overallMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Baseline MAE</span>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallMetrics.baseline.mae.toFixed(2)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Enhanced MAE</span>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {overallMetrics.enhanced.mae.toFixed(2)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">개선율</span>
                {overallImprovement > 0 ? (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className={`text-2xl font-bold ${overallImprovement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overallImprovement > 0 ? '+' : ''}{overallImprovement.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">레벨 정확도</span>
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallMetrics.enhanced.levelAccuracy.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* 시간대별 MAE 비교 그래프 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            시간대별 MAE 비교
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            각 시간대별로 Baseline과 Enhanced 모델의 평균 절대 오차(MAE)를 비교합니다.
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={hourlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis label={{ value: 'MAE', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#8884d8"
                strokeWidth={2}
                name="Baseline"
              />
              <Line
                type="monotone"
                dataKey="enhanced"
                stroke="#82ca9d"
                strokeWidth={2}
                name="Enhanced"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 노선별 MAE 비교 그래프 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            노선별 MAE 비교
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            각 지하철 노선별로 Baseline과 Enhanced 모델의 MAE를 비교합니다. 특정 노선에서 개선 효과가 얼마나 나는지 확인할 수 있습니다.
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="line" />
              <YAxis label={{ value: 'MAE', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="baselineMae" fill="#8884d8" name="Baseline MAE" />
              <Bar dataKey="enhancedMae" fill="#82ca9d" name="Enhanced MAE" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 상세 메트릭 테이블 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            상세 메트릭
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400">시간대</th>
                  <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">Baseline MAE</th>
                  <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">Enhanced MAE</th>
                  <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">개선율</th>
                  <th className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">정확도</th>
                </tr>
              </thead>
              <tbody>
                {hourlyMetrics.map((metric, index) => {
                  const improvement = calculateImprovement(metric.baseline.mae, metric.enhanced.mae);
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {metric.hour}시
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">
                        {metric.baseline.mae.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">
                        {metric.enhanced.mae.toFixed(2)}
                      </td>
                      <td className={`text-right py-3 px-4 font-medium ${
                        improvement > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600 dark:text-gray-400">
                        {metric.enhanced.levelAccuracy.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

