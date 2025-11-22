'use client';

interface SkeletonLoaderProps {
  count?: number;
  className?: string;
  height?: string;
}

export default function SkeletonLoader({
  count = 1,
  className = '',
  height = 'h-4',
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-label="로딩 중" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">콘텐츠를 불러오는 중입니다</span>
    </div>
  );
}

