'use client';

interface RouteScoreProps {
  score: number; // 0~100
  showIcons?: boolean;
  showBar?: boolean;
  showText?: boolean;
}

export default function RouteScore({ score, showIcons = true, showBar = true, showText = true }: RouteScoreProps) {
  // 점수에 따른 레벨 결정
  const getLevel = (score: number): number => {
    if (score <= 30) return 1; // 쾌적
    if (score <= 70) return 2; // 보통
    return 3; // 혼잡
  };

  const level = getLevel(score);
  const levelText = level === 1 ? '쾌적' : level === 2 ? '보통' : '혼잡';
  const levelColor = level === 1 ? 'green' : level === 2 ? 'yellow' : 'red';

  // 아이콘 생성 (5개)
  const getIcons = () => {
    const icons = [];
    const filledCount = Math.ceil((score / 100) * 5);
    for (let i = 0; i < 5; i++) {
      if (i < filledCount) {
        icons.push(
          <span key={i} className="text-base">
            {level === 1 ? '🟢' : level === 2 ? '🟡' : '🔴'}
          </span>
        );
      } else {
        icons.push(
          <span key={i} className="text-base opacity-30">
            ⚪
          </span>
        );
      }
    }
    return icons;
  };

  return (
    <div className="space-y-2">
      {showText && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {score <= 30 && '이 경로가 가장 덜 막혀요'}
          {score > 30 && score <= 70 && '이 경로는 보통 수준이에요'}
          {score > 70 && '이 경로는 혼잡할 수 있어요'}
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            (혼잡도 점수 {score}%)
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        {showBar && (
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <div
              className={`h-full rounded-lg transition-all duration-300 ${
                level === 1 ? 'bg-green-500' : level === 2 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
        )}
        
        {showIcons && (
          <div className="flex items-center gap-0.5">
            {getIcons()}
          </div>
        )}
        
        <div className={`text-sm font-semibold ${
          level === 1 ? 'text-green-600 dark:text-green-400' :
          level === 2 ? 'text-yellow-600 dark:text-yellow-400' :
          'text-red-600 dark:text-red-400'
        }`}>
          {levelText}
        </div>
      </div>
    </div>
  );
}

