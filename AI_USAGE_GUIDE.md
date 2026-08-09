# AI 사용 위치 및 작동 방식 가이드

이 문서는 프로젝트에서 AI가 실제로 사용되는 위치와 작동 방식을 설명합니다.

## 📍 AI가 사용되는 위치

### 1. 게시글 작성 시 - 자동 분석 (자동 실행)

**위치**: `/board/write` 페이지

**작동 시점**: 게시글 작성 후 "작성" 버튼 클릭 시

**파일**: 
- `app/board/write/page.tsx` → `lib/boardService.ts` → `lib/openaiService.ts`

**작동 흐름**:
```
1. 사용자가 게시글 작성 후 "작성" 버튼 클릭
   ↓
2. savePost() 함수 호출 (lib/boardService.ts)
   ↓
3. analyzePostWithAI() 함수 실행
   ↓
4. OpenAI API 호출 (lib/openaiService.ts)
   - 게시글 제목과 내용을 GPT-3.5-turbo에 전송
   - AI가 다음을 분석:
     * 요약 생성 (100자 이내)
     * 태그 추출 (역명, 노선, 시간대, 주제 등)
     * 부적절한 내용 감지 (욕설, 비방, 허위정보)
     * 감정 분석 (긍정/중립/부정)
     * 신뢰도 계산 (0.0-1.0)
   ↓
5. 분석 결과를 게시글에 저장
   - aiSummary: AI가 생성한 요약
   - aiTags: AI가 추출한 태그
   - aiConfidence: 신뢰도 점수
   ↓
6. 부적절한 내용이 감지되면 게시글 저장 거부
```

**확인 방법**:
1. 브라우저에서 `http://localhost:4000/board/write` 접속
2. 게시글 작성 (예: "오늘 2호선 강남역 출근 시간대 정말 혼잡했어요")
3. "작성" 버튼 클릭
4. 브라우저 개발자 도구 콘솔(F12)에서 API 호출 로그 확인
5. 게시글 목록에서 작성된 게시글 확인 → AI가 생성한 태그와 요약 확인

**코드 위치**:
```typescript
// lib/boardService.ts (55-64줄)
const aiAnalysis = await analyzePostWithAI(newPost);
newPost.aiSummary = aiAnalysis.summary;
newPost.aiTags = aiAnalysis.tags;
newPost.aiConfidence = aiAnalysis.confidence;

// 부적절한 내용 필터링
if (aiAnalysis.confidence < 0.5 || aiAnalysis.inappropriate) {
  throw new Error('부적절한 내용이 감지되었습니다.');
}
```

---

### 2. 열차 칸 추천 - AI 설명 생성 (자동 실행)

**위치**: 
- `/lines` 페이지 (열차 칸별 혼잡도)
- `/train-recommendation` 페이지 (AI 추천)

**작동 시점**: 역과 방향 선택 시 자동 실행

**파일**:
- `app/lines/page.tsx` → `lib/recommendation.ts` → `lib/openaiService.ts`
- `app/train-recommendation/page.tsx` → `lib/recommendation.ts` → `lib/openaiService.ts`

**작동 흐름**:
```
1. 사용자가 역과 방향 선택
   ↓
2. generateStationRecommendation() 함수 호출
   ↓
3. 칸별 혼잡도 데이터 수집
   ↓
4. generateAIInsight() 함수 실행
   ↓
5. OpenAI API 호출 (lib/openaiService.ts)
   - 역명, 노선, 추천 칸 번호, 칸별 혼잡도 정보를 GPT에 전송
   - AI가 다음을 생성:
     * 친절하고 실용적인 추천 설명 (50자 이내)
     * 예: "3칸과 7칸이 가장 여유롭습니다. 출입구 근처라 환승에도 편리해요."
   ↓
6. 생성된 설명을 화면에 표시
```

**확인 방법**:
1. 브라우저에서 `http://localhost:4000/lines` 접속
2. 역 선택 (예: 강남역, 2호선)
3. 방향 선택 (상행/하행)
4. "AI 추천" 배지가 있는 칸 확인
5. 하단에 AI가 생성한 설명 확인

**코드 위치**:
```typescript
// lib/recommendation.ts (254-268줄)
const aiInsight = await generateAIInsight(
  stationName,
  lineNum,
  direction,
  recommendedCars,
  trend,
  cars.map(c => ({
    carNumber: c.carNumber,
    congestionLevel: ...,
    percentage: c.congestionPercent,
  }))
);
```

---

### 3. 혼잡도 예측 설명 (준비됨, 아직 UI에 표시 안 됨)

**위치**: `/api/predict` API

**파일**: `lib/openaiService.ts`의 `generateCongestionPredictionInsight()`

**용도**: 혼잡도 예측 결과를 사용자 친화적으로 설명

**사용 예시**:
```typescript
const insight = await generateCongestionPredictionInsight(
  '강남역',
  '2호선',
  '보통',
  '혼잡',
  10 // 10분 후
);
// 결과: "10분 후 혼잡도가 증가할 예정입니다. 여유로운 칸을 선택하세요."
```

---

### 4. 경로 추천 설명 (준비됨, 아직 UI에 표시 안 됨)

**위치**: `/route` 페이지 (경로 찾기)

**파일**: `lib/openaiService.ts`의 `generateRouteRecommendationInsight()`

**용도**: 경로 추천 정보를 자연스러운 언어로 설명

