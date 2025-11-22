'use client';

import { Shield, TrendingUp, Database } from 'lucide-react';

export default function BrandTrustFooter() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            <span>서울교통공사 API 기반</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>AI 혼잡도 예측 정확도 91%</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>실시간 데이터 업데이트</span>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 dark:text-gray-500 mt-2">
          © 2024 서울 지하철 혼잡도 앱. 모든 권리 보유.
        </div>
      </div>
    </div>
  );
}


