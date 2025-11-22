'use client';

import { useState } from 'react';

export default function TestMappingPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testMapping = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test/mapping');
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || '알 수 없는 오류');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          역명 매칭 테스트
        </h1>

        <button
          onClick={testMapping}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          {loading ? '테스트 중...' : '역명 매칭 테스트 실행'}
        </button>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
            <strong>오류:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              테스트 결과
            </h2>

            {/* 요약 정보 */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                📊 요약
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">총 행 수</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {result.summary.totalRows.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">매칭 성공</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.summary.matched.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">매칭 실패</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {result.summary.unmatched.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">성공률</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.summary.successRate}
                  </div>
                </div>
              </div>
            </div>

            {/* 매칭 실패한 역 목록 */}
            {result.unmatchedStations && result.unmatchedStations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  ⚠️ 매칭 실패한 역 ({result.unmatchedStations.length}개)
                </h3>
                <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">번호</th>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">호선</th>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">원본 역명</th>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">정규화된 역명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.unmatchedStations.map((station: any, index: number) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="px-4 py-2 text-gray-900 dark:text-white">{index + 1}</td>
                          <td className="px-4 py-2 text-gray-900 dark:text-white">{station.lineNum}</td>
                          <td className="px-4 py-2 text-gray-900 dark:text-white">{station.name}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{station.normalized}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 메시지 */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">{result.message}</p>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 <strong>팁:</strong> 매칭 실패한 역들은 CSV 파일의 역명과{' '}
            <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">subwayMapData.ts</code>의
            역명이 일치하지 않아서 발생합니다. 역명을 정확히 맞춰주면 해결됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

