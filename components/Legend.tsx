'use client';

export default function Legend() {
  return (
    <div className="fixed top-20 right-4 z-50 bg-slate-900/80 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-slate-700/50">
      <div className="text-xs font-semibold text-white mb-2">혼잡도 범례</div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0"></div>
          <span className="text-xs text-white/90">쾌적 (0~30%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500 flex-shrink-0"></div>
          <span className="text-xs text-white/90">보통 (30~70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0"></div>
          <span className="text-xs text-white/90">혼잡 (70~100%)</span>
        </div>
      </div>
    </div>
  );
}

