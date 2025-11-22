'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PredictionTimeContextType {
  hour: number; // 0~23
  minute: number; // 0, 15, 30, 45
  date: Date; // 선택된 날짜 (기본은 오늘)
  selectedDateTime: Date; // 최종 선택된 날짜/시간
  setHour: (h: number) => void;
  setMinute: (m: number) => void;
  setDate: (d: Date) => void;
  getTimestampIso: () => string; // ISO 문자열 반환
  resetToNow: () => void; // 현재 시간으로 리셋
}

const PredictionTimeContext = createContext<PredictionTimeContextType | undefined>(undefined);

// 현재 시간을 가장 가까운 15분 단위로 반올림
function roundToNearest15Minutes(date: Date): { hour: number; minute: number } {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  
  let hour = date.getHours();
  let minute = roundedMinutes;
  
  if (minute >= 60) {
    hour += 1;
    minute = 0;
  }
  
  if (hour >= 24) {
    hour = 0;
  }
  
  return { hour, minute };
}

export function PredictionTimeProvider({ children }: { children: ReactNode }) {
  // 현재 시간을 가장 가까운 15분 단위로 반올림하여 초기값 설정
  const now = new Date();
  const { hour: initialHour, minute: initialMinute } = roundToNearest15Minutes(now);
  
  const [hour, setHour] = useState<number>(initialHour);
  const [minute, setMinute] = useState<number>(initialMinute);
  const [date, setDate] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  
  // selectedDateTime 계산
  const selectedDateTime = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute
  );
  
  // hour, minute, date 변경 시 selectedDateTime 자동 업데이트
  useEffect(() => {
    // 과거 시간이면 현재 시간으로 조정
    const now = new Date();
    if (selectedDateTime < now) {
      const { hour: currentHour, minute: currentMinute } = roundToNearest15Minutes(now);
      setHour(currentHour);
      setMinute(currentMinute);
      setDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    }
  }, [selectedDateTime]);
  
  const getTimestampIso = (): string => {
    return selectedDateTime.toISOString();
  };
  
  const resetToNow = () => {
    const now = new Date();
    const { hour: currentHour, minute: currentMinute } = roundToNearest15Minutes(now);
    setHour(currentHour);
    setMinute(currentMinute);
    setDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  };
  
  return (
    <PredictionTimeContext.Provider
      value={{
        hour,
        minute,
        date,
        selectedDateTime,
        setHour,
        setMinute,
        setDate,
        getTimestampIso,
        resetToNow,
      }}
    >
      {children}
    </PredictionTimeContext.Provider>
  );
}

export function usePredictionTime() {
  const context = useContext(PredictionTimeContext);
  if (context === undefined) {
    throw new Error('usePredictionTime must be used within a PredictionTimeProvider');
  }
  return context;
}

