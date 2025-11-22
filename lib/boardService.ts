// 게시판 서비스

import { random } from './random';

export interface BoardPost {
  id: string;
  author: string;
  authorId?: string;
  title: string;
  content: string;
  images?: string[];
  stationName?: string;
  lineNum?: string;
  timeSlot?: string;
  category: 'review' | 'tip' | 'alert' | 'complaint' | 'route';
  tags: string[];
  likes: number;
  reports: number;
  createdAt: Date;
  updatedAt: Date;
  aiSummary?: string;
  aiTags?: string[];
  aiConfidence?: number;
  verified: boolean;
}

export interface BoardComment {
  id: string;
  postId: string;
  author: string;
  authorId?: string;
  content: string;
  likes: number;
  createdAt: Date;
}

// 게시글 저장
export const savePost = async (post: Omit<BoardPost, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'reports' | 'verified'>): Promise<BoardPost> => {
  if (typeof window === 'undefined') {
    throw new Error('브라우저 환경에서만 사용 가능합니다.');
  }

  // ID 생성 시 시드 기반 랜덤 사용 (재현 가능하도록)
  const randomSuffix = random.randomInt(0, 999999999).toString(36).padStart(9, '0');
  const newPost: BoardPost = {
    ...post,
    id: `post_${Date.now()}_${randomSuffix}`,
    likes: 0,
    reports: 0,
    verified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // AI 분석 수행
  const aiAnalysis = await analyzePostWithAI(newPost);
  newPost.aiSummary = aiAnalysis.summary;
  newPost.aiTags = aiAnalysis.tags;
  newPost.aiConfidence = aiAnalysis.confidence;

  // 부적절한 내용 필터링
  if (aiAnalysis.confidence < 0.5 || aiAnalysis.inappropriate) {
    throw new Error('부적절한 내용이 감지되었습니다.');
  }

  const posts = getPosts();
  posts.push(newPost);
  localStorage.setItem('board_posts', JSON.stringify(posts));

  return newPost;
};

// 게시글 조회
export const getPosts = (filters?: {
  category?: string;
  stationName?: string;
  lineNum?: string;
  search?: string;
}): BoardPost[] => {
  if (typeof window === 'undefined') return [];

  try {
    const posts: BoardPost[] = JSON.parse(localStorage.getItem('board_posts') || '[]');
    
    let filtered = posts;

    if (filters?.category) {
      filtered = filtered.filter((p) => p.category === filters.category);
    }

    if (filters?.stationName) {
      filtered = filtered.filter((p) => p.stationName === filters.stationName);
    }

    if (filters?.lineNum) {
      filtered = filtered.filter((p) => p.lineNum === filters.lineNum);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.content.toLowerCase().includes(searchLower) ||
          p.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    return [];
  }
};

// 게시글 상세 조회
export const getPost = (id: string): BoardPost | null => {
  const posts = getPosts();
  return posts.find((p) => p.id === id) || null;
};

// 게시글 수정
export const updatePost = async (id: string, updates: Partial<BoardPost>): Promise<BoardPost | null> => {
  const posts = getPosts();
  const index = posts.findIndex((p) => p.id === id);
  
  if (index === -1) return null;

  posts[index] = {
    ...posts[index],
    ...updates,
    updatedAt: new Date(),
  };

  localStorage.setItem('board_posts', JSON.stringify(posts));
  return posts[index];
};

// 게시글 삭제
export const deletePost = (id: string): boolean => {
  const posts = getPosts();
  const filtered = posts.filter((p) => p.id !== id);
  
  if (filtered.length === posts.length) return false;

  localStorage.setItem('board_posts', JSON.stringify(filtered));
  return true;
};

// 좋아요
export const likePost = (id: string): number => {
  const posts = getPosts();
  const post = posts.find((p) => p.id === id);
  
  if (!post) return 0;

  post.likes += 1;
  localStorage.setItem('board_posts', JSON.stringify(posts));
  return post.likes;
};

// 신고
export const reportPost = (id: string): number => {
  const posts = getPosts();
  const post = posts.find((p) => p.id === id);
  
  if (!post) return 0;

  post.reports += 1;
  localStorage.setItem('board_posts', JSON.stringify(posts));
  return post.reports;
};

// 댓글 저장
export const saveComment = (comment: Omit<BoardComment, 'id' | 'createdAt' | 'likes'>): BoardComment => {
  const randomSuffix = random.randomInt(0, 999999999).toString(36).padStart(9, '0');
  const newComment: BoardComment = {
    ...comment,
    id: `comment_${Date.now()}_${randomSuffix}`,
    likes: 0,
    createdAt: new Date(),
  };

  const comments = getComments(comment.postId);
  comments.push(newComment);
  localStorage.setItem(`board_comments_${comment.postId}`, JSON.stringify(comments));

  return newComment;
};

// 댓글 조회
export const getComments = (postId: string): BoardComment[] => {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem(`board_comments_${postId}`) || '[]');
  } catch (error) {
    return [];
  }
};

// AI 기반 게시글 분석
async function analyzePostWithAI(post: BoardPost): Promise<{
  summary: string;
  tags: string[];
  confidence: number;
  inappropriate: boolean;
}> {
  // 간단한 키워드 기반 분석 (실제로는 OpenAI API 등을 사용)
  const content = `${post.title} ${post.content}`.toLowerCase();
  
  // 부적절한 키워드 체크
  const inappropriateKeywords = ['욕설', '비방', '허위'];
  const inappropriate = inappropriateKeywords.some((kw) => content.includes(kw));

  // 태그 추출
  const tags: string[] = [];
  if (post.stationName) tags.push(post.stationName);
  if (post.lineNum) tags.push(`${post.lineNum}호선`);
  if (content.includes('출근')) tags.push('출근');
  if (content.includes('퇴근')) tags.push('퇴근');
  if (content.includes('혼잡')) tags.push('혼잡');
  if (content.includes('추천')) tags.push('추천');
  if (content.includes('위험')) tags.push('위험');

  // 요약 생성
  const summary = post.content.length > 100 
    ? post.content.substring(0, 100) + '...'
    : post.content;

  // 신뢰도 계산 (간단한 휴리스틱)
  let confidence = 0.8;
  if (post.images && post.images.length > 0) confidence += 0.1;
  if (post.stationName && post.lineNum) confidence += 0.05;
  if (inappropriate) confidence = 0.2;

  return {
    summary,
    tags: [...new Set(tags)],
    confidence: Math.min(confidence, 1.0),
    inappropriate,
  };
}


