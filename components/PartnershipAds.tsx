'use client';

import { useState, useEffect } from 'react';
import { Coffee, Bike, ShoppingBag, Gift, MapPin } from 'lucide-react';
import { getCurrentUser } from '@/lib/authService';
import { analyzeUserPattern } from '@/lib/personalizationService';
import { getFavoriteStations } from '@/lib/storage';

interface Ad {
  id: string;
  type: 'coffee' | 'bike' | 'store' | 'event';
  title: string;
  description: string;
  discount?: string;
  icon: any;
  location?: string;
  timeSlot?: string;
}

export default function PartnershipAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const user = getCurrentUser();

  useEffect(() => {
    // 현재 위치 감지 (실제로는 GPS 또는 사용자 설정 기반)
    detectLocation();
  }, [user]);

  useEffect(() => {
    if (currentLocation) {
      loadAds();
    }
  }, [currentLocation]);

  const detectLocation = () => {
    // 사용자 패턴 기반으로 현재 위치 추정
    const pattern = analyzeUserPattern(user?.id);
    const favorites = getFavoriteStations();
    
    if (favorites.length > 0) {
      setCurrentLocation(favorites[0].stationName);
    } else if (pattern.frequentStations.length > 0) {
      setCurrentLocation(pattern.frequentStations[0].station);
    } else {
      setCurrentLocation('강남역'); // 기본값
    }
  };

  const loadAds = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // 시간대별 맞춤 광고 생성
    const mockAds: Ad[] = [];

    // 혼잡도 낮은 시간대 광고
    if (hour >= 10 && hour <= 16) {
      mockAds.push({
        id: 'coffee-1',
        type: 'coffee',
        title: '혼잡도 낮은 시간대에 커피 10% 할인 ☕',
        description: `${currentLocation || '지하철'} 근처 카페에서 특별 할인`,
        discount: '10%',
        icon: Coffee,
        timeSlot: '10시~16시',
        location: `${currentLocation || '지하철'} 근처`,
      });
    }

    // 공유 킥보드 광고
    mockAds.push({
      id: 'bike-1',
      type: 'bike',
      title: '지하철 근처 공유 킥보드 5분 무료 🚴',
      description: `${currentLocation || '역'} 근처에서 킥보드 이용 시`,
      discount: '5분 무료',
      icon: Bike,
      location: `${currentLocation || '역'} 근처`,
    });

    // 편의점 광고 (혼잡 구간 근처)
    if (hour >= 7 && hour <= 9 || hour >= 18 && hour <= 20) {
      mockAds.push({
        id: 'store-1',
        type: 'store',
        title: '혼잡 구간 근처 편의점 특가',
        description: '출퇴근 시간대 특별 할인',
        icon: ShoppingBag,
        location: `${currentLocation || '강남역'} 근처`,
        discount: '15%',
      });
    }

    setAds(mockAds.slice(0, 2)); // 최대 2개만 표시
  };

  return (
    <div className="space-y-3">
      {ads.map((ad) => {
        const Icon = ad.icon;
        return (
          <div
            key={ad.id}
            className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 relative overflow-hidden group hover:shadow-lg transition-all duration-300"
          >
            {/* 비침 효과 배경 - 더 강화 */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-100/60 via-yellow-100/40 to-transparent dark:from-orange-800/40 dark:via-yellow-800/20 opacity-60 group-hover:opacity-80 transition-opacity"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/30 dark:bg-orange-800/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {ad.title}
                  </h4>
                  {ad.discount && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded shadow-sm animate-pulse">
                      {ad.discount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {ad.description}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  {ad.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span>{ad.location}</span>
                    </div>
                  )}
                  {ad.timeSlot && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      ⏰ {ad.timeSlot}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

