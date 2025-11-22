'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Crown, Sparkles, Mail, Bell, Zap, Check } from 'lucide-react';

export default function PremiumServiceCard() {
  const [showDetails, setShowDetails] = useState(false);

  const features = [
    { icon: Sparkles, text: 'AI 예측 기반 출발 시각 추천' },
    { icon: Mail, text: '주간 통근 리포트 자동 발송' },
    { icon: Bell, text: '맞춤형 푸시 알림' },
    { icon: Zap, text: '광고 없는 버전' },
    { icon: Check, text: '프리미엄 혼잡도 분석' },
  ];

  return (
    <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-6 h-6" />
          <h3 className="text-xl font-bold">프리미엄 서비스</h3>
        </div>

        <p className="text-sm opacity-90 mb-4">
          더 정확한 예측과 맞춤형 서비스로 스마트한 출퇴근을 시작하세요
        </p>

        {!showDetails ? (
          <Link
            href="/premium"
            className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              setShowDetails(true);
            }}
          >
            <Sparkles className="w-5 h-5" />
            📊 프리미엄 리포트 보기
          </Link>
        ) : (
          <div className="space-y-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <div className="space-y-2">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4" />
                      <span>{feature.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Link
              href="/premium"
              className="block w-full bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg text-center"
            >
              지금 시작하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

