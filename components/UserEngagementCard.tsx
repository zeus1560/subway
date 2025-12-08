'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, ThumbsUp, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getPosts } from '@/lib/boardService';

export default function UserEngagementCard() {
  const router = useRouter();
  const [userVote, setUserVote] = useState<'normal' | 'crowded' | 'comfortable' | null>(null);
  const [voteData, setVoteData] = useState({
    comfortable: 45,
    normal: 30,
    crowded: 25,
  });
  const [popularPosts, setPopularPosts] = useState<Array<{ id: number; title: string; likes: number }>>([]);

  useEffect(() => {
    // 커뮤니티 인기글 가져오기
    try {
      const allPosts = getPosts();
      // 좋아요 순으로 정렬하고 상위 3개 선택
      const sortedPosts = allPosts
        .sort((a: any, b: any) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 3);
      
      const formattedPosts = sortedPosts.map((post: any) => ({
        id: post.id,
        title: post.title || post.content?.substring(0, 30) + '...',
        likes: post.likes || 0,
      }));
      
      setPopularPosts(formattedPosts.length > 0 ? formattedPosts : [
        { id: 1, title: '강남역 2호선 5호차가 가장 덜 붐빔', likes: 234 },
        { id: 2, title: '출근 시간 10분 늦추면 30% 덜 붐빔', likes: 189 },
        { id: 3, title: '홍대입구 환승 꿀팁 공유', likes: 156 },
      ]);
    } catch (error) {
      // 기본값 사용
      setPopularPosts([
        { id: 1, title: '강남역 2호선 5호차가 가장 덜 붐빔', likes: 234 },
        { id: 2, title: '출근 시간 10분 늦추면 30% 덜 붐빔', likes: 189 },
        { id: 3, title: '홍대입구 환승 꿀팁 공유', likes: 156 },
      ]);
    }
  }, []);

  const handleVote = (vote: 'normal' | 'crowded' | 'comfortable') => {
    if (userVote) return; // 이미 투표한 경우
    
    setUserVote(vote);
    setVoteData((prev) => ({
      ...prev,
      [vote]: prev[vote] + 1,
    }));
  };

  const chartData = [
    { name: '쾌적', value: voteData.comfortable, color: '#3B82F6' },
    { name: '보통', value: voteData.normal, color: '#10B981' },
    { name: '혼잡', value: voteData.crowded, color: '#EF4444' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">사용자 참여</h3>
      </div>

      {/* 오늘 출근 투표 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          오늘 출근 어땠나요?
        </h4>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => handleVote('comfortable')}
            disabled={!!userVote}
            className={`p-3 rounded-lg border-2 transition-all ${
              userVote === 'comfortable'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : userVote
                ? 'border-gray-200 dark:border-gray-700 opacity-50'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <div className="text-2xl mb-1">😊</div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">쾌적</div>
          </button>
          <button
            onClick={() => handleVote('normal')}
            disabled={!!userVote}
            className={`p-3 rounded-lg border-2 transition-all ${
              userVote === 'normal'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : userVote
                ? 'border-gray-200 dark:border-gray-700 opacity-50'
                : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
            }`}
          >
            <div className="text-2xl mb-1">😐</div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">보통</div>
          </button>
          <button
            onClick={() => handleVote('crowded')}
            disabled={!!userVote}
            className={`p-3 rounded-lg border-2 transition-all ${
              userVote === 'crowded'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : userVote
                ? 'border-gray-200 dark:border-gray-700 opacity-50'
                : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
            }`}
          >
            <div className="text-2xl mb-1">😰</div>
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">혼잡</div>
          </button>
        </div>

        {/* 투표 결과 그래프 */}
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          총 {voteData.comfortable + voteData.normal + voteData.crowded}명 참여
        </div>
      </div>

      {/* 커뮤니티 인기글 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          커뮤니티 인기글
        </h4>
        <div className="space-y-2">
          {popularPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => router.push(`/board/${post.id}`)}
              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                    {post.title}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2 text-xs text-gray-500 dark:text-gray-400">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{post.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

