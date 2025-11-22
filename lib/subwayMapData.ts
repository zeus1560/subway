// 서울 지하철 노선도 스키마틱 좌표 데이터

export type LineId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export interface Station {
  id: string;             // 고유 ID
  name: string;           // 역명
  lines: LineId[];        // 포함 노선
  layoutX: number;        // 스키마틱용 X (0~4000)
  layoutY: number;        // 스키마틱용 Y (0~1400)
  isTransfer: boolean;    // 환승 여부
}

export type LineBranch = {
  id: string;
  name: string;
  stationIds: string[];
};

export interface Line {
  id: LineId;
  name: string;
  color: string;
  stationIds: string[];   // 운행 순서대로 정렬된 station id 리스트
  branches?: LineBranch[]; // 지선 정보 (선택적)
}

// 서울 지하철 노선 색상
export const LINE_COLORS: Record<LineId, string> = {
  "1": "#0052A4",  // 파란색
  "2": "#00A84D",  // 초록색
  "3": "#EF7C1C",  // 주황색
  "4": "#00A5DE",  // 하늘색
  "5": "#996CAC",  // 보라색
  "6": "#CD7C2F",  // 갈색
  "7": "#747F00",  // 올리브색
  "8": "#E6186C",  // 분홍색
  "9": "#BDB092",  // 베이지색
};

