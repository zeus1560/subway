# 서울 지하철 혼잡도 앱 (Station1)

서울 지하철 역별 실시간 혼잡도 정보를 제공하는 Next.js 기반 웹 애플리케이션입니다.

## 주요 기능

- 🚇 **역별 혼잡도 조회**: 서울 지하철 각 역의 실시간 혼잡도 정보 확인
- 📊 **시간대별 비교**: 현재 시간과 10분 후 예상 혼잡도 비교
- 🚂 **열차 칸별 혼잡도**: 상행/하행 방향별 열차 칸의 혼잡도 정보
- 🎯 **AI 추천**: 사용자 패턴 기반 최적 탑승 칸 추천
- ⭐ **즐겨찾기**: 자주 이용하는 역 즐겨찾기 기능
- 🗺️ **경로 탐색**: 지하철 경로 탐색 및 혼잡도 기반 최적 경로 추천

## 기술 스택

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Setup Guide

### 1. Clone the repository

```bash
git clone <repository-url>
cd station1
```

### 2. Install dependencies

**필수 요구사항:**
- Node.js 18 이상
- npm 또는 yarn

```bash
npm install
```

### 3. Prepare the .env file

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 서울시 공공데이터 API 키 (필수)
NEXT_PUBLIC_SEOUL_API_KEY=your_seoul_api_key_here

# 네이버 지도 API 키 (선택사항 - 경로 탐색 기능 사용 시 필요)
NAVER_CLIENT_ID=your_naver_client_id_here
NAVER_CLIENT_SECRET=your_naver_client_secret_here
# 또는
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_client_id_here
NEXT_PUBLIC_NAVER_CLIENT_SECRET=your_naver_client_secret_here
```

**API 키 발급 방법:**

1. **서울시 공공데이터 API 키:**
   - 서울시 공공데이터포털 (https://data.seoul.go.kr) 접속
   - 회원가입 및 로그인
   - "CardSubwayStatsNew" API 신청
   - 발급받은 API 키를 `.env.local` 파일에 입력

2. **네이버 지도 API 키 (선택사항):**
   - 네이버 클라우드 플랫폼 (https://www.ncloud.com) 접속
   - Directions API 신청
   - 발급받은 Client ID와 Secret을 `.env.local` 파일에 입력

> ⚠️ **주의**: `.env.local` 파일은 Git에 커밋하지 마세요. 이 파일은 `.gitignore`에 포함되어 있습니다.
> 
> `.env.example` 파일을 참고하여 필요한 환경 변수를 설정하세요.

### 4. Run the project

**개발 서버 실행:**

```bash
npm run dev
```

브라우저에서 [http://localhost:4000](http://localhost:4000)을 열어 확인하세요.

**네트워크에서 접근 가능하게 실행:**

```bash
npm run dev:network
```

**프로덕션 빌드:**

```bash
npm run build
npm start
```

### 5. Troubleshooting

**자주 발생하는 에러:**

1. **포트 4000이 이미 사용 중인 경우:**
   ```bash
   # 다른 포트로 실행
   npx next dev -p 3000
   ```

2. **의존성 설치 오류:**
   ```bash
   # node_modules 삭제 후 재설치
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **빌드 오류:**
   ```bash
   # 캐시 삭제 후 재빌드
   rm -rf .next
   npm run build
   ```

4. **CSV 파일을 찾을 수 없는 경우:**
   - `subway_passengers.csv` 파일이 프로젝트 루트에 있는지 확인하세요.
   - 파일이 없으면 모의 데이터를 사용합니다.

5. **환경 변수 관련 오류:**
   - `.env.local` 파일이 프로젝트 루트에 있는지 확인하세요.
   - 환경 변수 이름이 정확한지 확인하세요 (대소문자 구분).
   - 개발 서버를 재시작하세요.

**테스트 실행:**

```bash
# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e

# 커버리지 확인
npm run test:coverage
```

## 프로젝트 구조

