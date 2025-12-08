'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Moon, Sun, Bell, Trash2, LogOut, User, Star, MapPin, 
  Zap, Info, ChevronRight, Settings, Eye, EyeOff,
  Navigation, Smartphone, Shield, Crown, Globe
} from 'lucide-react';
import { useTheme } from 'next-themes';
import BottomNavigation from '@/components/BottomNavigation';
import { getCurrentUser, logout } from '@/lib/authService';
import {
  requestNotificationPermission,
  getNotificationSettings,
  saveNotificationSettings,
} from '@/lib/notificationService';
import SettingsSection from '@/components/settings/SettingsSection';
import SettingsItem from '@/components/settings/SettingsItem';

// iOS 스타일 토글 컴포넌트
function ToggleSwitch({ 
  enabled, 
  onChange 
}: { 
  enabled: boolean; 
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563eb]"></div>
    </label>
  );
}

// Chip 컴포넌트
function Chip({ 
  label, 
  active, 
  onClick 
}: { 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-[#2563eb] text-white shadow-sm'
          : 'bg-white/10 text-white/70 hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // 새로운 상태들
  const [locationBased, setLocationBased] = useState(true);
  const [visualizationMode, setVisualizationMode] = useState<'standard' | 'compact' | 'detailed'>('standard');
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  // 로그인 상태 업데이트 함수
  const updateUserState = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  };

  useEffect(() => {
    setMounted(true);
    updateUserState();
    
    const settings = getNotificationSettings();
    setNotifications(settings.enabled);
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // 즐겨찾기 개수 로드
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavoriteCount(favorites.length);

    // 위치 기반 설정 로드
    const locationSettings = JSON.parse(localStorage.getItem('locationSettings') || '{"enabled": true}');
    setLocationBased(locationSettings.enabled);

    // 시각화 모드 로드
    const vizMode = localStorage.getItem('visualizationMode') || 'standard';
    setVisualizationMode(vizMode as 'standard' | 'compact' | 'detailed');

    // 로그인 상태 변경 이벤트 리스너 추가
    const handleAuthStateChanged = () => {
      updateUserState();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-state-changed', handleAuthStateChanged);
      window.addEventListener('storage', handleAuthStateChanged);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-state-changed', handleAuthStateChanged);
        window.removeEventListener('storage', handleAuthStateChanged);
      }
    };
  }, []);

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        alert('알림 권한이 필요합니다. 브라우저 설정에서 알림을 허용해주세요.');
        return;
      }
      setNotificationPermission(Notification.permission);
    }
    
    setNotifications(enabled);
    saveNotificationSettings({
      ...getNotificationSettings(),
      enabled,
    });
  };

  const handleLocationToggle = (enabled: boolean) => {
    setLocationBased(enabled);
    localStorage.setItem('locationSettings', JSON.stringify({ enabled }));
  };

  const handleVisualizationModeChange = (mode: 'standard' | 'compact' | 'detailed') => {
    setVisualizationMode(mode);
    localStorage.setItem('visualizationMode', mode);
  };

  const handleClearData = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까? (즐겨찾기, 출근 경로 등)')) {
      localStorage.clear();
      alert('데이터가 삭제되었습니다.');
      window.location.reload();
    }
  };

  const handleManageFavorites = () => {
    router.push('/favorites');
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#020617] pb-20">
      <header className="sticky top-0 z-40 bg-[#020617] border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-white" />
            <h1 className="text-xl font-semibold text-white">설정</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 md:py-10">
        <div className="space-y-8">
        {/* 1. 테마 / 알림 */}
        <div className="first:mt-0 mt-8">
          <h3 className="text-sm font-semibold text-text-strong mb-2">테마 설정</h3>
          <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/10">
            <SettingsItem
              label="다크 모드"
              description={theme === 'dark' ? '다크 모드 사용 중' : '라이트 모드 사용 중'}
              control={
                <ToggleSwitch
                  enabled={theme === 'dark'}
                  onChange={(enabled) => setTheme(enabled ? 'dark' : 'light')}
                />
              }
            />
            <SettingsItem
              label="혼잡도 알림"
              description="실시간 혼잡도 알림 받기"
              control={
                <ToggleSwitch
                  enabled={notifications}
                  onChange={handleNotificationToggle}
                />
              }
            />
            {notificationPermission === 'denied' && (
              <div className="py-3 px-4 border-b border-border-subtle">
                <div className="text-sm text-red-400">
                  알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. 위치 기반 서비스 */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-text-strong mb-2">위치 기반 서비스</h3>
          <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/10">
            <SettingsItem
              label="위치 기반 서비스"
              description="내 위치 기반 혼잡도 정보 제공"
              control={
                <ToggleSwitch
                  enabled={locationBased}
                  onChange={handleLocationToggle}
                />
              }
            />
            <SettingsItem
              label="GPS 정확도"
              description="고정밀 위치 추적"
              control={
                <ToggleSwitch
                  enabled={false}
                  onChange={() => {}}
                />
              }
            />
          </div>
        </div>

        {/* 3. 사용자 모드 선택 */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-text-strong mb-2">사용자 모드 선택</h3>
          <div className="rounded-2xl bg-white/5 border border-white/10">
            <div className="py-3 px-4 border-b border-border-subtle">
              <div className="text-base font-semibold text-white mb-2">
                시각화 모드
              </div>
              <div className="text-sm text-white/60 mb-3">
                혼잡도 정보 표시 방식 선택
              </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="표준"
                active={visualizationMode === 'standard'}
                onClick={() => handleVisualizationModeChange('standard')}
              />
              <Chip
                label="간소"
                active={visualizationMode === 'compact'}
                onClick={() => handleVisualizationModeChange('compact')}
              />
              <Chip
                label="상세"
                active={visualizationMode === 'detailed'}
                onClick={() => handleVisualizationModeChange('detailed')}
              />
            </div>
          </div>
          </div>
        </div>

        {/* 4. 프리미엄 정보 */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-text-strong mb-2">프리미엄 정보</h3>
          <div className="rounded-xl bg-bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-semibold text-white mb-2">
                  지하철 혼잡도 프리미엄
                </p>
                <p className="text-sm text-white/60">
                  {isPremium 
                    ? '프리미엄 멤버십을 이용 중입니다' 
                    : '실시간 예측 강화, 더 많은 즐겨찾기, 광고 제거 등의 기능을 제공합니다.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  // 프리미엄 구독 관리 페이지로 이동
                  alert('프리미엄 구독 관리 페이지로 이동합니다.');
                }}
                className="mt-2 md:mt-0 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
              >
                <Crown className="w-4 h-4 mr-1.5" />
                {isPremium ? '구독 관리' : '자세히 보기'}
              </button>
            </div>
          </div>
        </div>

        {/* 5. 앱 정보 / 데이터 관리 */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-text-strong mb-2">앱 정보 / 데이터 관리</h3>
          <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/10">
            <SettingsItem
              label="즐겨찾기"
              description={`${favoriteCount}개 저장됨`}
              control={
                <button
                  onClick={handleManageFavorites}
                  className="text-[#2563eb] hover:text-[#1d4ed8] font-medium text-sm flex items-center gap-1"
                >
                  관리
                  <ChevronRight className="w-4 h-4" />
                </button>
              }
            />
          <SettingsItem
            label="모든 데이터 삭제"
            description="저장된 모든 데이터를 삭제합니다"
            control={
              <button
                onClick={handleClearData}
                className="text-red-400 hover:text-red-300 font-medium text-sm"
              >
                삭제
              </button>
            }
          />
          <SettingsItem
            label="개인정보 처리방침"
            description="개인정보 보호 정책 확인"
            control={<ChevronRight className="w-5 h-5 text-white/40" />}
            onClick={() => {
              // 개인정보 처리방침 페이지로 이동
              alert('개인정보 처리방침 페이지로 이동합니다.');
            }}
          />
          <SettingsItem
            label="이용약관"
            description="서비스 이용약관 확인"
            control={<ChevronRight className="w-5 h-5 text-white/40" />}
            onClick={() => {
              // 이용약관 페이지로 이동
              alert('이용약관 페이지로 이동합니다.');
            }}
          />
          </div>
        </div>

        {/* 로그인 / 계정 정보 - 카드형 */}
        {user && (
          <div className="mt-8">
            <div className="rounded-xl bg-bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-[#2563eb]/20 rounded-full">
                  <User className="w-6 h-6 text-[#2563eb]" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-white">{user.name}</div>
                  <div className="text-xs text-white/60 mt-0.5">{user.email}</div>
                  <div className="text-xs text-white/40 mt-1">
                    {user.type === 'company' ? '기업 계정' : '개인 계정'}
                </div>
              </div>
            </div>
            <SettingsItem
              label="로그아웃"
              description="현재 계정에서 로그아웃합니다"
              control={
                <LogOut className="w-5 h-5 text-red-400" />
              }
              onClick={() => {
                logout();
                router.push('/');
                window.location.reload();
              }}
            />
            </div>
          </div>
        )}

        {!user && (
          <div className="mt-8">
            <div className="rounded-xl bg-bg-card p-4 shadow-sm">
            <SettingsItem
              label="로그인"
              description="계정에 로그인합니다"
              control={
                <ChevronRight className="w-5 h-5 text-white/40" />
              }
              onClick={() => router.push('/login')}
            />
            </div>
          </div>
        )}

        {/* 버전 정보 - 카드형 */}
        <div className="mt-8">
          <div className="rounded-xl bg-bg-card p-4 shadow-sm">
            <SettingsItem
              label="버전"
              description="1.0.0"
              control={<ChevronRight className="w-5 h-5 text-white/40" />}
              onClick={() => {
                // 버전 정보 페이지로 이동
                alert('버전 정보: 1.0.0');
              }}
            />
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="text-center py-6 mt-8">
          <div className="text-sm text-white/60 mb-2">
            서울 지하철 혼잡도 · 버전 1.0.0
          </div>
          <div className="text-xs text-white/40">
            © Open Data API 사용
          </div>
        </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
