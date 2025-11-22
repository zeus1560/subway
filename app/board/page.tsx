'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Filter, MessageSquare, Heart, AlertTriangle, 
  TrendingUp, Clock, ChevronRight, PlusCircle, Route, 
  Activity, Hash, Sparkles, Lightbulb, Users
} from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { getPosts, savePost, BoardPost, getComments } from '@/lib/boardService';
import { getLineColor } from '@/lib/utils';

export default function BoardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [popularPosts, setPopularPosts] = useState<BoardPost[]>([]);
  const [showFabTooltip, setShowFabTooltip] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadPosts();
    loadPopularPosts();
  }, [filter, searchQuery]);

  const loadPosts = () => {
    const filters: any = {};
    if (filter !== 'all') {
      filters.category = filter;
    }
    if (searchQuery) {
      filters.search = searchQuery;
    }
    const loadedPosts = getPosts(filters);
    setPosts(loadedPosts);
  };

  const loadPopularPosts = () => {
    const allPosts = getPosts();
    const popular = [...allPosts]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 2);
    setPopularPosts(popular);
  };

  // 실시간 트렌드 데이터 생성 (모의)
  const getTrendingLines = () => {
    const allPosts = getPosts();
    const lineMentions: Record<string, { count: number; congestion: string }> = {};
    
    allPosts.forEach(post => {
      if (post.lineNum) {
        if (!lineMentions[post.lineNum]) {
          lineMentions[post.lineNum] = { count: 0, congestion: '보통' };
        }
        lineMentions[post.lineNum].count++;
      }
    });

    return Object.entries(lineMentions)
      .map(([lineNum, data]) => ({
        lineNum,
        count: data.count,
        congestion: data.congestion,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  // 인기 태그 데이터 생성 (모의)
  const getPopularTags = () => {
    const allPosts = getPosts();
    const tagCounts: Record<string, number> = {};
    
    allPosts.forEach(post => {
      post.aiTags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([tag]) => tag);
  };

  if (!mounted) {
    return null;
  }

  const categories = [
    { id: 'all', label: '전체', icon: MessageSquare },
    { id: 'review', label: '후기', icon: MessageSquare },
    { id: 'tip', label: '팁', icon: AlertTriangle },
    { id: 'alert', label: '알림', icon: AlertTriangle },
    { id: 'route', label: '루트', icon: Route },
  ];

  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(p => p.category === filter);

  const trendingLines = getTrendingLines();
  const popularTags = getPopularTags();

  return (
    <div className="min-h-screen bg-[#f9fafb] dark:bg-gray-900 pb-20">
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .fab-bounce {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>

      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#111827] dark:text-white">커뮤니티</h1>
          </div>

          {/* 검색창 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-[#111827] dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
            />
          </div>

          {/* 오늘의 인기 게시글 (검색창 아래) */}
          {popularPosts.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-[#2563eb]" />
                <h2 className="text-lg font-semibold text-[#111827] dark:text-white">오늘의 인기글</h2>
              </div>
              <div className="space-y-3">
                {popularPosts.map((post) => {
                  const commentCount = getComments(post.id).length;
                  return (
                    <div
                      key={post.id}
                      onClick={() => router.push(`/board/${post.id}`)}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800 p-4 cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[#2563eb]/10 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-[#2563eb]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {post.stationName && (
                              <span
                                className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                                style={{ backgroundColor: getLineColor(post.lineNum || '1') }}
                              >
                                {post.stationName}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-[#111827] dark:text-white mb-1 line-clamp-1">
                            {post.title}
                          </h3>
                          {post.aiSummary && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                              {post.aiSummary}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                              <span className="font-medium">{post.likes}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{commentCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatDate(post.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 탭 */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = filter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#2563eb] text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* 실시간 트렌드 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-[#2563eb]" />
            <h2 className="text-lg font-semibold text-[#111827] dark:text-white">실시간 트렌드</h2>
          </div>
          {trendingLines.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="space-y-3">
                {trendingLines.map((trend, index) => (
                  <div
                    key={trend.lineNum}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    style={{ 
                      borderLeft: `4px solid ${getLineColor(trend.lineNum)}`,
                      backgroundColor: `${getLineColor(trend.lineNum)}10`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                        style={{ backgroundColor: getLineColor(trend.lineNum) }}
                      >
                        {trend.lineNum}
                      </div>
                      <div>
                        <div className="font-semibold text-[#111827] dark:text-white">
                          {trend.lineNum}호선
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {trend.count}개 게시글
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs rounded font-medium">
                        {trend.congestion}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                <Sparkles className="w-5 h-5" />
                <span>서울 전역 평균 혼잡도 안정적이에요 🌤️</span>
              </div>
            </div>
          )}
        </div>

        {/* 인기 태그 */}
        {popularTags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-5 h-5 text-[#2563eb]" />
              <h2 className="text-lg font-semibold text-[#111827] dark:text-white">인기 태그</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(`#${tag}`)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-[#111827] dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 게시글 리스트 */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex flex-col items-center justify-center">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <Users className="w-16 h-16 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-base">
                아직 등록된 글이 없습니다. 첫 게시글을 작성해서 정보를 나눠보세요 🧍‍♂️💬
              </p>
              <button
                onClick={() => router.push('/board/write')}
                className="bg-[#2563eb] text-white px-6 py-3 rounded-full shadow-md hover:scale-105 transition-transform font-medium flex items-center gap-2 mb-6"
              >
                <span>✏️</span>
                <span>첫 글 작성하기</span>
              </button>
              
              {/* 신규 유저용 카드 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800 p-4 max-w-md">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#2563eb]/10 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-[#2563eb]" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    AI가 자주 이용하는 노선을 기반으로 추천글을 제공합니다 💡
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const commentCount = getComments(post.id).length;
              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/board/${post.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                >
                  {/* 상단: 태그, 제목 */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      {post.stationName && (
                        <span
                          className="px-2 py-1 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: getLineColor(post.lineNum || '1') }}
                        >
                          {post.stationName}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs rounded font-medium">
                        {getCategoryLabel(post.category)}
                      </span>
                    </div>
                    <h3 className="font-bold text-[#111827] dark:text-white mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                  </div>

                  {/* 본문: 최대 2줄 요약 */}
                  {post.aiSummary && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {post.aiSummary}
                    </p>
                  )}

                  {/* 하단: 댓글 수, 좋아요 수, 작성 시간 */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" />
                        <span>{commentCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button with Tooltip */}
      <div className="fixed bottom-24 right-4 z-50">
        {showFabTooltip && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap">
            글 작성하기 ✏️
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
        <button
          onClick={() => router.push('/board/write')}
          onMouseEnter={() => setShowFabTooltip(true)}
          onMouseLeave={() => setShowFabTooltip(false)}
          className="fab-bounce bg-[#2563eb] text-white p-4 rounded-full shadow-lg hover:bg-[#1d4ed8] hover:scale-110 transition-all flex items-center justify-center"
          aria-label="게시글 작성"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    review: '후기',
    tip: '팁',
    alert: '알림',
    complaint: '민원',
    route: '루트',
  };
  return labels[category] || category;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString('ko-KR');
}
