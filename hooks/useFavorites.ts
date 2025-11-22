'use client';

import { useState, useEffect, useCallback } from 'react';

export interface FavoriteStation {
  stationName: string;
  lineNum?: string;
  addedAt: string;
}

export interface FavoriteRoute {
  start: string;
  end: string;
  lastUsed: string;
  useCount?: number;
}

interface FavoritesData {
  favoriteStations: FavoriteStation[];
  favoriteRoutes: FavoriteRoute[];
}

const STORAGE_KEY = 'subway_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritesData>({
    favoriteStations: [],
    favoriteRoutes: [],
  });

  // localStorage에서 데이터 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites({
          favoriteStations: parsed.favoriteStations || [],
          favoriteRoutes: parsed.favoriteRoutes || [],
        });
      }
    } catch (error) {
      console.error('즐겨찾기 로드 실패:', error);
    }
  }, []);

  // localStorage에 저장
  const saveFavorites = useCallback((data: FavoritesData) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setFavorites(data);
    } catch (error) {
      console.error('즐겨찾기 저장 실패:', error);
    }
  }, []);

  // 역 즐겨찾기 추가
  const addFavoriteStation = useCallback((stationName: string, lineNum?: string) => {
    const newStation: FavoriteStation = {
      stationName,
      lineNum,
      addedAt: new Date().toISOString(),
    };

    const updated = {
      ...favorites,
      favoriteStations: [
        ...favorites.favoriteStations.filter(
          (s) => !(s.stationName === stationName && s.lineNum === lineNum)
        ),
        newStation,
      ],
    };

    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  // 역 즐겨찾기 제거
  const removeFavoriteStation = useCallback((stationName: string, lineNum?: string) => {
    const updated = {
      ...favorites,
      favoriteStations: favorites.favoriteStations.filter(
        (s) => !(s.stationName === stationName && s.lineNum === lineNum)
      ),
    };

    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  // 역 즐겨찾기 확인
  const isFavoriteStation = useCallback((stationName: string, lineNum?: string): boolean => {
    return favorites.favoriteStations.some(
      (s) => s.stationName === stationName && s.lineNum === lineNum
    );
  }, [favorites.favoriteStations]);

  // 경로 즐겨찾기 추가
  const addFavoriteRoute = useCallback((start: string, end: string) => {
    const existing = favorites.favoriteRoutes.find(
      (r) => r.start === start && r.end === end
    );

    const newRoute: FavoriteRoute = existing
      ? {
          ...existing,
          lastUsed: new Date().toISOString(),
          useCount: (existing.useCount || 0) + 1,
        }
      : {
          start,
          end,
          lastUsed: new Date().toISOString(),
          useCount: 1,
        };

    const updated = {
      ...favorites,
      favoriteRoutes: [
        ...favorites.favoriteRoutes.filter(
          (r) => !(r.start === start && r.end === end)
        ),
        newRoute,
      ].sort((a, b) => {
        // 사용 횟수와 최근 사용일 기준으로 정렬
        if (b.useCount !== a.useCount) {
          return (b.useCount || 0) - (a.useCount || 0);
        }
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
      }),
    };

    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  // 경로 즐겨찾기 제거
  const removeFavoriteRoute = useCallback((start: string, end: string) => {
    const updated = {
      ...favorites,
      favoriteRoutes: favorites.favoriteRoutes.filter(
        (r) => !(r.start === start && r.end === end)
      ),
    };

    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  // 경로 즐겨찾기 확인
  const isFavoriteRoute = useCallback((start: string, end: string): boolean => {
    return favorites.favoriteRoutes.some(
      (r) => r.start === start && r.end === end
    );
  }, [favorites.favoriteRoutes]);

  return {
    favoriteStations: favorites.favoriteStations,
    favoriteRoutes: favorites.favoriteRoutes,
    addFavoriteStation,
    removeFavoriteStation,
    isFavoriteStation,
    addFavoriteRoute,
    removeFavoriteRoute,
    isFavoriteRoute,
  };
}

