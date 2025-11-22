'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Sparkles } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import {
  generateCongestionTips,
  generateTouristRoute,
  generateAppStoreDescription,
  generatePromoCopy,
} from '@/lib/contentGenerator';

export default function ContentPage() {
  const [tips, setTips] = useState<any>(null);
  const [touristRoute, setTouristRoute] = useState<any>(null);
  const [appStore, setAppStore] = useState<any>(null);
  const [promo, setPromo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState('명동');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const tipsData = await generateCongestionTips();
      setTips(tipsData);

      const routeData = await generateTouristRoute(destination);
      setTouristRoute(routeData);

      const appStoreData = generateAppStoreDescription();
      setAppStore(appStoreData);

      const promoData = generatePromoCopy('instagram');
      setPromo(promoData);
    } catch (error) {
      console.error('콘텐츠 생성 실패:', error);
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
        <p className="text-gray-600 dark:text-gray-400">콘텐츠 생성 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 콘텐츠 생성</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            AI가 자동으로 생성한 다양한 콘텐츠
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* 혼잡 피하기 노하우 */}
          {tips && (
            <ContentCard
              content={tips}
              onDownload={() => handleDownload(tips, '혼잡피하기노하우.md')}
            />
          )}

          {/* 관광객용 루트 */}
          {touristRoute && (
            <ContentCard
              content={touristRoute}
              onDownload={() => handleDownload(touristRoute, `${destination}루트.md`)}
            />
          )}

          {/* 앱 스토어 소개 */}
          {appStore && (
            <ContentCard
              content={appStore}
              onDownload={() => handleDownload(appStore, '앱스토어소개.md')}
            />
          )}

          {/* 프로모션 카피 */}
          {promo && (
            <ContentCard
              content={promo}
              onDownload={() => handleDownload(promo, '프로모션카피.md')}
            />
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}

function ContentCard({ content, onDownload }: { content: any; onDownload: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{content.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI 자동 생성</p>
          </div>
        </div>
        <button
          onClick={onDownload}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
      <div className="prose dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-64 overflow-y-auto">
          {content.content}
        </pre>
      </div>
    </div>
  );
}


