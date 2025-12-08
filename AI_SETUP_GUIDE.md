# AI 모델 통합 가이드

이 프로젝트에 실제 AI 모델(OpenAI GPT)을 통합하는 방법을 안내합니다.

## 🚀 빠른 시작

### 1. OpenAI API 키 발급

1. [OpenAI Platform](https://platform.openai.com/) 접속
2. 계정 생성 및 로그인
3. [API Keys](https://platform.openai.com/api-keys) 페이지에서 새 키 생성
4. 생성된 API 키 복사 (한 번만 표시되므로 안전하게 보관)

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하거나 수정하여 다음 내용을 추가:

```bash
# OpenAI API 키
OPENAI_API_KEY=sk-your-api-key-here
```

**주의**: `.env.local` 파일은 Git에 커밋하지 마세요. (이미 `.gitignore`에 포함되어 있습니다)

### 3. 의존성 확인

`axios`가 이미 설치되어 있는지 확인:

```bash
npm list axios
```

없다면 설치:

```bash
npm install axios
```

### 4. 서버 재시작

환경 변수를 적용하려면 개발 서버를 재시작하세요:

```bash
npm run dev
```

## 📋 통합된 AI 기능

### 1. 게시글 분석 (`lib/openaiService.ts`)

**기능**: 게시글의 요약, 태그 추출, 부적절한 내용 감지

**사용 위치**: `lib/boardService.ts`의 `analyzePostWithAI()` 함수

**동작 방식**:
- OpenAI API 키가 설정되어 있으면 → GPT-3.5-turbo 사용
- API 키가 없거나 실패 시 → 기존 휴리스틱 방식으로 폴백

### 2. AI 추천 설명 생성 (`lib/openaiService.ts`)

**기능**: 칸별 혼잡도 정보를 바탕으로 친절한 추천 설명 생성

**사용 위치**: `lib/recommendation.ts`의 `generateAIInsight()` 함수

**동작 방식**:
- 혼잡도 데이터가 있으면 → GPT로 자연스러운 설명 생성
- API 실패 시 → 기존 규칙 기반 설명 사용

### 3. 혼잡도 예측 설명 (`lib/openaiService.ts`)

**기능**: 혼잡도 예측 결과를 사용자 친화적으로 설명

**함수**: `generateCongestionPredictionInsight()`

### 4. 경로 추천 설명 (`lib/openaiService.ts`)

**기능**: 경로 추천 정보를 자연스러운 언어로 설명

**함수**: `generateRouteRecommendationInsight()`

## 💰 비용 안내

### OpenAI API 요금제

- **GPT-3.5-turbo**: 
  - 입력: $0.50 / 1M 토큰
  - 출력: $1.50 / 1M 토큰
  - 대략 1,000개 요청당 $0.01-0.05 정도

- **무료 크레딧**: 신규 가입 시 $5 크레딧 제공 (약 1-2개월 무료 사용 가능)

### 비용 최적화 팁

1. **캐싱 활용**: 동일한 요청은 캐시하여 재사용
2. **짧은 프롬프트**: 불필요한 내용 제거
3. **배치 처리**: 여러 요청을 한 번에 처리
4. **폴백 전략**: API 실패 시 기존 방식 사용 (현재 구현됨)

## 🔧 고급 설정

### 다른 AI 모델 사용

`lib/openaiService.ts`의 `callOpenAI()` 함수에서 모델을 변경할 수 있습니다:

```typescript
// GPT-4 사용 (더 정확하지만 비용이 높음)
await callOpenAI(messages, 'gpt-4', 0.7);

// GPT-3.5-turbo 사용 (기본값, 비용 효율적)
await callOpenAI(messages, 'gpt-3.5-turbo', 0.7);
```

### 타임아웃 조정

API 호출 타임아웃을 조정하려면 `lib/openaiService.ts`에서 수정:

```typescript
timeout: 10000, // 10초 → 원하는 값으로 변경
```

### 온도(Temperature) 조정

- **낮은 값 (0.3)**: 더 일관되고 예측 가능한 응답 (게시글 분석에 적합)
- **높은 값 (0.7)**: 더 창의적이고 다양한 응답 (설명 생성에 적합)

## 🧪 테스트

### API 연결 테스트

터미널에서 다음 명령어로 테스트:

```bash
# Node.js REPL에서 테스트
node -e "
const { analyzePostWithOpenAI } = require('./lib/openaiService.ts');
analyzePostWithOpenAI('테스트 제목', '테스트 내용').then(console.log);
"
```

### 실제 기능 테스트

1. 게시글 작성 페이지에서 새 게시글 작성
2. 작성 후 저장 시 AI 분석이 자동으로 실행됨
3. 브라우저 콘솔에서 API 호출 로그 확인

## 🐛 문제 해결

### API 키가 인식되지 않을 때

1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 파일 이름이 정확한지 확인 (`.env.local` 또는 `.env`)
3. 서버 재시작 확인
4. 환경 변수 확인:
   ```bash
   # Windows PowerShell
   $env:OPENAI_API_KEY
   
   # Linux/Mac
   echo $OPENAI_API_KEY
   ```

### API 호출 실패 시

- **폴백 동작**: API 실패 시 자동으로 기존 휴리스틱 방식 사용
- **에러 로그**: 브라우저 콘솔에서 확인 가능
- **네트워크 문제**: 인터넷 연결 확인

### 비용 초과 시

- OpenAI 대시보드에서 사용량 확인
- 필요시 API 키 교체 또는 요금제 업그레이드
- 폴백 방식으로 자동 전환됨 (기능은 정상 작동)

## 📚 추가 리소스

- [OpenAI API 문서](https://platform.openai.com/docs)
- [OpenAI 가격 정책](https://openai.com/pricing)
- [Next.js 환경 변수 가이드](https://nextjs.org/docs/basic-features/environment-variables)

## ✅ 체크리스트

- [ ] OpenAI API 키 발급 완료
- [ ] `.env.local` 파일에 API 키 추가
- [ ] 개발 서버 재시작
- [ ] 게시글 작성 테스트
- [ ] AI 추천 설명 확인
- [ ] 비용 모니터링 설정

## 🎯 다음 단계

AI 기능이 정상 작동하면:

1. **더 많은 기능 추가**: 
   - 음성 인식 개선
   - 이미지 분석 (게시글 이미지)
   - 개인화 추천 강화

2. **성능 최적화**:
   - 응답 캐싱
   - 배치 처리
   - 스트리밍 응답

3. **모니터링**:
   - API 사용량 추적
   - 에러 로깅
   - 비용 알림 설정

