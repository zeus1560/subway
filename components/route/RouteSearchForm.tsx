'use client';

import { MapPin, Calendar, Search, ArrowUpDown } from 'lucide-react';

interface RouteSearchFormProps {
  from: string;
  to: string;
  departureTime: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  onSwapStations?: () => void;
  onChangeDepartureTime: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  minDateTime?: string;
  suggestedFrom?: string;
}

export default function RouteSearchForm({
  from,
  to,
  departureTime,
  onChangeFrom,
  onChangeTo,
  onSwapStations,
  onChangeDepartureTime,
  onSubmit,
  loading = false,
  minDateTime,
  suggestedFrom,
}: RouteSearchFormProps) {

  return (
    <section className="w-full mb-8">
      {/* 출발역/도착역 입력 카드 */}
      <div className="bg-bg-card rounded-xl p-4 shadow-sm flex flex-col gap-4">
        {/* 출발역 */}
        <div className="flex items-center gap-3">
          <MapPin className="w-[20px] h-[20px] text-brand-primary flex-shrink-0" />
          <input
            type="text"
            placeholder={suggestedFrom || "출발역 입력"}
            value={from}
            onChange={(e) => onChangeFrom(e.target.value)}
            className="flex-1 h-[48px] bg-background-soft text-text-strong placeholder-text-muted rounded-card px-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-primary"
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
        </div>

        {/* 교환 버튼 */}
        {onSwapStations && (
          <div className="flex justify-center">
            <button
              onClick={onSwapStations}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="출발역과 도착역 교환"
            >
              <ArrowUpDown className="w-5 h-5 text-text-strong" />
            </button>
          </div>
        )}

        {/* 도착역 */}
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-state-danger flex-shrink-0" />
          <input
            type="text"
            placeholder="도착역 입력"
            value={to}
            onChange={(e) => onChangeTo(e.target.value)}
            className="flex-1 h-[48px] bg-background-soft text-text-strong placeholder-text-muted rounded-card px-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-primary"
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
        </div>
      </div>

      {/* 출발 시간 설정 */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-[20px] h-[20px] text-brand-primary" />
          <label className="body-muted font-semibold">
            출발 시간
          </label>
        </div>
        <input
          type="datetime-local"
          value={departureTime}
          min={minDateTime}
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              const selectedTime = new Date(value);
              const now = new Date();
              if (selectedTime.getTime() < now.getTime()) {
                alert('과거 시간은 선택할 수 없습니다.');
                onChangeDepartureTime('');
              } else {
                onChangeDepartureTime(value);
              }
            } else {
              onChangeDepartureTime('');
            }
          }}
          className="w-full h-[48px] px-4 bg-background-soft text-text-strong rounded-card focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>

      {/* 검색 버튼 */}
      <div className="flex justify-end mt-4">
        <button
          onClick={onSubmit}
          disabled={loading || !from.trim() || !to.trim()}
          className="btn-primary px-6 py-2 rounded-card whitespace-nowrap"
        >
          <Search className="w-5 h-5" />
          {loading ? '찾는 중...' : '경로 찾기'}
        </button>
      </div>
    </section>
  );
}