// 스키마틱 좌표 기반 역 데이터 (간격을 더 넓혀서 글씨 겹침 완전히 방지)
export const STATIONS: Station[] = [
    // 1호선
  // 경원선 (연천 → 소요산) - Y 좌표를 위로 배치
  { id: "0980", name: "연천", lines: ["1"], layoutX: -500, layoutY: 80, isTransfer: false },
  { id: "0981", name: "전곡", lines: ["1"], layoutX: -430, layoutY: 80, isTransfer: false },
  { id: "0982", name: "청산", lines: ["1"], layoutX: -360, layoutY: 80, isTransfer: false },
  { id: "1001", name: "소요산", lines: ["1"], layoutX: -290, layoutY: 80, isTransfer: false },
  { id: "1002", name: "동두천", lines: ["1"], layoutX: -220, layoutY: 80, isTransfer: false },
  { id: "0983", name: "보산", lines: ["1"], layoutX: -150, layoutY: 80, isTransfer: false },
  { id: "0984", name: "동두천중앙", lines: ["1"], layoutX: -80, layoutY: 80, isTransfer: false },
  { id: "1000", name: "지행", lines: ["1"], layoutX: -10, layoutY: 80, isTransfer: false },
  { id: "0999", name: "덕정", lines: ["1"], layoutX: 60, layoutY: 80, isTransfer: false },
  { id: "0985", name: "덕계", lines: ["1"], layoutX: 130, layoutY: 80, isTransfer: false },
  { id: "0986", name: "양주", lines: ["1"], layoutX: 200, layoutY: 80, isTransfer: false },
  { id: "0987", name: "녹양", lines: ["1"], layoutX: 270, layoutY: 80, isTransfer: false },
  { id: "0988", name: "가능", lines: ["1"], layoutX: 340, layoutY: 80, isTransfer: false },
  { id: "1003", name: "의정부", lines: ["1"], layoutX: 410, layoutY: 80, isTransfer: false },
  { id: "1004", name: "회룡", lines: ["1"], layoutX: 480, layoutY: 80, isTransfer: false },
  { id: "1091", name: "망월사", lines: ["1"], layoutX: 520, layoutY: 115, isTransfer: false },
  // 경원선은 회룡에서 본선으로 합류 (의정부 → 회룡 → 망월사 → 도봉산으로 이어짐)
  { id: "1005", name: "도봉산", lines: ["1", "7"], layoutX: 560, layoutY: 150, isTransfer: true },
  { id: "1092", name: "방학", lines: ["1"], layoutX: 610, layoutY: 150, isTransfer: false },
  { id: "1006", name: "창동", lines: ["1", "4"], layoutX: 660, layoutY: 150, isTransfer: true },
  { id: "1007", name: "녹천", lines: ["1"], layoutX: 710, layoutY: 150, isTransfer: false },
  { id: "1008", name: "월계", lines: ["1"], layoutX: 760, layoutY: 150, isTransfer: false },
  { id: "1009", name: "광운대", lines: ["1"], layoutX: 830, layoutY: 150, isTransfer: false },
  { id: "1010", name: "석계", lines: ["1", "6"], layoutX: 900, layoutY: 150, isTransfer: true },
  { id: "1011", name: "신이문", lines: ["1"], layoutX: 970, layoutY: 150, isTransfer: false },
  { id: "1012", name: "외대앞", lines: ["1"], layoutX: 1040, layoutY: 150, isTransfer: false },
  { id: "1013", name: "회기", lines: ["1"], layoutX: 1110, layoutY: 150, isTransfer: false },
  { id: "1014", name: "청량리", lines: ["1"], layoutX: 1180, layoutY: 150, isTransfer: false },
  { id: "1015", name: "제기동", lines: ["1"], layoutX: 1250, layoutY: 150, isTransfer: false },
  { id: "1016", name: "신설동", lines: ["1", "2"], layoutX: 1320, layoutY: 150, isTransfer: true },
  { id: "1017", name: "동묘앞", lines: ["1", "6"], layoutX: 1390, layoutY: 150, isTransfer: true },
  { id: "1018", name: "동대문", lines: ["1", "4"], layoutX: 1460, layoutY: 150, isTransfer: true },
  { id: "1019", name: "종로5가", lines: ["1"], layoutX: 1530, layoutY: 150, isTransfer: false },
  { id: "1020", name: "종로3가", lines: ["1", "3", "5"], layoutX: 1600, layoutY: 150, isTransfer: true },
  { id: "1021", name: "종각", lines: ["1"], layoutX: 1670, layoutY: 150, isTransfer: false },
  { id: "1022", name: "시청", lines: ["1", "2"], layoutX: 1740, layoutY: 150, isTransfer: true },
  { id: "1023", name: "서울역", lines: ["1", "4"], layoutX: 1810, layoutY: 150, isTransfer: true },
  { id: "1024", name: "남영", lines: ["1"], layoutX: 1880, layoutY: 150, isTransfer: false },
  { id: "1025", name: "용산", lines: ["1"], layoutX: 1950, layoutY: 150, isTransfer: false },
  { id: "1026", name: "노량진", lines: ["1", "9"], layoutX: 2020, layoutY: 150, isTransfer: true },
  { id: "1027", name: "대방", lines: ["1"], layoutX: 2090, layoutY: 150, isTransfer: false },
  { id: "1028", name: "신길", lines: ["1", "5"], layoutX: 2160, layoutY: 150, isTransfer: true },
  { id: "1029", name: "영등포", lines: ["1"], layoutX: 2230, layoutY: 150, isTransfer: false },
  { id: "1030", name: "신도림", lines: ["1", "2"], layoutX: 2300, layoutY: 150, isTransfer: true },
  { id: "1031", name: "구로", lines: ["1"], layoutX: 2370, layoutY: 150, isTransfer: false },
  // 경인선 (구로 서쪽, 인천 방면) - 구로(2370)에서 서쪽으로 가는 방면, Y 좌표를 위로 배치
  // 순서: 구로 → 구일 → 개봉 → 오류동 → 온수 → 역곡 → 소사 → 부천 → 중동 → 송내 → 부개 → 부평 → 백운 → 동암 → ...
  // 구일은 구로와 같은 Y 좌표로 배치하여 대각선 연결 제거 (신도림과 겹치지 않도록 X 조정)
  { id: "1072", name: "구일", lines: ["1"], layoutX: 2290, layoutY: 150, isTransfer: false },
  { id: "1071", name: "개봉", lines: ["1"], layoutX: 2230, layoutY: 80, isTransfer: false },
  { id: "1070", name: "오류동", lines: ["1"], layoutX: 2170, layoutY: 80, isTransfer: false },
  { id: "1086", name: "온수", lines: ["1", "7"], layoutX: 2100, layoutY: 80, isTransfer: true },
  { id: "1087", name: "역곡", lines: ["1"], layoutX: 2030, layoutY: 80, isTransfer: false },
  { id: "1088", name: "소사", lines: ["1"], layoutX: 1960, layoutY: 80, isTransfer: false },
  { id: "1073", name: "부천", lines: ["1"], layoutX: 1890, layoutY: 80, isTransfer: false },
  { id: "1075", name: "중동", lines: ["1"], layoutX: 1820, layoutY: 80, isTransfer: false },
  { id: "1074", name: "송내", lines: ["1"], layoutX: 1750, layoutY: 80, isTransfer: false },
  { id: "1076", name: "부개", lines: ["1"], layoutX: 1680, layoutY: 80, isTransfer: false },
  { id: "1077", name: "부평", lines: ["1"], layoutX: 1610, layoutY: 80, isTransfer: false },
  { id: "1089", name: "백운", lines: ["1"], layoutX: 1540, layoutY: 80, isTransfer: false },
  { id: "1078", name: "동암", lines: ["1"], layoutX: 1470, layoutY: 80, isTransfer: false },
  { id: "1079", name: "간석", lines: ["1"], layoutX: 1400, layoutY: 80, isTransfer: false },
  { id: "1080", name: "주안", lines: ["1"], layoutX: 1330, layoutY: 80, isTransfer: false },
  { id: "1081", name: "도화", lines: ["1"], layoutX: 1260, layoutY: 80, isTransfer: false },
  { id: "1082", name: "제물포", lines: ["1"], layoutX: 1190, layoutY: 80, isTransfer: false },
  { id: "1083", name: "도원", lines: ["1"], layoutX: 1120, layoutY: 80, isTransfer: false },
  { id: "1084", name: "동인천", lines: ["1"], layoutX: 1050, layoutY: 80, isTransfer: false },
  { id: "1085", name: "인천", lines: ["1"], layoutX: 980, layoutY: 80, isTransfer: false },
  // 경부선 (구로 동쪽, 수원/천안 방면) - Y 좌표를 아래로 배치하여 경인선과 구분
  { id: "1032", name: "가산디지털단지", lines: ["1", "7"], layoutX: 2440, layoutY: 220, isTransfer: true },
  { id: "1033", name: "독산", lines: ["1"], layoutX: 2520, layoutY: 220, isTransfer: false },
  { id: "1034", name: "금천구청", lines: ["1"], layoutX: 2580, layoutY: 220, isTransfer: false },
  { id: "1035", name: "석수", lines: ["1"], layoutX: 2650, layoutY: 220, isTransfer: false },
  { id: "1036", name: "관악", lines: ["1"], layoutX: 2720, layoutY: 220, isTransfer: false },
  { id: "1037", name: "안양", lines: ["1"], layoutX: 2790, layoutY: 220, isTransfer: false },
  { id: "1038", name: "명학", lines: ["1"], layoutX: 2860, layoutY: 220, isTransfer: false },
  { id: "1039", name: "금정", lines: ["1", "4"], layoutX: 2930, layoutY: 220, isTransfer: true },
  { id: "1040", name: "군포", lines: ["1"], layoutX: 3000, layoutY: 220, isTransfer: false },
  { id: "1041", name: "당정", lines: ["1"], layoutX: 3070, layoutY: 220, isTransfer: false },
  { id: "1042", name: "의왕", lines: ["1"], layoutX: 3140, layoutY: 220, isTransfer: false },
  { id: "1043", name: "성균관대", lines: ["1"], layoutX: 3210, layoutY: 220, isTransfer: false },
  { id: "1044", name: "화서", lines: ["1"], layoutX: 3280, layoutY: 220, isTransfer: false },
  { id: "1045", name: "수원", lines: ["1"], layoutX: 3350, layoutY: 220, isTransfer: false },
  { id: "1046", name: "세류", lines: ["1"], layoutX: 3420, layoutY: 220, isTransfer: false },
  { id: "1047", name: "병점", lines: ["1"], layoutX: 3490, layoutY: 220, isTransfer: false },
  { id: "1048", name: "서동탄", lines: ["1"], layoutX: 3560, layoutY: 220, isTransfer: false },
  { id: "1049", name: "세마", lines: ["1"], layoutX: 3630, layoutY: 220, isTransfer: false },
  { id: "1050", name: "오산대", lines: ["1"], layoutX: 3700, layoutY: 220, isTransfer: false },
  { id: "1051", name: "오산", lines: ["1"], layoutX: 3770, layoutY: 220, isTransfer: false },
  { id: "1052", name: "진위", lines: ["1"], layoutX: 3840, layoutY: 220, isTransfer: false },
  { id: "1053", name: "송탄", lines: ["1"], layoutX: 3910, layoutY: 220, isTransfer: false },
  { id: "1054", name: "서정리", lines: ["1"], layoutX: 3980, layoutY: 220, isTransfer: false },
  { id: "1090", name: "지제", lines: ["1"], layoutX: 4050, layoutY: 220, isTransfer: false },
  { id: "1056", name: "평택", lines: ["1"], layoutX: 4120, layoutY: 220, isTransfer: false },
  { id: "1057", name: "성환", lines: ["1"], layoutX: 4190, layoutY: 220, isTransfer: false },
  { id: "1058", name: "직산", lines: ["1"], layoutX: 4260, layoutY: 220, isTransfer: false },
  { id: "1059", name: "두정", lines: ["1"], layoutX: 4330, layoutY: 220, isTransfer: false },
  { id: "1060", name: "천안", lines: ["1"], layoutX: 4400, layoutY: 220, isTransfer: false },
  { id: "1061", name: "봉명", lines: ["1"], layoutX: 4470, layoutY: 220, isTransfer: false },
  { id: "1062", name: "쌍용", lines: ["1"], layoutX: 4540, layoutY: 220, isTransfer: false },
  { id: "1063", name: "아산", lines: ["1"], layoutX: 4610, layoutY: 220, isTransfer: false },
  { id: "1064", name: "탕정", lines: ["1"], layoutX: 4680, layoutY: 220, isTransfer: false },
  { id: "1065", name: "배방", lines: ["1"], layoutX: 4750, layoutY: 220, isTransfer: false },
  { id: "1066", name: "온양온천", lines: ["1"], layoutX: 4820, layoutY: 220, isTransfer: false },
  { id: "1067", name: "신창", lines: ["1"], layoutX: 4890, layoutY: 220, isTransfer: false },
  // 2호선 순환선
  { id: "2001", name: "을지로입구", lines: ["2"], layoutX: 350, layoutY: 75, isTransfer: false },
  { id: "2002", name: "을지로3가", lines: ["2", "3"], layoutX: 440, layoutY: 75, isTransfer: true },
  { id: "2003", name: "을지로4가", lines: ["2", "5"], layoutX: 530, layoutY: 75, isTransfer: true },
  { id: "2004", name: "동대문역사문화공원", lines: ["2", "4", "5"], layoutX: 620, layoutY: 75, isTransfer: true },
  { id: "2005", name: "신당", lines: ["2", "6"], layoutX: 710, layoutY: 75, isTransfer: true },
  { id: "2006", name: "상왕십리", lines: ["2"], layoutX: 800, layoutY: 75, isTransfer: false },
  { id: "2007", name: "왕십리", lines: ["2", "5"], layoutX: 890, layoutY: 75, isTransfer: true },
  { id: "2008", name: "한양대", lines: ["2"], layoutX: 980, layoutY: 75, isTransfer: false },
  { id: "2009", name: "뚝섬", lines: ["2"], layoutX: 1070, layoutY: 75, isTransfer: false },
  { id: "2010", name: "성수", lines: ["2"], layoutX: 1160, layoutY: 75, isTransfer: false },
  { id: "2011", name: "건대입구", lines: ["2", "7"], layoutX: 1250, layoutY: 75, isTransfer: true },
  { id: "2012", name: "구의", lines: ["2"], layoutX: 1340, layoutY: 75, isTransfer: false },
  { id: "2013", name: "강변", lines: ["2"], layoutX: 1430, layoutY: 75, isTransfer: false },
  { id: "2014", name: "잠실나루", lines: ["2"], layoutX: 1520, layoutY: 75, isTransfer: false },
  { id: "2015", name: "잠실", lines: ["2", "8"], layoutX: 1610, layoutY: 75, isTransfer: true },
  { id: "2016", name: "잠실새내", lines: ["2"], layoutX: 1700, layoutY: 75, isTransfer: false },
  { id: "2017", name: "종합운동장", lines: ["2", "9"], layoutX: 1790, layoutY: 75, isTransfer: true },
  { id: "2018", name: "삼성", lines: ["2"], layoutX: 1790, layoutY: 140, isTransfer: false },
  { id: "2019", name: "선릉", lines: ["2"], layoutX: 1790, layoutY: 205, isTransfer: false },
  { id: "2020", name: "역삼", lines: ["2"], layoutX: 1790, layoutY: 270, isTransfer: false },
  { id: "2021", name: "강남", lines: ["2"], layoutX: 1790, layoutY: 335, isTransfer: false },
  { id: "2022", name: "교대", lines: ["2", "3"], layoutX: 1790, layoutY: 400, isTransfer: true },
  { id: "2023", name: "서초", lines: ["2"], layoutX: 1790, layoutY: 465, isTransfer: false },
  { id: "2024", name: "방배", lines: ["2"], layoutX: 1790, layoutY: 530, isTransfer: false },
  { id: "2025", name: "사당", lines: ["2", "4"], layoutX: 1790, layoutY: 595, isTransfer: true },
  { id: "2026", name: "낙성대", lines: ["2"], layoutX: 1790, layoutY: 660, isTransfer: false },
  { id: "2027", name: "서울대입구", lines: ["2"], layoutX: 1790, layoutY: 725, isTransfer: false },
  { id: "2028", name: "봉천", lines: ["2"], layoutX: 1700, layoutY: 725, isTransfer: false },
  { id: "2029", name: "신림", lines: ["2"], layoutX: 1610, layoutY: 725, isTransfer: false },
  { id: "2030", name: "신대방", lines: ["2"], layoutX: 1520, layoutY: 725, isTransfer: false },
  { id: "2031", name: "구로디지털단지", lines: ["2"], layoutX: 1430, layoutY: 725, isTransfer: false },
  { id: "2032", name: "대림", lines: ["2", "7"], layoutX: 1340, layoutY: 725, isTransfer: true },
  { id: "2033", name: "신도림", lines: ["2", "1"], layoutX: 1250, layoutY: 725, isTransfer: true },
  // 신정지선
  { id: "2062", name: "도림천", lines: ["2"], layoutX: 1250, layoutY: 800, isTransfer: false },
  { id: "2063", name: "양천구청", lines: ["2"], layoutX: 1250, layoutY: 875, isTransfer: false },
  { id: "2064", name: "신정네거리", lines: ["2"], layoutX: 1250, layoutY: 950, isTransfer: false },
  { id: "2034", name: "문래", lines: ["2"], layoutX: 1160, layoutY: 725, isTransfer: false },
  { id: "2035", name: "영등포구청", lines: ["2", "5"], layoutX: 1070, layoutY: 725, isTransfer: true },
  { id: "2036", name: "당산", lines: ["2", "9"], layoutX: 980, layoutY: 725, isTransfer: true },
  { id: "2037", name: "합정", lines: ["2", "6"], layoutX: 890, layoutY: 725, isTransfer: true },
  { id: "2038", name: "홍대입구", lines: ["2", "6"], layoutX: 710, layoutY: 725, isTransfer: true },
  { id: "2039", name: "신촌", lines: ["2"], layoutX: 620, layoutY: 725, isTransfer: false },
  { id: "2040", name: "이대", lines: ["2"], layoutX: 530, layoutY: 725, isTransfer: false },
  { id: "2041", name: "아현", lines: ["2"], layoutX: 440, layoutY: 725, isTransfer: false },
  { id: "2042", name: "충정로", lines: ["2", "5"], layoutX: 350, layoutY: 650, isTransfer: true },
  { id: "2043", name: "시청", lines: ["2", "1"], layoutX: 350, layoutY: 140, isTransfer: true },
  // 성수지선
  { id: "2050", name: "용답", lines: ["2"], layoutX: 1160, layoutY: 10, isTransfer: false },
  { id: "2051", name: "신답", lines: ["2"], layoutX: 1160, layoutY: -55, isTransfer: false },
  { id: "2052", name: "용두", lines: ["2"], layoutX: 1160, layoutY: -120, isTransfer: false },
  { id: "2053", name: "신설동", lines: ["2", "1"], layoutX: 1160, layoutY: -185, isTransfer: true },
  // 신정지선 (신도림에서 분기)
  { id: "2061", name: "까치산", lines: ["2", "5"], layoutX: 1250, layoutY: 1025, isTransfer: true },
  // 3호선
  { id: "3001", name: "대화", lines: ["3"], layoutX: 150, layoutY: 300, isTransfer: false },
  { id: "3002", name: "주엽", lines: ["3"], layoutX: 220, layoutY: 300, isTransfer: false },
  { id: "3003", name: "정발산", lines: ["3"], layoutX: 290, layoutY: 300, isTransfer: false },
  { id: "3004", name: "마두", lines: ["3"], layoutX: 360, layoutY: 300, isTransfer: false },
  { id: "3005", name: "백석", lines: ["3"], layoutX: 430, layoutY: 300, isTransfer: false },
  { id: "3006", name: "대곡", lines: ["3"], layoutX: 500, layoutY: 300, isTransfer: false },
  { id: "3007", name: "화정", lines: ["3"], layoutX: 570, layoutY: 300, isTransfer: false },
  { id: "3008", name: "원당", lines: ["3"], layoutX: 640, layoutY: 300, isTransfer: false },
  { id: "3009", name: "원흥", lines: ["3"], layoutX: 710, layoutY: 300, isTransfer: false },
  { id: "3010", name: "삼송", lines: ["3"], layoutX: 780, layoutY: 300, isTransfer: false },
  { id: "3011", name: "지축", lines: ["3"], layoutX: 850, layoutY: 300, isTransfer: false },
  { id: "3012", name: "구파발", lines: ["3"], layoutX: 920, layoutY: 300, isTransfer: false },
  { id: "3013", name: "연신내", lines: ["3", "6"], layoutX: 990, layoutY: 300, isTransfer: true },
  { id: "3014", name: "불광", lines: ["3", "6"], layoutX: 1060, layoutY: 300, isTransfer: true },
  { id: "3015", name: "홍제", lines: ["3"], layoutX: 1130, layoutY: 300, isTransfer: false },
  { id: "3016", name: "무악재", lines: ["3"], layoutX: 1200, layoutY: 300, isTransfer: false },
  { id: "3017", name: "독립문", lines: ["3"], layoutX: 1270, layoutY: 300, isTransfer: false },
  { id: "3018", name: "경복궁", lines: ["3"], layoutX: 1340, layoutY: 300, isTransfer: false },
  { id: "3019", name: "안국", lines: ["3"], layoutX: 1410, layoutY: 300, isTransfer: false },
  { id: "3020", name: "종로3가", lines: ["3", "1", "5"], layoutX: 1480, layoutY: 300, isTransfer: true },
  { id: "3021", name: "을지로3가", lines: ["3", "2"], layoutX: 1550, layoutY: 300, isTransfer: true },
  { id: "3022", name: "충무로", lines: ["3", "4"], layoutX: 1620, layoutY: 300, isTransfer: true },
  { id: "3023", name: "동대입구", lines: ["3"], layoutX: 1690, layoutY: 300, isTransfer: false },
  { id: "3024", name: "약수", lines: ["3", "6"], layoutX: 1760, layoutY: 300, isTransfer: true },
  { id: "3025", name: "금호", lines: ["3"], layoutX: 1830, layoutY: 300, isTransfer: false },
  { id: "3026", name: "옥수", lines: ["3", "2"], layoutX: 1900, layoutY: 300, isTransfer: true },
  { id: "3027", name: "압구정", lines: ["3"], layoutX: 1970, layoutY: 300, isTransfer: false },
  { id: "3028", name: "신사", lines: ["3", "2"], layoutX: 2040, layoutY: 300, isTransfer: true },
  { id: "3029", name: "고속터미널", lines: ["3", "7", "9"], layoutX: 2110, layoutY: 300, isTransfer: true },
  { id: "3030", name: "교대", lines: ["3", "2"], layoutX: 2180, layoutY: 300, isTransfer: true },
  { id: "3031", name: "남부터미널", lines: ["3"], layoutX: 2250, layoutY: 300, isTransfer: false },
  { id: "3032", name: "양재", lines: ["3"], layoutX: 2320, layoutY: 300, isTransfer: false },
  { id: "3033", name: "매봉", lines: ["3"], layoutX: 2390, layoutY: 300, isTransfer: false },
  { id: "3034", name: "도곡", lines: ["3"], layoutX: 2460, layoutY: 300, isTransfer: false },
  { id: "3035", name: "대치", lines: ["3"], layoutX: 2530, layoutY: 300, isTransfer: false },
  { id: "3036", name: "학여울", lines: ["3"], layoutX: 2600, layoutY: 300, isTransfer: false },
  { id: "3037", name: "대청", lines: ["3"], layoutX: 2670, layoutY: 300, isTransfer: false },
  { id: "3038", name: "일원", lines: ["3"], layoutX: 2740, layoutY: 300, isTransfer: false },
  { id: "3039", name: "수서", lines: ["3"], layoutX: 2810, layoutY: 300, isTransfer: false },
  { id: "3040", name: "가락시장", lines: ["3", "8"], layoutX: 2880, layoutY: 300, isTransfer: true },
  { id: "3041", name: "경찰병원", lines: ["3"], layoutX: 2950, layoutY: 300, isTransfer: false },
  { id: "3042", name: "오금", lines: ["3", "5"], layoutX: 3020, layoutY: 300, isTransfer: true },
  // 4호선
  { id: "4001", name: "진접", lines: ["4"], layoutX: 10, layoutY: 350, isTransfer: false },
  { id: "4002", name: "오남", lines: ["4"], layoutX: 80, layoutY: 350, isTransfer: false },
  { id: "4003", name: "별내별가람", lines: ["4"], layoutX: 150, layoutY: 350, isTransfer: false },
  { id: "4004", name: "불암산", lines: ["4"], layoutX: 220, layoutY: 400, isTransfer: false },
  { id: "4005", name: "상계", lines: ["4"], layoutX: 220, layoutY: 450, isTransfer: false },
  { id: "4006", name: "노원", lines: ["4", "7"], layoutX: 290, layoutY: 450, isTransfer: true },
  { id: "4007", name: "창동", lines: ["4", "1"], layoutX: 360, layoutY: 450, isTransfer: true },
  { id: "4008", name: "쌍문", lines: ["4"], layoutX: 430, layoutY: 450, isTransfer: false },
  { id: "4009", name: "수유", lines: ["4"], layoutX: 500, layoutY: 450, isTransfer: false },
  { id: "4010", name: "미아", lines: ["4"], layoutX: 570, layoutY: 450, isTransfer: false },
  { id: "4011", name: "미아사거리", lines: ["4"], layoutX: 640, layoutY: 450, isTransfer: false },
  { id: "4012", name: "길음", lines: ["4"], layoutX: 710, layoutY: 450, isTransfer: false },
  { id: "4013", name: "성신여대입구", lines: ["4"], layoutX: 780, layoutY: 450, isTransfer: false },
  { id: "4014", name: "한성대입구", lines: ["4"], layoutX: 850, layoutY: 450, isTransfer: false },
  { id: "4015", name: "혜화", lines: ["4"], layoutX: 920, layoutY: 450, isTransfer: false },
  { id: "4016", name: "동대문", lines: ["4", "1"], layoutX: 990, layoutY: 450, isTransfer: true },
  { id: "4017", name: "동대문역사문화공원", lines: ["4", "2", "5"], layoutX: 1060, layoutY: 450, isTransfer: true },
  { id: "4018", name: "충무로", lines: ["4", "3"], layoutX: 1130, layoutY: 450, isTransfer: true },
  { id: "4019", name: "명동", lines: ["4"], layoutX: 1200, layoutY: 450, isTransfer: false },
  { id: "4020", name: "회현", lines: ["4"], layoutX: 1270, layoutY: 450, isTransfer: false },
  { id: "4021", name: "서울역", lines: ["4", "1"], layoutX: 1340, layoutY: 450, isTransfer: true },
  { id: "4022", name: "숙대입구", lines: ["4"], layoutX: 1410, layoutY: 450, isTransfer: false },
  { id: "4023", name: "삼각지", lines: ["4", "6"], layoutX: 1480, layoutY: 450, isTransfer: true },
  { id: "4024", name: "신용산", lines: ["4"], layoutX: 1550, layoutY: 450, isTransfer: false },
  { id: "4025", name: "이촌", lines: ["4"], layoutX: 1620, layoutY: 450, isTransfer: false },
  { id: "4026", name: "동작", lines: ["4", "9"], layoutX: 1690, layoutY: 450, isTransfer: true },
  { id: "4027", name: "총신대입구", lines: ["4"], layoutX: 1760, layoutY: 450, isTransfer: false },
  { id: "4028", name: "사당", lines: ["4", "2"], layoutX: 1830, layoutY: 450, isTransfer: true },
  { id: "4029", name: "남태령", lines: ["4"], layoutX: 1900, layoutY: 450, isTransfer: false },
  { id: "4030", name: "선바위", lines: ["4"], layoutX: 1970, layoutY: 450, isTransfer: false },
  { id: "4031", name: "경마공원", lines: ["4"], layoutX: 2040, layoutY: 450, isTransfer: false },
  { id: "4032", name: "대공원", lines: ["4"], layoutX: 2110, layoutY: 450, isTransfer: false },
  { id: "4033", name: "과천", lines: ["4"], layoutX: 2180, layoutY: 450, isTransfer: false },
  { id: "4034", name: "정부과천청사", lines: ["4"], layoutX: 2250, layoutY: 450, isTransfer: false },
  { id: "4035", name: "인덕원", lines: ["4"], layoutX: 2320, layoutY: 450, isTransfer: false },
  { id: "4036", name: "평촌", lines: ["4"], layoutX: 2390, layoutY: 450, isTransfer: false },
  { id: "4037", name: "범계", lines: ["4"], layoutX: 2460, layoutY: 450, isTransfer: false },
  { id: "4038", name: "금정", lines: ["4", "1"], layoutX: 2530, layoutY: 450, isTransfer: true },
  { id: "4039", name: "산본", lines: ["4"], layoutX: 2600, layoutY: 450, isTransfer: false },
  { id: "4040", name: "수리산", lines: ["4"], layoutX: 2670, layoutY: 450, isTransfer: false },
  { id: "4041", name: "대야미", lines: ["4"], layoutX: 2740, layoutY: 450, isTransfer: false },
  { id: "4042", name: "반월", lines: ["4"], layoutX: 2810, layoutY: 450, isTransfer: false },
  { id: "4043", name: "상록수", lines: ["4"], layoutX: 2880, layoutY: 450, isTransfer: false },
  { id: "4044", name: "한대앞", lines: ["4"], layoutX: 2950, layoutY: 450, isTransfer: false },
  { id: "4045", name: "중앙", lines: ["4"], layoutX: 3020, layoutY: 450, isTransfer: false },
  { id: "4046", name: "고잔", lines: ["4"], layoutX: 3090, layoutY: 450, isTransfer: false },
  { id: "4047", name: "초지", lines: ["4"], layoutX: 3160, layoutY: 450, isTransfer: false },
  { id: "4048", name: "안산", lines: ["4"], layoutX: 3230, layoutY: 450, isTransfer: false },
  { id: "4049", name: "신길온천", lines: ["4"], layoutX: 3300, layoutY: 450, isTransfer: false },
  { id: "4050", name: "정왕", lines: ["4"], layoutX: 3370, layoutY: 450, isTransfer: false },
  { id: "4051", name: "오이도", lines: ["4"], layoutX: 3440, layoutY: 450, isTransfer: false },
  // 5호선
  { id: "5001", name: "방화", lines: ["5"], layoutX: 150, layoutY: 600, isTransfer: false },
  { id: "5002", name: "개화산", lines: ["5"], layoutX: 220, layoutY: 600, isTransfer: false },
  { id: "5003", name: "김포공항", lines: ["5", "9"], layoutX: 290, layoutY: 600, isTransfer: true },
  { id: "5004", name: "송정", lines: ["5"], layoutX: 360, layoutY: 600, isTransfer: false },
  { id: "5005", name: "마곡", lines: ["5"], layoutX: 430, layoutY: 600, isTransfer: false },
  { id: "5006", name: "발산", lines: ["5"], layoutX: 500, layoutY: 600, isTransfer: false },
  { id: "5007", name: "우장산", lines: ["5"], layoutX: 570, layoutY: 600, isTransfer: false },
  { id: "5008", name: "화곡", lines: ["5"], layoutX: 640, layoutY: 600, isTransfer: false },
  { id: "5009", name: "까치산", lines: ["5", "2"], layoutX: 710, layoutY: 600, isTransfer: true },
  { id: "5010", name: "신정", lines: ["5"], layoutX: 780, layoutY: 600, isTransfer: false },
  { id: "5011", name: "목동", lines: ["5"], layoutX: 850, layoutY: 600, isTransfer: false },
  { id: "5012", name: "오목교", lines: ["5"], layoutX: 920, layoutY: 600, isTransfer: false },
  { id: "5013", name: "양평", lines: ["5", "2"], layoutX: 990, layoutY: 600, isTransfer: true },
  { id: "5014", name: "영등포구청", lines: ["5", "2"], layoutX: 1060, layoutY: 600, isTransfer: true },
  { id: "5015", name: "영등포시장", lines: ["5"], layoutX: 1130, layoutY: 600, isTransfer: false },
  { id: "5016", name: "신길", lines: ["5", "1"], layoutX: 1200, layoutY: 600, isTransfer: true },
  { id: "5017", name: "여의도", lines: ["5", "9"], layoutX: 1270, layoutY: 600, isTransfer: true },
  { id: "5018", name: "여의나루", lines: ["5"], layoutX: 1340, layoutY: 600, isTransfer: false },
  { id: "5019", name: "마포", lines: ["5"], layoutX: 1410, layoutY: 600, isTransfer: false },
  { id: "5020", name: "공덕", lines: ["5", "6"], layoutX: 1480, layoutY: 600, isTransfer: true },
  { id: "5021", name: "애오개", lines: ["5"], layoutX: 1550, layoutY: 600, isTransfer: false },
  { id: "5022", name: "충정로", lines: ["5", "2"], layoutX: 1620, layoutY: 600, isTransfer: true },
  { id: "5023", name: "서대문", lines: ["5"], layoutX: 1690, layoutY: 600, isTransfer: false },
  { id: "5024", name: "광화문", lines: ["5"], layoutX: 1760, layoutY: 600, isTransfer: false },
  { id: "5025", name: "종로3가", lines: ["5", "1", "3"], layoutX: 1830, layoutY: 600, isTransfer: true },
  { id: "5026", name: "을지로4가", lines: ["5", "2"], layoutX: 1900, layoutY: 600, isTransfer: true },
  { id: "5027", name: "동대문역사문화공원", lines: ["5", "2", "4"], layoutX: 1970, layoutY: 600, isTransfer: true },
  { id: "5028", name: "청구", lines: ["5", "6"], layoutX: 2040, layoutY: 600, isTransfer: true },
  { id: "5029", name: "신금", lines: ["5"], layoutX: 2110, layoutY: 600, isTransfer: false },
  { id: "5030", name: "행당", lines: ["5"], layoutX: 2180, layoutY: 600, isTransfer: false },
  { id: "5031", name: "왕십리", lines: ["5", "2"], layoutX: 2250, layoutY: 600, isTransfer: true },
  { id: "5032", name: "마장", lines: ["5"], layoutX: 2320, layoutY: 600, isTransfer: false },
  { id: "5033", name: "답십리", lines: ["5"], layoutX: 2390, layoutY: 600, isTransfer: false },
  { id: "5034", name: "장한평", lines: ["5"], layoutX: 2460, layoutY: 600, isTransfer: false },
  { id: "5035", name: "군자", lines: ["5", "7"], layoutX: 2530, layoutY: 600, isTransfer: true },
  { id: "5036", name: "아차산", lines: ["5"], layoutX: 2600, layoutY: 600, isTransfer: false },
  { id: "5037", name: "광나루", lines: ["5"], layoutX: 2670, layoutY: 600, isTransfer: false },
  { id: "5038", name: "천호", lines: ["5", "8"], layoutX: 2740, layoutY: 600, isTransfer: true },
  { id: "5039", name: "강동", lines: ["5"], layoutX: 2810, layoutY: 600, isTransfer: false },
  { id: "5040", name: "길동", lines: ["5"], layoutX: 2880, layoutY: 600, isTransfer: false },
  { id: "5041", name: "굽은다리", lines: ["5"], layoutX: 2950, layoutY: 600, isTransfer: false },
  { id: "5042", name: "명일", lines: ["5"], layoutX: 3020, layoutY: 600, isTransfer: false },
  { id: "5043", name: "고덕", lines: ["5"], layoutX: 3090, layoutY: 600, isTransfer: false },
  { id: "5044", name: "상일동", lines: ["5"], layoutX: 3160, layoutY: 600, isTransfer: false },
  { id: "5045", name: "강일", lines: ["5"], layoutX: 3230, layoutY: 600, isTransfer: false },
  { id: "5046", name: "미사", lines: ["5"], layoutX: 3300, layoutY: 600, isTransfer: false },
  { id: "5047", name: "하남풍산", lines: ["5"], layoutX: 3370, layoutY: 600, isTransfer: false },
  { id: "5048", name: "하남시청", lines: ["5"], layoutX: 3440, layoutY: 600, isTransfer: false },
  { id: "5049", name: "하남검단산", lines: ["5"], layoutX: 3510, layoutY: 600, isTransfer: false },
  { id: "5050", name: "둔촌동", lines: ["5"], layoutX: 2810, layoutY: 700, isTransfer: false },
  { id: "5051", name: "올림픽공원", lines: ["5", "2"], layoutX: 2810, layoutY: 800, isTransfer: true },
  { id: "5052", name: "방이", lines: ["5"], layoutX: 2810, layoutY: 900, isTransfer: false },
  { id: "5053", name: "개롱", lines: ["5"], layoutX: 2810, layoutY: 1000, isTransfer: false },
  { id: "5054", name: "거여", lines: ["5"], layoutX: 2810, layoutY: 1100, isTransfer: false },
  { id: "5055", name: "마천", lines: ["5"], layoutX: 2810, layoutY: 1200, isTransfer: false },
  { id: "5056", name: "오금", lines: ["5", "3"], layoutX: 2810, layoutY: 850, isTransfer: true },
  // 6호선
  // 응암순환 루프: P자 모양으로 배치
  { id: "6001", name: "응암", lines: ["6"], layoutX: 320, layoutY: 650, isTransfer: false }, // 루프 왼쪽 아래
  { id: "6002", name: "역촌", lines: ["6"], layoutX: 320, layoutY: 700, isTransfer: false }, // 루프 왼쪽 중간
  { id: "6003", name: "불광", lines: ["6", "3"], layoutX: 320, layoutY: 750, isTransfer: true }, // 루프 왼쪽 위
  { id: "6004", name: "연신내", lines: ["6", "3"], layoutX: 430, layoutY: 750, isTransfer: true }, // 세로줄 중간
  { id: "6005", name: "구산", lines: ["6"], layoutX: 430, layoutY: 650, isTransfer: false }, // 세로줄 위
  { id: "6004-1", name: "독바위", lines: ["6"], layoutX: 430, layoutY: 800, isTransfer: false }, // 세로줄 아래
  { id: "6006", name: "새절", lines: ["6"], layoutX: 510, layoutY: 750, isTransfer: false },
  { id: "6007", name: "증산", lines: ["6"], layoutX: 570, layoutY: 750, isTransfer: false },
  { id: "6008", name: "디지털미디어시티", lines: ["6"], layoutX: 640, layoutY: 750, isTransfer: false },
  { id: "6009", name: "월드컵경기장", lines: ["6"], layoutX: 710, layoutY: 750, isTransfer: false },
  { id: "6010", name: "마포구청", lines: ["6"], layoutX: 780, layoutY: 750, isTransfer: false },
  { id: "6011", name: "망원", lines: ["6"], layoutX: 850, layoutY: 750, isTransfer: false },
  { id: "6012", name: "합정", lines: ["6", "2"], layoutX: 920, layoutY: 750, isTransfer: true },
  { id: "6013", name: "상수", lines: ["6"], layoutX: 990, layoutY: 750, isTransfer: false },
  { id: "6014", name: "광흥창", lines: ["6"], layoutX: 1060, layoutY: 750, isTransfer: false },
  { id: "6015", name: "대흥", lines: ["6"], layoutX: 1130, layoutY: 750, isTransfer: false },
  { id: "6016", name: "공덕", lines: ["6", "5"], layoutX: 1200, layoutY: 750, isTransfer: true },
  { id: "6017", name: "효창공원앞", lines: ["6"], layoutX: 1270, layoutY: 750, isTransfer: false },
  { id: "6018", name: "삼각지", lines: ["6", "4"], layoutX: 1340, layoutY: 750, isTransfer: true },
  { id: "6018-1", name: "효자", lines: ["6"], layoutX: 1340, layoutY: 800, isTransfer: false },
  { id: "6019", name: "녹사평", lines: ["6"], layoutX: 1410, layoutY: 750, isTransfer: false },
  { id: "6020", name: "이태원", lines: ["6"], layoutX: 1480, layoutY: 750, isTransfer: false },
  { id: "6021", name: "한강진", lines: ["6"], layoutX: 1550, layoutY: 750, isTransfer: false },
  { id: "6022", name: "버티고개", lines: ["6"], layoutX: 1620, layoutY: 750, isTransfer: false },
  { id: "6023", name: "약수", lines: ["6", "3"], layoutX: 1690, layoutY: 750, isTransfer: true },
  { id: "6024", name: "청구", lines: ["6", "5"], layoutX: 1760, layoutY: 750, isTransfer: true },
  { id: "6025", name: "신당", lines: ["6", "2"], layoutX: 1830, layoutY: 750, isTransfer: true },
  { id: "6026", name: "동묘앞", lines: ["6", "1"], layoutX: 1900, layoutY: 750, isTransfer: true },
  { id: "6027", name: "창신", lines: ["6"], layoutX: 1970, layoutY: 750, isTransfer: false },
  { id: "6028", name: "보문", lines: ["6"], layoutX: 2040, layoutY: 750, isTransfer: false },
  { id: "6029", name: "안암", lines: ["6"], layoutX: 2110, layoutY: 750, isTransfer: false },
  { id: "6030", name: "고려대", lines: ["6"], layoutX: 2180, layoutY: 750, isTransfer: false },
  { id: "6031", name: "월곡", lines: ["6"], layoutX: 2250, layoutY: 750, isTransfer: false },
  { id: "6032", name: "상월곡", lines: ["6"], layoutX: 2320, layoutY: 750, isTransfer: false },
  { id: "6033", name: "돌곶이", lines: ["6"], layoutX: 2390, layoutY: 750, isTransfer: false },
  { id: "6034", name: "석계", lines: ["6", "1"], layoutX: 2460, layoutY: 750, isTransfer: true },
  { id: "6035", name: "태릉입구", lines: ["6", "7"], layoutX: 2530, layoutY: 750, isTransfer: true },
  { id: "6036", name: "화랑대", lines: ["6"], layoutX: 2600, layoutY: 750, isTransfer: false },
  { id: "6037", name: "봉화산", lines: ["6"], layoutX: 2670, layoutY: 750, isTransfer: false },
  { id: "6038", name: "신내", lines: ["6"], layoutX: 2740, layoutY: 750, isTransfer: false },
  // 7호선
  { id: "7001", name: "장암", lines: ["7"], layoutX: 150, layoutY: 900, isTransfer: false },
  { id: "7002", name: "도봉산", lines: ["7", "1"], layoutX: 220, layoutY: 900, isTransfer: true },
  { id: "7003", name: "수락산", lines: ["7"], layoutX: 290, layoutY: 900, isTransfer: false },
  { id: "7004", name: "마들", lines: ["7"], layoutX: 360, layoutY: 900, isTransfer: false },
  { id: "7005", name: "노원", lines: ["7", "4"], layoutX: 430, layoutY: 900, isTransfer: true },
  { id: "7006", name: "중계", lines: ["7"], layoutX: 500, layoutY: 900, isTransfer: false },
  { id: "7007", name: "하계", lines: ["7"], layoutX: 570, layoutY: 900, isTransfer: false },
  { id: "7008", name: "공릉", lines: ["7"], layoutX: 640, layoutY: 900, isTransfer: false },
  { id: "7009", name: "태릉입구", lines: ["7"], layoutX: 710, layoutY: 900, isTransfer: false },
  { id: "7010", name: "먹골", lines: ["7"], layoutX: 780, layoutY: 900, isTransfer: false },
  { id: "7011", name: "중화", lines: ["7"], layoutX: 850, layoutY: 900, isTransfer: false },
  { id: "7012", name: "상봉", lines: ["7"], layoutX: 920, layoutY: 900, isTransfer: false },
  { id: "7013", name: "면목", lines: ["7"], layoutX: 990, layoutY: 900, isTransfer: false },
  { id: "7014", name: "사가정", lines: ["7"], layoutX: 1060, layoutY: 900, isTransfer: false },
  { id: "7015", name: "용마산", lines: ["7"], layoutX: 1130, layoutY: 900, isTransfer: false },
  { id: "7016", name: "중곡", lines: ["7"], layoutX: 1200, layoutY: 900, isTransfer: false },
  { id: "7017", name: "군자", lines: ["7", "5"], layoutX: 1270, layoutY: 900, isTransfer: true },
  { id: "7018", name: "어린이대공원", lines: ["7"], layoutX: 1340, layoutY: 900, isTransfer: false },
  { id: "7019", name: "건대입구", lines: ["7", "2"], layoutX: 1410, layoutY: 900, isTransfer: true },
  { id: "7020", name: "뚝섬유원지", lines: ["7"], layoutX: 1480, layoutY: 900, isTransfer: false },
  { id: "7021", name: "청담", lines: ["7"], layoutX: 1550, layoutY: 900, isTransfer: false },
  { id: "7022", name: "강남구청", lines: ["7"], layoutX: 1620, layoutY: 900, isTransfer: false },
  { id: "7023", name: "학동", lines: ["7"], layoutX: 1690, layoutY: 900, isTransfer: false },
  { id: "7024", name: "논현", lines: ["7"], layoutX: 1760, layoutY: 900, isTransfer: false },
  { id: "7025", name: "반포", lines: ["7"], layoutX: 1830, layoutY: 900, isTransfer: false },
  { id: "7026", name: "고속터미널", lines: ["7", "3", "9"], layoutX: 1900, layoutY: 900, isTransfer: true },
  { id: "7027", name: "내방", lines: ["7"], layoutX: 1970, layoutY: 900, isTransfer: false },
  { id: "7028", name: "총신대입구", lines: ["7"], layoutX: 2040, layoutY: 900, isTransfer: false },
  { id: "7029", name: "남성", lines: ["7"], layoutX: 2110, layoutY: 900, isTransfer: false },
  { id: "7030", name: "숭실대입구", lines: ["7"], layoutX: 2180, layoutY: 900, isTransfer: false },
  { id: "7031", name: "상도", lines: ["7"], layoutX: 2250, layoutY: 900, isTransfer: false },
  { id: "7032", name: "장승배기", lines: ["7"], layoutX: 2320, layoutY: 900, isTransfer: false },
  { id: "7033", name: "신대방삼거리", lines: ["7"], layoutX: 2390, layoutY: 900, isTransfer: false },
  { id: "7034", name: "보라매", lines: ["7"], layoutX: 2460, layoutY: 900, isTransfer: false },
  { id: "7035", name: "신풍", lines: ["7"], layoutX: 2530, layoutY: 900, isTransfer: false },
  { id: "7036", name: "대림", lines: ["7", "2"], layoutX: 2600, layoutY: 900, isTransfer: true },
  { id: "7037", name: "남구로", lines: ["7"], layoutX: 2670, layoutY: 900, isTransfer: false },
  { id: "7038", name: "가산디지털단지", lines: ["7"], layoutX: 2740, layoutY: 900, isTransfer: false },
  { id: "7039", name: "철산", lines: ["7"], layoutX: 2810, layoutY: 900, isTransfer: false },
  { id: "7040", name: "광명사거리", lines: ["7"], layoutX: 2880, layoutY: 900, isTransfer: false },
  { id: "7041", name: "천왕", lines: ["7"], layoutX: 2950, layoutY: 900, isTransfer: false },
  { id: "7042", name: "온수", lines: ["7"], layoutX: 3020, layoutY: 900, isTransfer: false },
  { id: "7043", name: "까치울", lines: ["7"], layoutX: 3090, layoutY: 900, isTransfer: false },
  { id: "7044", name: "부천종합운동장", lines: ["7"], layoutX: 3160, layoutY: 900, isTransfer: false },
  { id: "7045", name: "춘의", lines: ["7"], layoutX: 3230, layoutY: 900, isTransfer: false },
  { id: "7046", name: "신중동", lines: ["7"], layoutX: 3300, layoutY: 900, isTransfer: false },
  { id: "7047", name: "부천시청", lines: ["7"], layoutX: 3370, layoutY: 900, isTransfer: false },
  { id: "7048", name: "상동", lines: ["7"], layoutX: 3440, layoutY: 900, isTransfer: false },
  { id: "7049", name: "삼산체육관", lines: ["7"], layoutX: 3510, layoutY: 900, isTransfer: false },
  { id: "7050", name: "굴포천", lines: ["7"], layoutX: 3580, layoutY: 900, isTransfer: false },
  { id: "7051", name: "부평구청", lines: ["7"], layoutX: 3650, layoutY: 900, isTransfer: false },
  { id: "7052", name: "산곡", lines: ["7"], layoutX: 3720, layoutY: 900, isTransfer: false },
  { id: "7053", name: "석남", lines: ["7"], layoutX: 3790, layoutY: 900, isTransfer: false },
  // 8호선
  { id: "8001", name: "별내", lines: ["8"], layoutX: 10, layoutY: 1050, isTransfer: true }, // 경의중앙선 환승
  { id: "8002", name: "다산", lines: ["8"], layoutX: 80, layoutY: 1050, isTransfer: false },
  { id: "8003", name: "동구릉", lines: ["8"], layoutX: 150, layoutY: 1050, isTransfer: false },
  { id: "8004", name: "구리", lines: ["8"], layoutX: 220, layoutY: 1050, isTransfer: true }, // 경의중앙선 환승
  { id: "8005", name: "장자 호수공원", lines: ["8"], layoutX: 290, layoutY: 1050, isTransfer: false },
  { id: "8006", name: "암사 역사공원", lines: ["8"], layoutX: 360, layoutY: 1050, isTransfer: false },
  { id: "8007", name: "암사", lines: ["8"], layoutX: 430, layoutY: 1050, isTransfer: false },
  { id: "8008", name: "천호", lines: ["8", "5"], layoutX: 500, layoutY: 1050, isTransfer: true },
  { id: "8009", name: "강동구청", lines: ["8"], layoutX: 570, layoutY: 1050, isTransfer: false },
  { id: "8010", name: "몽촌토성", lines: ["8"], layoutX: 640, layoutY: 1050, isTransfer: false },
  { id: "8011", name: "잠실", lines: ["8", "2"], layoutX: 710, layoutY: 1050, isTransfer: true },
  { id: "8012", name: "석촌", lines: ["8"], layoutX: 780, layoutY: 1050, isTransfer: false },
  { id: "8013", name: "송파", lines: ["8"], layoutX: 850, layoutY: 1050, isTransfer: false },
  { id: "8014", name: "가락시장", lines: ["8", "3"], layoutX: 920, layoutY: 1050, isTransfer: true },
  { id: "8015", name: "문정", lines: ["8"], layoutX: 990, layoutY: 1050, isTransfer: false },
  { id: "8016", name: "장지", lines: ["8"], layoutX: 1060, layoutY: 1050, isTransfer: false },
  { id: "8017", name: "복정", lines: ["8"], layoutX: 1130, layoutY: 1050, isTransfer: false },
  { id: "8018", name: "남위례", lines: ["8"], layoutX: 1200, layoutY: 1050, isTransfer: false },
  { id: "8019", name: "산성", lines: ["8"], layoutX: 1270, layoutY: 1050, isTransfer: false },
  { id: "8020", name: "남한산성입구", lines: ["8"], layoutX: 1340, layoutY: 1050, isTransfer: false },
  { id: "8021", name: "단대오거리", lines: ["8"], layoutX: 1410, layoutY: 1050, isTransfer: false },
  { id: "8022", name: "신흥", lines: ["8"], layoutX: 1480, layoutY: 1050, isTransfer: false },
  { id: "8023", name: "수진", lines: ["8"], layoutX: 1550, layoutY: 1050, isTransfer: false },
  { id: "8024", name: "모란", lines: ["8"], layoutX: 1620, layoutY: 1050, isTransfer: false },
  // 9호선
  { id: "9001", name: "개화", lines: ["9"], layoutX: 150, layoutY: 1200, isTransfer: false },
  { id: "9002", name: "김포공항", lines: ["9", "5"], layoutX: 220, layoutY: 1200, isTransfer: true },
  { id: "9003", name: "공항시장", lines: ["9"], layoutX: 290, layoutY: 1200, isTransfer: false },
  { id: "9004", name: "신방화", lines: ["9"], layoutX: 360, layoutY: 1200, isTransfer: false },
  { id: "9005", name: "마곡나루", lines: ["9"], layoutX: 430, layoutY: 1200, isTransfer: false },
  { id: "9006", name: "양천향교", lines: ["9"], layoutX: 500, layoutY: 1200, isTransfer: false },
  { id: "9007", name: "가양", lines: ["9"], layoutX: 570, layoutY: 1200, isTransfer: false },
  { id: "9008", name: "증미", lines: ["9"], layoutX: 640, layoutY: 1200, isTransfer: false },
  { id: "9009", name: "등촌", lines: ["9"], layoutX: 710, layoutY: 1200, isTransfer: false },
  { id: "9010", name: "염창", lines: ["9"], layoutX: 780, layoutY: 1200, isTransfer: false },
  { id: "9011", name: "신목동", lines: ["9"], layoutX: 850, layoutY: 1200, isTransfer: false },
  { id: "9012", name: "선유도", lines: ["9"], layoutX: 920, layoutY: 1200, isTransfer: false },
  { id: "9013", name: "당산", lines: ["9", "2"], layoutX: 990, layoutY: 1200, isTransfer: true },
  { id: "9014", name: "국회의사당", lines: ["9"], layoutX: 1060, layoutY: 1200, isTransfer: false },
  { id: "9015", name: "여의도", lines: ["9", "5"], layoutX: 1130, layoutY: 1200, isTransfer: true },
  { id: "9016", name: "샛강", lines: ["9"], layoutX: 1200, layoutY: 1200, isTransfer: false },
  { id: "9017", name: "노량진", lines: ["9", "1"], layoutX: 1270, layoutY: 1200, isTransfer: true },
  { id: "9018", name: "노들", lines: ["9"], layoutX: 1340, layoutY: 1200, isTransfer: false },
  { id: "9019", name: "흑석", lines: ["9"], layoutX: 1410, layoutY: 1200, isTransfer: false },
  { id: "9020", name: "동작", lines: ["9", "4"], layoutX: 1480, layoutY: 1200, isTransfer: true },
  { id: "9021", name: "구반포", lines: ["9"], layoutX: 1550, layoutY: 1200, isTransfer: false },
  { id: "9022", name: "신반포", lines: ["9"], layoutX: 1620, layoutY: 1200, isTransfer: false },
  { id: "9023", name: "고속터미널", lines: ["9", "3", "7"], layoutX: 1690, layoutY: 1200, isTransfer: true },
  { id: "9024", name: "사평", lines: ["9"], layoutX: 1760, layoutY: 1200, isTransfer: false },
  { id: "9025", name: "신논현", lines: ["9"], layoutX: 1830, layoutY: 1200, isTransfer: false },
  { id: "9026", name: "언주", lines: ["9"], layoutX: 1900, layoutY: 1200, isTransfer: false },
  { id: "9027", name: "선정릉", lines: ["9"], layoutX: 1970, layoutY: 1200, isTransfer: false },
  { id: "9028", name: "삼성중앙", lines: ["9"], layoutX: 2040, layoutY: 1200, isTransfer: false },
  { id: "9029", name: "봉은사", lines: ["9"], layoutX: 2110, layoutY: 1200, isTransfer: false },
  { id: "9030", name: "종합운동장", lines: ["9"], layoutX: 2180, layoutY: 1200, isTransfer: false },
  { id: "9031", name: "올림픽공원", lines: ["9"], layoutX: 2250, layoutY: 1200, isTransfer: false },
  { id: "9032", name: "한성백제", lines: ["9"], layoutX: 2320, layoutY: 1200, isTransfer: false },
  { id: "9033", name: "둔촌오륜", lines: ["9"], layoutX: 2390, layoutY: 1200, isTransfer: false },
  { id: "9034", name: "중앙보훈병원", lines: ["9"], layoutX: 2460, layoutY: 1200, isTransfer: false },
];

