'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, MessageSquare, Share2, AlertTriangle } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { getPost, likePost, reportPost, getComments, saveComment } from '@/lib/boardService';
import { getLineColor } from '@/lib/utils';

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = () => {
    const loadedPost = getPost(postId);
    if (!loadedPost) {
      router.push('/board');
      return;
    }
    setPost(loadedPost);
    const loadedComments = getComments(postId);
    setComments(loadedComments);
    setLoading(false);
  };

  const handleLike = () => {
    if (!post) return;
    const newLikes = likePost(post.id);
    setPost({ ...post, likes: newLikes });
  };

  const handleReport = () => {
    if (!post) return;
    if (confirm('이 게시글을 신고하시겠습니까?')) {
      reportPost(post.id);
      alert('신고되었습니다.');
    }
  };

  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;
    
    saveComment({
      postId,
      author: '익명',
      content: commentText,
    });
    
    setCommentText('');
    loadPost();
  };

  if (loading || !post) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">게시글</h1>
            <div className="flex-1" />
            <button
              onClick={handleReport}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs rounded">
              {getCategoryLabel(post.category)}
            </span>
            {post.stationName && (
              <span
                className="px-2 py-1 text-xs rounded text-white"
                style={{ backgroundColor: getLineColor(post.lineNum || '1') }}
              >
                {post.stationName}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h2>

          {post.aiSummary && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">{post.aiSummary}</p>
            </div>
          )}

          <div className="mb-4">
            {post.images && post.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {post.images.map((img: string, i: number) => (
                  <img key={i} src={img} alt={`Image ${i}`} className="w-full h-48 object-cover rounded-lg" />
                ))}
              </div>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
            </div>
          </div>

          {post.aiTags && post.aiTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.aiTags.map((tag: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{post.author}</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Heart className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{post.likes}</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            댓글 {comments.length}
          </h3>

          <div className="space-y-4 mb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.author}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
              placeholder="댓글을 입력하세요..."
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCommentSubmit}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

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