```
station1/
├── app/                    # Next.js App Router 페이지
│   ├── api/               # API 라우트
│   │   ├── cache/         # 캐시 초기화
│   │   ├── data/          # 데이터 조회
│   │   ├── predict/       # 혼잡도 예측
│   │   ├── route/         # 경로 탐색
│   │   └── train/         # 열차 정보
│   ├── comparison/        # 시간대별 비교 페이지
│   ├── lines/             # 열차 칸별 혼잡도 페이지
│   ├── stations/          # 역 정보 페이지
│   └── route/             # 경로 탐색 페이지
├── components/            # 재사용 가능한 컴포넌트
├── lib/                   # 유틸리티 및 API 함수
│   ├── random.ts         # 재현 가능한 랜덤 함수 (seed 기반)
│   ├── api.ts             # 서울시 API 연동
│   ├── cache.ts           # 데이터 캐시 관리
│   └── ...
├── public/                # 정적 파일
│   └── eval/              # 평가 결과 파일
├── scripts/               # 유틸리티 스크립트
├── subway_passengers.csv  # 지하철 승객 데이터 (필수)
└── .env.example           # 환경 변수 예제 파일
```

## 필수 파일

프로젝트 실행에 필요한 파일:
- `subway_passengers.csv`: 지하철 승객 데이터 (프로젝트 루트에 위치)
- `.env.local`: 환경 변수 파일 (`.env.example` 참고하여 생성)

## API 엔드포인트

### 열차 칸별 혼잡도

```
GET /api/train/congestion?line={line}&station={station}&direction={direction}
```

**파라미터:**

- `line`: 호선 번호 (1-9)
- `station`: 역 이름
- `direction`: 방향 (UP 또는 DOWN)

**응답:**

```json
{
  "success": true,
  "data": {
    "line": "2",
    "station": "강남",
    "direction": "UP",
    "cars": [
      {
        "carNo": 1,
        "congestionLevel": "여유",
        "value": 25
      },
      ...
    ]
  }
}
```

## 재현성 (Reproducibility)

이 프로젝트는 재현 가능한 결과를 보장하기 위해 다음과 같은 조치를 취했습니다:

- **고정 시드**: 모든 랜덤 함수는 시드 42로 고정되어 동일한 결과를 생성합니다.
- **상대 경로**: 모든 파일 경로는 `process.cwd()`와 `path.join()`을 사용하여 OS 독립적으로 작동합니다.
- **환경 변수**: 모든 설정은 환경 변수로 관리되어 일관성을 유지합니다.

## 개발 가이드

### 스크립트 실행

```bash
# 역명 매칭 테스트
npm run test:mapping

# 혼잡도 예측 모델 평가
npm run evaluate
```

### 코드 스타일

- TypeScript strict mode 사용
- ESLint 설정 포함
- Prettier 설정 권장

## 클린 환경에서의 실행 시뮬레이션

다음 단계를 따라하면 아무것도 설치되지 않은 새 컴퓨터에서도 동일하게 실행됩니다:

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd station1
   ```

2. **Node.js 설치 확인** (18 이상 필요)
   ```bash
   node --version
   ```

3. **의존성 설치**
   ```bash
   npm install
   ```

4. **환경 변수 설정**
   ```bash
   cp .env.example .env.local
   # .env.local 파일을 열어 API 키 입력
   ```

5. **개발 서버 실행**
   ```bash
   npm run dev
   ```

6. **브라우저에서 확인**
   - http://localhost:4000 접속

## 주의사항

1. **CSV 파일**: `subway_passengers.csv` 파일이 없으면 모의 데이터를 사용합니다.
2. **API 키**: 서울시 API 키가 없으면 일부 기능이 제한될 수 있습니다.
3. **포트**: 기본 포트는 4000입니다. 다른 포트를 사용하려면 `package.json`의 스크립트를 수정하세요.

## 라이선스

이 프로젝트는 개인 프로젝트입니다.
