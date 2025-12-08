'use client';

export type CongestionLevel = '여유' | '보통' | '주의' | '혼잡';

interface CongestionLegendBarProps {
  onHover?: (level: CongestionLevel | null) => void;
}

const CONGESTION_INFO: Record<CongestionLevel, { color: string; description: string }> = {
  '여유': {
    color: '#22C55E',
    description: '좌석에 앉을 수 있고, 여유롭게 이동 가능',
  },
  '보통': {
    color: '#FACC15',
    description: '서서 이동 가능하며, 약간의 혼잡함',
  },
  '주의': {
    color: '#FB923C',
    description: '이동이 다소 불편하며, 좁은 공간',
  },
  '혼잡': {
    color: '#F97373',
    description: '매우 혼잡하며, 이동이 어려움',
  },
};

export default function CongestionLegendBar({ onHover }: CongestionLegendBarProps) {
  return (
    <section className="w-full mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-[16px] p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-semibold text-[#111827] dark:text-white mb-3 text-center">
          혼잡도 안내
        </div>
        <div className="flex h-12 rounded-[14px] overflow-hidden">
          {(['여유', '보통', '주의', '혼잡'] as CongestionLevel[]).map((level, index) => {
            const info = CONGESTION_INFO[level];
            const isLast = index === 3;

            return (
              <div
                key={level}
                className="flex-1 flex flex-col items-center justify-center text-xs font-medium text-white relative group cursor-pointer"
                style={{ backgroundColor: info.color }}
                onMouseEnter={() => onHover?.(level)}
                onMouseLeave={() => onHover?.(null)}
              >
                {!isLast && (
                  <div className="absolute right-0 top-0 bottom-0 w-px bg-white opacity-50" />
                )}
                <span className="font-bold">{level}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

