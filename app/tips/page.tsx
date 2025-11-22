'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, Clock, MapPin, Train, TrendingDown } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { generateCongestionTips } from '@/lib/aiService';

export default function TipsPage() {
  const [tips, setTips] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadTips();
  }, []);

  const loadTips = () => {
    const generatedTips = generateCongestionTips(null, null);
    setTips(generatedTips);
  };

  if (!mounted) {
    return null;
  }

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      'time-outline': Clock,
      'moon-outline': Clock,
      'swap-horizontal-outline': MapPin,
      'train-outline': Train,
    };
    return icons[iconName] || Lightbulb;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">혼잡 피하기 팁</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            스마트하게 지하철 이용하기
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {tips.map((tip: any, index: number) => {
            const Icon = getIcon(tip.icon);
            return (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 border rounded-lg p-5 ${
                  tip.priority === 'high'
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tip.priority === 'high'
                        ? 'bg-blue-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        tip.priority === 'high' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{tip.title}</h3>
                      {tip.priority === 'high' && (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                          중요
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {tip.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 추가 팁 섹션 */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-6 h-6" />
            <h2 className="text-xl font-bold">추가 팁</h2>
          </div>
          <ul className="space-y-2 text-sm">
            <li>• 평일 오전 10시~11시, 오후 2시~4시가 가장 덜 혼잡합니다</li>
            <li>• 첫 칸과 끝 칸은 상대적으로 덜 혼잡합니다</li>
            <li>• 환승이 많은 역은 피하는 것이 좋습니다</li>
            <li>• 출퇴근 시간대에는 10~30분 시간을 조절하면 혼잡도를 크게 줄일 수 있습니다</li>
            <li>• 앱의 예측 기능을 활용하여 최적의 출발 시간을 선택하세요</li>
          </ul>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}


