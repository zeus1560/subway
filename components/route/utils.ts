/**
 * 시간(분) 값을 안전하게 포맷팅하는 유틸 함수
 * NaN, undefined, null, string 등 모든 비정상 값을 "–"로 변환
 * 정상 값이면 "${time}분" 형식으로 출력
 */
export function formatMinutes(value: unknown): string {
  // null, undefined 체크
  if (value === null || value === undefined) {
    return "–";
  }
  
  // 문자열인 경우 처리
  if (typeof value === "string") {
    // 빈 문자열 체크
    if (value.trim() === "" || value === "NaN" || value.toLowerCase() === "nan") {
      return "–";
    }
    // 숫자 문자열인지 확인
    const parsed = parseFloat(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return "–";
    }
    const rounded = Math.round(parsed);
    return rounded >= 0 ? `${rounded}분` : "–";
  }
  
  // 숫자인 경우
  if (typeof value === "number") {
    // NaN 체크 (Number.isNaN 사용)
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return "–";
    }
    // 음수 체크
    if (value < 0) {
      return "–";
    }
    const rounded = Math.round(value);
    return `${rounded}분`;
  }
  
  // 기타 타입은 Number로 변환 시도
  const n = Number(value);
  if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
    return "–";
  }
  
  const rounded = Math.round(n);
  return `${rounded}분`;
}

