'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PersonalizedCard as CardType } from '@/lib/personalizationService';

interface PersonalizedCardProps {
  card: CardType;
}

export default function PersonalizedCard({ card }: PersonalizedCardProps) {
  const cardColors: Record<string, string> = {
    congestion: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    departure: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    report: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    tip: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  };

  const content = (
    <div className={`border rounded-xl p-4 ${cardColors[card.type] || 'bg-gray-50 dark:bg-gray-800'}`}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{card.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{card.title}</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{card.content}</p>
          {card.action && (
            <Link
              href={card.action}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              자세히 보기
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  if (card.action) {
    return <Link href={card.action}>{content}</Link>;
  }

  return content;
}


