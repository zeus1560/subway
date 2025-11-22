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
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

// 설정 항목 컴포넌트
function SettingItem({
  icon: Icon,
  title,
  description,
  action,
  divider = true,
}: {
  icon: any;
  title: string;
  description?: string;
  action: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-[#111827] dark:text-white">{title}</div>
            {description && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="ml-4">
          {action}
        </div>
      </div>
      {divider && <div className="border-t border-gray-200 dark:border-gray-700" />}
    </>
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
    <div className="min-h-screen bg-[#f9fafb] dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#111827] dark:text-white" />
            <h1 className="text-2xl font-bold text-[#111827] dark:text-white">설정</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 테마 설정 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
              <h2 className="font-semibold text-[#111827] dark:text-white">테마 설정</h2>
            </div>
          </div>
          <SettingItem
            icon={theme === 'dark' ? Moon : Sun}
            title="다크 모드"
            description={theme === 'dark' ? '다크 모드 사용 중' : '라이트 모드 사용 중'}
            action={
              <ToggleSwitch
                enabled={theme === 'dark'}
                onChange={(enabled) => setTheme(enabled ? 'dark' : 'light')}
              />
            }
            divider={false}
          />
        </div>

        {/* 알림 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-[#111827] dark:text-white">알림</h2>
            </div>
          </div>
          <SettingItem
            icon={Bell}
            title="혼잡도 알림"
            description="실시간 혼잡도 알림 받기"
            action={
              <ToggleSwitch
                enabled={notifications}
                onChange={handleNotificationToggle}
              />
            }
            divider={true}
          />
          {notificationPermission === 'denied' && (
            <div className="px-4 py-2">
              <div className="text-xs text-red-500 dark:text-red-400">
                알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.
              </div>
            </div>
          )}
        </div>

        {/* 즐겨찾기 관리 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-[#111827] dark:text-white">즐겨찾기 관리</h2>
            </div>
          </div>
          <SettingItem
            icon={Star}
            title="즐겨찾기"
            description={`${favoriteCount}개 저장됨`}
            action={
              <button
                onClick={handleManageFavorites}
                className="text-[#2563eb] hover:text-[#1d4ed8] font-medium text-sm flex items-center gap-1"
              >
                관리
                <ChevronRight className="w-4 h-4" />
              </button>
            }
            divider={false}
          />
        </div>

        {/* 위치 기반 설정 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-[#111827] dark:text-white">위치 기반 설정</h2>
            </div>
          </div>
          <SettingItem
            icon={Navigation}
            title="위치 기반 서비스"
            description="내 위치 기반 혼잡도 정보 제공"
            action={
              <ToggleSwitch
                enabled={locationBased}
                onChange={handleLocationToggle}
              />
            }
            divider={true}
          />
          <SettingItem
            icon={Smartphone}
            title="GPS 정확도"
            description="고정밀 위치 추적"
            action={
              <ToggleSwitch
                enabled={false}
                onChange={() => {}}
              />
            }
            divider={false}
          />
        </div>

        {/* 시각화 모드 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-[#111827] dark:text-white">시각화 모드</h2>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
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

        {/* 프리미엄 서비스 */}
        <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] rounded-xl shadow-lg border border-blue-600 overflow-hidden">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-300" />
              <h2 className="font-semibold text-white">프리미엄 서비스</h2>
            </div>
            <p className="text-sm text-blue-100 mb-4">
              {isPremium 
                ? '프리미엄 멤버십을 이용 중입니다' 
                : '더 많은 기능과 개인화 옵션을 이용하세요'}
            </p>
            <button
              onClick={() => {
                // 프리미엄 구독 관리 페이지로 이동
                alert('프리미엄 구독 관리 페이지로 이동합니다.');
              }}
              className="w-full bg-white text-[#2563eb] font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              프리미엄 구독 관리
            </button>
          </div>
        </div>

        {/* 앱 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-[#111827] dark:text-white">앱 정보</h2>
            </div>
          </div>
          <SettingItem
            icon={Globe}
            title="버전"
            description="1.0.0"
            action={<ChevronRight className="w-5 h-5 text-gray-400" />}
            divider={true}
          />
          <SettingItem
            icon={Shield}
            title="개인정보 처리방침"
            description="개인정보 보호 정책 확인"
            action={<ChevronRight className="w-5 h-5 text-gray-400" />}
            divider={true}
          />
          <SettingItem
            icon={Info}
            title="이용약관"
            description="서비스 이용약관 확인"
            action={<ChevronRight className="w-5 h-5 text-gray-400" />}
            divider={false}
          />
        </div>

        {/* 데이터 관리 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-[#111827] dark:text-white">데이터 관리</h2>
            </div>
          </div>
          <SettingItem
            icon={Trash2}
            title="모든 데이터 삭제"
            description="저장된 모든 데이터를 삭제합니다"
            action={
              <button
                onClick={handleClearData}
                className="text-red-500 hover:text-red-600 font-medium text-sm"
              >
                삭제
              </button>
            }
            divider={false}
          />
        </div>

        {/* 사용자 정보 */}
        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#2563eb]/10 rounded-full">
                <User className="w-6 h-6 text-[#2563eb]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#111827] dark:text-white">{user.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {user.type === 'company' ? '기업 계정' : '개인 계정'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 로그인/로그아웃 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          {user ? (
            <button
              onClick={() => {
                logout();
                router.push('/');
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors font-medium"
            >
              <User className="w-5 h-5" />
              로그인
            </button>
          )}
        </div>

        {/* 하단 정보 */}
        <div className="text-center py-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            서울 지하철 혼잡도 · 버전 1.0.0
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            © Open Data API 사용
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
