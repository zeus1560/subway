'use client';

interface CarCongestion {
  carNo: number;
  congestionLevel: string;
  value: number;
}

interface CongestionBarProps {
  car: CarCongestion;
  index: number;
}

export default function CongestionBar({ car, index }: CongestionBarProps) {
  const getCongestionColor = (level: string) => {
    switch (level) {
      case '여유':
        return '#dcfce7';
      case '보통':
        return '#fef9c3';
      case '주의':
        return '#fed7aa';
      case '혼잡':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const getCongestionBarColor = (level: string) => {
    switch (level) {
      case '여유':
        return '#22c55e';
      case '보통':
        return '#eab308';
      case '주의':
        return '#f97316';
      case '혼잡':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const getTextColor = (level: string) => {
    switch (level) {
      case '여유':
        return '#166534';
      case '보통':
        return '#854d0e';
      case '주의':
        return '#9a3412';
      case '혼잡':
        return '#991b1b';
      default:
        return '#6b7280';
    }
  };

  const isRecommended = car.congestionLevel === '여유' || car.congestionLevel === '보통';
  const carNo = car.carNo || `${index + 1}칸`;
  const value = car.value || 0;
  const congestionLevel = car.congestionLevel || '보통';

  return (
    <div
      className="relative rounded-[14px] p-4 text-center transition-all"
      style={{
        backgroundColor: getCongestionColor(congestionLevel),
      }}
    >
      {/* 추천 체크마크 */}
      {isRecommended && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">✓</span>
        </div>
      )}
      
      {/* 칸 번호 */}
      <div className="text-sm font-bold mb-3" style={{ color: getTextColor(congestionLevel) }}>
        {carNo}
      </div>
      
      {/* 혼잡도 바 */}
      <div
        className="h-20 rounded-[14px] mb-3 flex items-center justify-center"
        style={{
          backgroundColor: getCongestionBarColor(congestionLevel),
        }}
      >
        <span className="text-white text-sm font-bold">
          {value}%
        </span>
      </div>
      
      {/* 혼잡도 레벨 텍스트 */}
      <div className="text-xs font-semibold" style={{ color: getTextColor(congestionLevel) }}>
        {congestionLevel}
      </div>
    </div>
  );
}

