'use client';

import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  text,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-live="polite" aria-label={text || '로딩 중'}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} aria-hidden="true" />
      {text && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400" aria-hidden="true">
          {text}
        </p>
      )}
      <span className="sr-only">{text || '로딩 중입니다'}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

