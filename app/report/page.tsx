'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, TrendingUp, Clock } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { generateCommuteReport, generateCongestionTips } from '@/lib/contentGenerator';
import { getCurrentUser } from '@/lib/authService';

export default function ReportPage() {
  const [user, setUser] = useState<any>(null);
  const [tips, setTips] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const tipsData = await generateCongestionTips();
      setTips(tipsData);

      if (user) {
        const reportData = await generateCommuteReport(user.id);
        setReport(reportData);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (content: any, filename: string) => {
    const blob = new Blob([content.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">리포트</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            맞춤형 분석 리포트를 확인하세요
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* 혼잡 피하기 노하우 */}
          {tips && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {tips.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      AI가 분석한 혼잡 피하기 노하우
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(tips, '혼잡피하기노하우.md')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  {tips.content}
                </pre>
              </div>
            </div>
          )}

          {/* 개인 맞춤형 리포트 */}
          {user && report ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.name}님을 위한 맞춤 리포트
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(report, '출근시간절약리포트.md')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  {report.content}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                개인 맞춤형 리포트를 보려면 로그인이 필요합니다.
              </p>
              <a
                href="/login"
                className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                로그인하기
              </a>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}


