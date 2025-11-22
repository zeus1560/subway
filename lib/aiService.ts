export const generateCongestionTips = (stationData: any, timeData: any) => {
  const tips: any[] = [];
  const currentHour = new Date().getHours();

  if (currentHour >= 7 && currentHour <= 9) {
    tips.push({
      title: '출근 시간대 혼잡 완화 팁',
      content: '출근 시간대에는 10분만 일찍 출발하시면 혼잡도를 크게 줄일 수 있습니다. 특히 8시~9시 사이가 가장 혼잡합니다.',
      icon: 'time-outline',
      priority: 'high',
    });
  }

  if (currentHour >= 18 && currentHour <= 20) {
    tips.push({
      title: '퇴근 시간대 혼잡 완화 팁',
      content: '퇴근 시간대에는 30분 늦게 출발하거나, 한 정거장 전에서 타는 것을 고려해보세요.',
      icon: 'moon-outline',
      priority: 'high',
    });
  }

  tips.push({
    title: '환승 역 피하기',
    content: '환승이 많은 역은 항상 혼잡합니다. 가능하면 직통 열차를 이용하거나 덜 붐비는 환승 루트를 선택하세요.',
    icon: 'swap-horizontal-outline',
    priority: 'low',
  });

  tips.push({
    title: '첫/끝 칸 이용하기',
    content: '첫 칸과 끝 칸은 상대적으로 덜 혼잡합니다. 특히 출퇴근 시간대에 유용합니다.',
    icon: 'train-outline',
    priority: 'low',
  });

  return tips;
};

export const generateTouristRoutes = (destination: string, preferences: any = {}) => {
  const routes: any[] = [];

  const touristSpots: Record<string, any> = {
    명동: { line: '4', station: '명동', transfer: [] },
    동대문: { line: '1', station: '동대문', transfer: [] },
    홍대: { line: '2', station: '홍대입구', transfer: [] },
    강남: { line: '2', station: '강남', transfer: [] },
    이태원: { line: '6', station: '이태원', transfer: [] },
  };

  if (touristSpots[destination]) {
    routes.push({
      title: `${destination} 추천 루트`,
      description: `혼잡도가 낮은 시간대를 선택한 최적 경로입니다.`,
      stations: touristSpots[destination],
      estimatedTime: 30,
      congestionLevel: '보통',
      tips: '평일 오전 10시~11시, 오후 2시~4시가 가장 덜 혼잡합니다.',
    });
  }

  return routes;
};

