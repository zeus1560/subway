'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, TrendingUp, Heart } from 'lucide-react';
import { getPosts } from '@/lib/boardService';
import { getLineColor } from '@/lib/utils';

export default function CommunityFeed() {
  const [popularPosts, setPopularPosts] = useState<any[]>([]);

  useEffect(() => {
    loadPopularPosts();
  }, []);

  const loadPopularPosts = () => {
    const posts = getPosts({ category: 'review' })
      .concat(getPosts({ category: 'tip' }))
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 3);
    
    setPopularPosts(posts);
  };

  if (popularPosts.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">커뮤니티 인기글</h2>
        </div>
        <Link href="/board" className="text-blue-500 hover:text-blue-600 text-sm font-medium">
          전체보기
        </Link>
      </div>
      <div className="space-y-3">
        {popularPosts.map((post) => (
          <Link
            key={post.id}
            href={`/board/${post.id}`}
            className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
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
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {post.author}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                  {post.title}
                </h3>
                {post.aiSummary && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {post.aiSummary}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{post.likes}</span>
                  </div>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
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