// 노선 정의 (운행 순서대로 stationIds 정렬)
export const LINES: Line[] = [
  {
    id: "1",
    name: "1호선",
    color: LINE_COLORS["1"],
    // 본선: 서울 구간 (청량리~구로)
    stationIds: ["1014", "1015", "1016", "1017", "1018", "1019", "1020", "1021", "1022", "1023", "1024", "1025", "1026", "1027", "1028", "1029", "1030", "1031"],
    branches: [
      {
        id: "1-gyeongwon",
        name: "경원선",
        // 청량리 → 회기 → 외대앞 → 신이문 → 석계 → 광운대 → 월계 → 녹천 → 창동 → 도봉산 → 회룡 → 의정부 → 가능 → 녹양 → 양주 → 덕계 → 덕정 → 지행 → 동두천중앙 → 보산 → 동두천 → 소요산 → 청산 → 전곡 → 연천
        stationIds: ["1014", "1013", "1012", "1011", "1010", "1009", "1008", "1007", "1006", "1005", "1004", "1003", "0988", "0987", "0986", "0985", "0999", "1000", "0984", "0983", "1002", "1001", "0982", "0981", "0980"],
      },
      {
        id: "1-gyeongin",
        name: "경인선",
        // 구로 → 구일 → 개봉 → 오류동 → 온수 → 역곡 → 소사 → 부천 → 중동 → 송내 → 부개 → 부평 → 백운 → 동암 → 간석 → 주안 → 도화 → 제물포 → 도원 → 동인천 → 인천
        stationIds: ["1031", "1072", "1071", "1070", "1086", "1087", "1088", "1073", "1075", "1074", "1076", "1077", "1089", "1078", "1079", "1080", "1081", "1082", "1083", "1084", "1085"],
      },
      {
        id: "1-gyeongbu",
        name: "경부선",
        // 구로 → 가산디지털단지 → 독산 → 금천구청 → 석수 → 관악 → 안양 → 명학 → 금정 → 군포 → 당정 → 의왕 → 성균관대 → 화서 → 수원 → 세류 → 병점 → 세마 → 오산대 → 오산 → 진위 → 송탄 → 서정리 → 지제 → 평택 → 성환 → 직산 → 두정 → 천안 → 봉명 → 쌍용 → 아산 → 탕정 → 배방 → 온양온천 → 신창
        stationIds: ["1031", "1032", "1033", "1034", "1035", "1036", "1037", "1038", "1039", "1040", "1041", "1042", "1043", "1044", "1045", "1046", "1047", "1049", "1050", "1051", "1052", "1053", "1054", "1090", "1056", "1057", "1058", "1059", "1060", "1061", "1062", "1063", "1064", "1065", "1066", "1067"],
      },
    ],
  },
  {
    id: "2",
    name: "2호선",
    color: LINE_COLORS["2"],
    // 2호선 순환선: 시청 → 을지로입구 → 을지로3가 → 을지로4가 → 동대문역사문화공원 → 신당 → 상왕십리 → 왕십리 → 한양대 → 뚝섬 → 성수 → 건대입구 → 구의 → 강변 → 잠실나루 → 잠실 → 잠실새내 → 종합운동장 → 삼성 → 선릉 → 역삼 → 강남 → 교대 → 서초 → 방배 → 사당 → 낙성대 → 서울대입구 → 봉천 → 신림 → 신대방 → 구로디지털단지 → 대림 → 신도림 → 문래 → 영등포구청 → 당산 → 합정 → 홍대입구 → 신촌 → 이대 → 아현 → 충정로 → 시청 (순환)
    stationIds: ["2043", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034", "2035", "2036", "2037", "2038", "2039", "2040", "2041", "2042", "2043"],
    branches: [
      {
        id: "2-seongsu",
        name: "성수지선",
        stationIds: ["2010", "2050", "2051", "2052", "2053"], // 성수 → 용답 → 신답 → 용두 → 신설동
      },
      {
        id: "2-sinjeong",
        name: "신정지선",
        stationIds: ["2033", "2062", "2063", "2064", "2061"], // 신도림 → 도림천 → 양천구청 → 신정네거리 → 까치산
      },
    ],
  },
  {
    id: "3",
    name: "3호선",
    color: LINE_COLORS["3"],
    stationIds: ["3001", "3002", "3003", "3004", "3005", "3006", "3007", "3008", "3009", "3010", "3011", "3012", "3013", "3014", "3015", "3016", "3017", "3018", "3019", "3020", "3021", "3022", "3023", "3024", "3025", "3026", "3027", "3028", "3029", "3030", "3031", "3032", "3033", "3034", "3035", "3036", "3037", "3038", "3039", "3040", "3041", "3042"],
  },
  {
    id: "4",
    name: "4호선",
    color: LINE_COLORS["4"],
    stationIds: ["4001", "4002", "4003", "4004", "4005", "4006", "4007", "4008", "4009", "4010", "4011", "4012", "4013", "4014", "4015", "4016", "4017", "4018", "4019", "4020", "4021", "4022", "4023", "4024", "4025", "4026", "4027", "4028", "4029", "4030", "4031", "4032", "4033", "4034", "4035", "4036", "4037", "4038", "4039", "4040", "4041", "4042", "4043", "4044", "4045", "4046", "4047", "4048", "4049", "4050", "4051"],
  },
  {
    id: "5",
    name: "5호선",
    color: LINE_COLORS["5"],
    // 5호선 메인 구간: 방화 ~ 강동
    stationIds: ["5001", "5002", "5003", "5004", "5005", "5006", "5007", "5008", "5009", "5010", "5011", "5012", "5013", "5014", "5015", "5016", "5017", "5018", "5019", "5020", "5021", "5022", "5023", "5024", "5025", "5026", "5027", "5028", "5029", "5030", "5031", "5032", "5033", "5034", "5035", "5036", "5037", "5038", "5039"],
    branches: [
      {
        id: "5-macheon",
        name: "마천지선",
        // 강동 → 길동 → 둔촌동 → 올림픽공원 → 오금 → 방이 → 개롱 → 거여 → 마천
        stationIds: ["5039", "5040", "5050", "5051", "5056", "5052", "5053", "5054", "5055"],
      },
      {
        id: "5-hanam",
        name: "하남선",
        // 강동 → 굽은다리 → 고덕 → 명일 → 상일동 → 강일 → 미사 → 하남풍산 → 하남시청 → 하남검단산
        stationIds: ["5039", "5041", "5043", "5042", "5044", "5045", "5046", "5047", "5048", "5049"],
      },
    ],
  },
  {
    id: "6",
    name: "6호선",
    color: LINE_COLORS["6"],
    // 줄기(세로)만 포함: 응암/역촌/불광/독바위는 루프에만 있음
    stationIds: ["6005", "6004", "6006", "6007", "6008", "6009", "6010", "6011", "6012", "6013", "6014", "6015", "6016", "6017", "6018", "6019", "6020", "6021", "6022", "6023", "6024", "6025", "6026", "6027", "6028", "6029", "6030", "6031", "6032", "6033", "6034", "6035", "6036", "6037", "6038"],
    branches: [
      {
        id: "6-eungam-loop",
        name: "응암순환",
        stationIds: ["6005", "6001", "6002", "6003", "6004-1", "6004"], // 구산 → 응암 → 역촌 → 불광 → 독바위 → 연신내
      },
    ],
  },
  {
    id: "7",
    name: "7호선",
    color: LINE_COLORS["7"],
    stationIds: ["7001", "7002", "7003", "7004", "7005", "7006", "7007", "7008", "7009", "7010", "7011", "7012", "7013", "7014", "7015", "7016", "7017", "7018", "7019", "7020", "7021", "7022", "7023", "7024", "7025", "7026", "7027", "7028", "7029", "7030", "7031", "7032", "7033", "7034", "7035", "7036", "7037", "7038", "7039", "7040", "7041", "7042", "7043", "7044", "7045", "7046", "7047", "7048", "7049", "7050", "7051", "7052", "7053"],
  },
  {
    id: "8",
    name: "8호선",
    color: LINE_COLORS["8"],
    stationIds: ["8001", "8002", "8003", "8004", "8005", "8006", "8007", "8008", "8009", "8010", "8011", "8012", "8013", "8014", "8015", "8016", "8017", "8018", "8019", "8020", "8021", "8022", "8023", "8024"],
  },
  {
    id: "9",
    name: "9호선",
    color: LINE_COLORS["9"],
    stationIds: ["9001", "9002", "9003", "9004", "9005", "9006", "9007", "9008", "9009", "9010", "9011", "9012", "9013", "9014", "9015", "9016", "9017", "9018", "9019", "9020", "9021", "9022", "9023", "9024", "9025", "9026", "9027", "9028", "9029", "9030", "9031", "9032", "9033", "9034"],
  },
];

// 역 ID로 역 찾기
export const getStationById = (id: string): Station | undefined => {
  return STATIONS.find(s => s.id === id);
};

// 노선 ID로 역 목록 가져오기 (지선 포함)
export const getStationsByLine = (lineId: LineId): Station[] => {
  const line = LINES.find(l => l.id === lineId);
  if (!line) return [];
  
  // 메인 노선의 역 ID 수집
  const allStationIds = new Set<string>(line.stationIds);
  
  // 지선(branches)의 역 ID도 추가
  if (line.branches) {
    line.branches.forEach(branch => {
      branch.stationIds.forEach(id => allStationIds.add(id));
    });
  }
  
  // 역 ID를 배열로 변환하고 역 객체로 매핑
  return Array.from(allStationIds)
    .map(id => getStationById(id))
    .filter((s): s is Station => s !== undefined);
};

// 역 이름으로 역 찾기
export const getStationByName = (name: string): Station | undefined => {
  return STATIONS.find(s => s.name === name);
};

// 혼잡도 색상 (추후 연동용 hook 포인트)
export const getStationColor = (stationId: string, congestionLevel?: "여유" | "보통" | "주의" | "혼잡"): string => {
  const station = getStationById(stationId);
  if (!station) return "#666666";
  
  // 기본적으로 노선 색상 사용
  const lineColor = LINE_COLORS[station.lines[0] as LineId] || "#666666";
  
  // 혼잡도가 있으면 색상 조정 (추후 구현)
  if (congestionLevel) {
    // 혼잡도에 따른 색상 조정 로직
    // 혼잡도가 높을수록 어둡게, 낮을수록 밝게
    const baseColor = lineColor;
    const alpha = congestionLevel === 1 ? 1.0 : // 여유: 밝게
                  congestionLevel === 2 ? 0.9 : // 보통: 약간 어둡게
                  congestionLevel === 3 ? 0.7 : // 혼잡: 어둡게
                  0.5; // 매우 혼잡: 매우 어둡게
    
    // RGB 값 추출 및 조정
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // 알파 값 적용 (밝기 조정)
    const adjustedR = Math.round(r * alpha);
    const adjustedG = Math.round(g * alpha);
    const adjustedB = Math.round(b * alpha);
    
    return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
  }
  
  return lineColor;
};