**사용 예시**:
```typescript
const insight = await generateRouteRecommendationInsight(
  '강남역',
  '홍대입구역',
  {
    totalTime: 25,
    transfers: 1,
    congestionLevel: '보통'
  }
);
// 결과: "강남역에서 홍대입구역까지 약 25분 소요되며, 환승 1회가 필요합니다. 혼잡도는 보통 수준입니다."
```

---

## 🔄 작동 방식 (폴백 메커니즘)

모든 AI 기능은 **폴백(Fallback) 메커니즘**을 가지고 있습니다:

### API 키가 있을 때:
```
사용자 액션
  ↓
AI 함수 호출
  ↓
OpenAI API 호출 (GPT-3.5-turbo)
  ↓
AI 응답 받기
  ↓
결과 사용
```

### API 키가 없거나 실패할 때:
```
사용자 액션
  ↓
AI 함수 호출
  ↓
OpenAI API 호출 시도
  ↓
실패 감지 (키 없음 또는 네트워크 오류)
  ↓
기존 휴리스틱 방식으로 자동 전환
  ↓
결과 사용 (기능은 정상 작동)
```

**장점**:
- API 키가 없어도 앱이 정상 작동
- API 실패 시에도 사용자 경험 유지
- 점진적 개선 가능

---

## 🧪 테스트 방법

### 1. 게시글 AI 분석 테스트

```bash
# 브라우저에서
1. http://localhost:4000/board/write 접속
2. 제목: "오늘 2호선 강남역 출근 시간대 정말 혼잡했어요"
3. 내용: "아침 8시 30분쯤 강남역에서 탔는데, 사람이 정말 많았습니다. 특히 3호선 환승 통로가 막혀서 이동하기 어려웠어요."
4. 역: 강남역, 노선: 2호선 선택
5. "작성" 버튼 클릭
6. 개발자 도구 콘솔(F12) 확인 → OpenAI API 호출 로그 확인
7. 게시글 목록에서 작성된 게시글 확인 → AI 태그 확인
```

### 2. AI 추천 설명 테스트

```bash
# 브라우저에서
1. http://localhost:4000/lines 접속
2. 역 선택: 강남역
3. 노선: 2호선
4. 방향: 상행 또는 하행 선택
5. AI 추천 칸 확인 (상단에 "AI 추천" 배지)
6. 하단 설명 영역에서 AI가 생성한 설명 확인
7. 개발자 도구 콘솔에서 API 호출 로그 확인
```

### 3. API 키 없이 테스트

```bash
# .env.local 파일에서 OPENAI_API_KEY 제거 또는 주석 처리
# 서버 재시작
# 위 테스트 다시 실행
# → 기존 휴리스틱 방식으로 작동하는지 확인
```

---

## 📊 AI 사용 현황 확인

### 브라우저 개발자 도구에서 확인

1. **F12** 키로 개발자 도구 열기
2. **Console** 탭 선택
3. AI 기능 사용 시 다음 로그 확인:
   - `OpenAI API 호출 실패` → API 키 없음 또는 오류
   - `OpenAI API 호출 성공` → 정상 작동

### 네트워크 탭에서 확인

1. **Network** 탭 선택
2. **Filter**에 `openai` 입력
3. AI 기능 사용 시 API 호출 확인:
   - URL: `https://api.openai.com/v1/chat/completions`
   - Status: 200 (성공) 또는 401/429 (실패)

---

## 💡 AI가 생성하는 내용 예시

### 게시글 분석 예시

**입력**:
- 제목: "오늘 2호선 강남역 출근 시간대 정말 혼잡했어요"
- 내용: "아침 8시 30분쯤 강남역에서 탔는데, 사람이 정말 많았습니다."

**AI 출력**:
```json
{
  "summary": "강남역 출근 시간대 혼잡도가 높았던 경험을 공유하는 게시글입니다.",
  "tags": ["강남역", "2호선", "출근", "혼잡"],
  "confidence": 0.85,
  "inappropriate": false,
  "sentiment": "neutral"
}
```

### 추천 설명 예시

**입력**:
- 역: 강남역, 노선: 2호선
- 추천 칸: 3, 7칸
- 혼잡도: 3칸(여유 25%), 7칸(여유 30%)

**AI 출력**:
```
"3칸과 7칸이 가장 여유롭습니다. 출입구 근처라 환승에도 편리해요."
```

---

## 🔧 문제 해결

### AI가 작동하지 않을 때

1. **API 키 확인**:
   ```bash
   # .env.local 파일 확인
   OPENAI_API_KEY=sk-...
   ```

2. **서버 재시작**:
   ```bash
   npm run dev
   ```

3. **콘솔 로그 확인**:
   - 브라우저 개발자 도구에서 에러 메시지 확인

4. **네트워크 확인**:
   - OpenAI API 접근 가능한지 확인
   - 방화벽 설정 확인

### API 비용 걱정

- 모든 AI 기능은 **폴백 메커니즘**이 있어서 API 실패 시에도 정상 작동
- API 키를 제거하면 자동으로 기존 방식 사용
- 필요할 때만 API 키를 설정하여 사용 가능

---

## 📝 요약

| 기능 | 위치 | 자동/수동 | 폴백 |
|------|------|----------|------|
| 게시글 분석 | `/board/write` | 자동 | ✅ |
| 칸 추천 설명 | `/lines`, `/train-recommendation` | 자동 | ✅ |
| 혼잡도 예측 설명 | API 준비됨 | - | ✅ |
| 경로 추천 설명 | API 준비됨 | - | ✅ |

**핵심**: 모든 AI 기능은 **자동으로 실행**되며, API 키가 없어도 **기존 방식으로 정상 작동**합니다.

