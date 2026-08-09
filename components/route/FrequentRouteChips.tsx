'use client';

import { Route } from 'lucide-react';

export type FrequentRoute = {
  id: string;
  label: string; // "방화역 → 신논현역 (59회)" 이런 형태
  start: string;
  end: string;
};

interface FrequentRouteChipsProps {
  routes: FrequentRoute[];
  onSelect: (route: FrequentRoute) => void;
}

export default function FrequentRouteChips({ routes, onSelect }: FrequentRouteChipsProps) {
  if (routes.length === 0) {
    return null;
  }

  return (
    <section className="w-full mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Route className="w-5 h-5 text-brand-primary" />
        <h2 className="heading-2">자주 찾는 경로</h2>
      </div>
      
      {/* 가로 스크롤 가능한 칩 영역 */}
      <div className="overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex gap-3 min-w-max">
          {routes.map((route) => (
            <button
              key={route.id}
              onClick={() => onSelect(route)}
              className="px-4 py-2 bg-state-success/10 text-state-success rounded-card text-sm font-medium hover:bg-state-success/20 transition-colors whitespace-nowrap flex items-center gap-2 flex-shrink-0"
            >
              <Route className="w-4 h-4" />
              {route.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

