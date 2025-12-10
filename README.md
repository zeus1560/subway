# 서울 지하철 혼잡도 예측 시스템

서울 지하철 역별 실시간 혼잡도 정보를 제공하고 AI 기반 예측 및 추천 기능을 제공하는 Next.js 웹 애플리케이션입니다.

## 🌐 배포된 사이트

**👉 [배포된 사이트 바로가기](https://station1-1dxwjl3n3-ahn-seungjoos-projects.vercel.app)**

배포된 사이트에서 바로 사용해보실 수 있습니다!

## 주요 기능

- 🚇 **역별 혼잡도 조회**: 서울 지하철 각 역의 실시간 혼잡도 정보 확인
- 📊 **시간대별 비교**: 현재 시간과 10분 후 예상 혼잡도 비교
- 🚂 **열차 칸별 혼잡도**: 상행/하행 방향별 열차 칸의 혼잡도 정보
- 🤖 **AI 기반 기능**:
  - 게시글 자동 분석 (요약, 태그 추출, 부적절한 내용 감지)
  - 칸 추천 설명 생성
  - 혼잡도 예측 설명
- 🎯 **최적 탑승 칸 추천**: 사용자 패턴 기반 AI 추천
- ⭐ **즐겨찾기**: 자주 이용하는 역 즐겨찾기 기능
- 🗺️ **경로 탐색**: 지하철 경로 탐색 및 혼잡도 기반 최적 경로 추천
- 🗺️ **인터랙티브 지도**: 노선별 지하철 노선도 시각화

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **AI**: OpenAI GPT-3.5-turbo (선택사항)

## 설치 및 실행

### 1. 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn

### 2. 의존성 설치

```bash
cd station1
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 서울시 공공데이터 API 키 (필수)
NEXT_PUBLIC_SEOUL_API_KEY=your_seoul_api_key_here

# OpenAI API 키 (선택사항 - AI 기능 사용 시)
OPENAI_API_KEY=sk-your-api-key-here

# 네이버 지도 API 키 (선택사항 - 경로 탐색 기능 사용 시)
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_client_id_here
NEXT_PUBLIC_NAVER_CLIENT_SECRET=your_naver_client_secret_here
```

**API 키 발급 방법:**

1. **서울시 공공데이터 API 키:**
   - 서울시 공공데이터포털 (https://data.seoul.go.kr) 접속
   - 회원가입 및 로그인
   - "CardSubwayStatsNew" API 신청
   - 발급받은 API 키를 `.env.local` 파일에 입력

2. **OpenAI API 키 (선택사항):**
   - OpenAI Platform (https://platform.openai.com) 접속
   - API Keys 페이지에서 새 키 생성
   - AI 기능 사용 시에만 필요 (없어도 기본 기능은 정상 작동)

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:4000](http://localhost:4000)을 열어 확인하세요.

### 5. 프로덕션 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
station1/
├── app/                    # Next.js App Router 페이지
│   ├── api/               # API 라우트
│   ├── board/             # 게시판 기능
│   ├── comparison/        # 시간대별 비교
│   ├── lines/             # 열차 칸별 혼잡도
│   ├── stations/          # 역 정보
│   └── route/             # 경로 탐색
├── components/            # 재사용 가능한 컴포넌트
│   ├── InteractiveSubwayMap.tsx  # 인터랙티브 지하철 지도
│   └── ...
├── lib/                   # 유틸리티 및 API 함수
│   ├── api.ts             # 서울시 API 연동
│   ├── openaiService.ts   # AI 서비스
│   ├── recommendation.ts  # 추천 알고리즘
│   └── ...
├── public/                # 정적 파일
├── scripts/               # 유틸리티 스크립트
└── subway_passengers.csv  # 지하철 승객 데이터
```

## AI 기능

이 프로젝트는 OpenAI GPT-3.5-turbo를 사용하여 다음과 같은 AI 기능을 제공합니다:

1. **게시글 자동 분석**: 게시글 작성 시 자동으로 요약, 태그 추출, 부적절한 내용 감지
2. **칸 추천 설명**: 혼잡도 데이터를 바탕으로 친절한 추천 설명 생성
3. **혼잡도 예측 설명**: 예측 결과를 사용자 친화적으로 설명

자세한 내용은 `AI_USAGE_GUIDE.md` 파일을 참고하세요.

> **참고**: AI 기능은 폴백 메커니즘이 있어서 API 키가 없어도 기본 기능은 정상 작동합니다.

## 주요 페이지

- `/` - 메인 대시보드
- `/stations` - 역 목록 및 검색
- `/stations/[id]` - 역 상세 정보
- `/lines` - 열차 칸별 혼잡도
- `/comparison` - 시간대별 혼잡도 비교
- `/route` - 경로 탐색
- `/map` - 인터랙티브 지하철 지도
- `/board` - 커뮤니티 게시판

## 테스트

```bash
# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e
```

## 문제 해결

### 포트 4000이 이미 사용 중인 경우

```bash
npx next dev -p 3000
```

### 의존성 설치 오류

```bash
rm -rf node_modules package-lock.json
npm install
```

### 빌드 오류

```bash
rm -rf .next
npm run build
```

## 라이선스

이 프로젝트는 개인 프로젝트입니다.
