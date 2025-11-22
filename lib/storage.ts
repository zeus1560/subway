// 브라우저 localStorage 기반 저장소

export const saveFavoriteStation = async (station: { stationName: string; lineNum: string }) => {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavoriteStations();
    if (!favorites.find((fav: any) => fav.stationName === station.stationName && fav.lineNum === station.lineNum)) {
      favorites.push(station);
      localStorage.setItem('favoriteStations', JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('즐겨찾기 저장 오류:', error);
  }
};

export const getFavoriteStations = (): any[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem('favoriteStations');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('즐겨찾기 불러오기 오류:', error);
    return [];
  }
};

export const removeFavoriteStation = async (station: { stationName: string; lineNum: string }) => {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavoriteStations();
    const filtered = favorites.filter(
      (fav: any) => !(fav.stationName === station.stationName && fav.lineNum === station.lineNum)
    );
    localStorage.setItem('favoriteStations', JSON.stringify(filtered));
  } catch (error) {
    console.error('즐겨찾기 삭제 오류:', error);
  }
};

export const saveCommuteRoute = async (route: any) => {
  if (typeof window === 'undefined') return;
  
  try {
    const routes = getCommuteRoutes();
    routes.push(route);
    localStorage.setItem('commuteRoutes', JSON.stringify(routes));
  } catch (error) {
    console.error('출근 경로 저장 오류:', error);
  }
};

export const getCommuteRoutes = (): any[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem('commuteRoutes');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('출근 경로 불러오기 오류:', error);
    return [];
  }
};

export const removeCommuteRoute = async (routeId: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const routes = getCommuteRoutes();
    const filtered = routes.filter((route: any) => route.id !== routeId);
    localStorage.setItem('commuteRoutes', JSON.stringify(filtered));
  } catch (error) {
    console.error('출근 경로 삭제 오류:', error);
  }
};

// 사용자 역 이용 이력 저장
export interface StationUsageHistory {
  stationName: string;
  lineNum: string;
  direction: 'up' | 'down';
  timestamp: number;
  dayOfWeek: number; // 0: 일요일, 1: 월요일, ..., 6: 토요일
  hour: number; // 0-23
  selectedCar?: number; // 선택한 칸 번호
  congestionLevel?: string; // 혼잡도 레벨
}

export const saveStationUsage = async (usage: StationUsageHistory) => {
  if (typeof window === 'undefined') return;
  
  try {
    const history = getStationUsageHistory();
    history.push(usage);
    // 최근 1000개만 유지
    const recent = history.slice(-1000);
    localStorage.setItem('stationUsageHistory', JSON.stringify(recent));
  } catch (error) {
    console.error('이용 이력 저장 오류:', error);
  }
};

export const getStationUsageHistory = (): StationUsageHistory[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem('stationUsageHistory');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('이용 이력 불러오기 오류:', error);
    return [];
  }
};

// 특정 역의 이용 이력 조회
export const getStationUsageByStation = (stationName: string, lineNum: string): StationUsageHistory[] => {
  const history = getStationUsageHistory();
  return history.filter(
    (usage) => usage.stationName === stationName && usage.lineNum === lineNum
  );
};

