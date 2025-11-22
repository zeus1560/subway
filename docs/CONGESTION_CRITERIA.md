# 혼잡도 기준 정의

## 📊 혼잡도 레벨 정의

서울 지하철 혼잡도 예측 서비스에서 사용하는 혼잡도 기준입니다.

### 기본 기준

- **정원 (Capacity)**: 1,000명 (지하철 차량 1량 기준)
- **계산 방식**: `혼잡도 비율 = 승차 인원 / 정원`

### 혼잡도 레벨 (4단계)

| 레벨 | 비율 | 승차 인원 | 색상 | 설명 |
|------|------|-----------|------|------|
| **여유** | < 30% | 0 ~ 299명 | 🟢 초록색 (#4CAF50) | 자리가 충분하고 편안함 |
| **보통** | 30% ~ 60% | 300 ~ 599명 | 🟡 노란색 (#FFC107) | 적당한 혼잡도, 서서 갈 수 있음 |
| **혼잡** | 60% ~ 80% | 600 ~ 799명 | 🟠 주황색 (#FF9800) | 자리가 부족하고 불편함 |
| **매우 혼잡** | ≥ 80% | ≥ 800명 | 🔴 빨간색 (#F44336) | 매우 붐비고 불편함 |

### 구현 위치

- **표준 함수**: `lib/api.ts`의 `calculateCongestionLevel()`
- **CSV 파싱**: `lib/csvParser.ts`의 `convertToHistoricalData()`
- **사용 위치**: 
  - 예측 API (`/api/predict`)
  - 경로 탐색 (`findLessCrowdedRoute`)
  - 실시간 혼잡도 조회 (`getStationCongestion`)

### 코드 예시

```typescript
// lib/api.ts
export const calculateCongestionLevel = (
  passengerCount: number, 
  capacity: number = 1000
): CongestionLevel => {
  const ratio = passengerCount / capacity;

  if (ratio < 0.3) {
    return { level: '여유', color: '#4CAF50', value: 1 };
  } else if (ratio < 0.6) {
    return { level: '보통', color: '#FFC107', value: 2 };
  } else if (ratio < 0.8) {
    return { level: '혼잡', color: '#FF9800', value: 3 };
  } else {
    return { level: '매우 혼잡', color: '#F44336', value: 4 };
  }
};
```

### 참고 사항

- 정원 1,000명은 일반적인 지하철 차량 기준입니다.
- 실제 차량 정원은 노선/차량 종류에 따라 다를 수 있습니다.
- CSV 데이터의 승차 인원을 기준으로 혼잡도를 계산합니다.
- 예측 알고리즘은 이 기준을 사용하여 미래 혼잡도를 예측합니다.

---

**최종 업데이트**: 2024년 12월

