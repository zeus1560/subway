'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, TrendingUp, Clock, Download } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { getCurrentUser } from '@/lib/authService';
import { generateCompanyProposal } from '@/lib/contentGenerator';
import { useRouter } from 'next/navigation';

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.type !== 'company') {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    loadProposal();
  }, []);

  const loadProposal = async () => {
    setLoading(true);
    try {
      const companyData = {
        employeeCount: 100,
        commuteData: [],
      };
      const proposalData = await generateCompanyProposal(companyData);
      setProposal(proposalData);
    } catch (error) {
      console.error('제안서 생성 실패:', error);
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
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">기업 대시보드</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            직원 통근 데이터 기반 최적화 인사이트
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">직원 수</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">100명</div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">평균 통근 시간</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">50분</div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">시간 절약</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">20분/일</div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">비용 절감</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">50만원/월</div>
          </div>
        </div>

        {/* 최적화 제안서 */}
        {proposal && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {proposal.title}
              </h2>
              <button
                onClick={() => handleDownload(proposal, '기업통근최적화제안서.md')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-96 overflow-y-auto">
                {proposal.content}
              </pre>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}


