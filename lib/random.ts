// 재현 가능한 랜덤 함수 (seed 기반)
// 모든 랜덤성은 이 유틸리티를 통해 관리하여 재현 가능하도록 함

const SEED = 42; // 고정 시드 값

// 간단한 시드 기반 랜덤 생성기 (Linear Congruential Generator)
class SeededRandom {
  private seed: number;

  constructor(seed: number = SEED) {
    this.seed = seed;
  }

  // 0과 1 사이의 랜덤 값 생성
  random(): number {
    // LCG 알고리즘: (a * seed + c) % m
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // min과 max 사이의 랜덤 정수 생성
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // min과 max 사이의 랜덤 실수 생성
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  // 시드 재설정
  setSeed(seed: number): void {
    this.seed = seed;
  }

  // 현재 시드 가져오기
  getSeed(): number {
    return this.seed;
  }
}

// 전역 인스턴스 (기본 시드 42)
const globalRandom = new SeededRandom(SEED);

// 문자열 기반 시드 생성 (같은 문자열은 항상 같은 시드 생성)
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  return Math.abs(hash);
}

// 컨텍스트별 랜덤 생성기 (같은 컨텍스트는 항상 같은 시퀀스)
const contextRandomMap = new Map<string, SeededRandom>();

function getContextRandom(context: string): SeededRandom {
  if (!contextRandomMap.has(context)) {
    const contextSeed = stringToSeed(context) + SEED;
    contextRandomMap.set(context, new SeededRandom(contextSeed));
  }
  return contextRandomMap.get(context)!;
}

// 내보내기
export const random = {
  // 기본 랜덤 (0-1)
  random: () => globalRandom.random(),
  
  // 정수 랜덤 (min, max 포함)
  randomInt: (min: number, max: number) => globalRandom.randomInt(min, max),
  
  // 실수 랜덤 (min 포함, max 미포함)
  randomFloat: (min: number, max: number) => globalRandom.randomFloat(min, max),
  
  // 컨텍스트 기반 랜덤 (같은 컨텍스트는 같은 시퀀스)
  contextRandom: (context: string) => getContextRandom(context).random(),
  contextRandomInt: (context: string, min: number, max: number) => 
    getContextRandom(context).randomInt(min, max),
  contextRandomFloat: (context: string, min: number, max: number) => 
    getContextRandom(context).randomFloat(min, max),
  
  // 시드 재설정 (테스트용)
  setSeed: (seed: number) => globalRandom.setSeed(seed),
  
  // 시드 초기화
  reset: () => {
    globalRandom.setSeed(SEED);
    contextRandomMap.clear();
  },
};

