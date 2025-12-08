'use client';

import BottomNavigation from '@/components/BottomNavigation';
import LineMapLayout from '@/components/map/LineMapLayout';

export default function MapPage() {
  return (
    <div className="h-screen flex flex-col bg-[#020617] overflow-hidden pb-[72px]">
      <div className="flex-1 min-h-0 overflow-hidden">
        <LineMapLayout />
      </div>
      <BottomNavigation />
    </div>
  );
}

