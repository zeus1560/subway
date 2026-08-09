// OpenAI API 서비스
// 실제 AI 모델을 사용하여 게시글 분석, 추천 설명 생성 등을 수행

import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// OpenAI API 호출 헬퍼 함수
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-3.5-turbo',
  temperature: number = 0.7
): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API 키가 설정되지 않았습니다. 환경 변수 OPENAI_API_KEY를 설정하세요.');
    return null;
  }

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model,
        messages,
        temperature,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10초 타임아웃
      }
    );

    return response.data.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('OpenAI API 호출 실패:', error.response?.data || error.message);
    return null;
  }
}

// 게시글 분석 (요약, 태그 추출, 부적절한 내용 감지)
export async function analyzePostWithOpenAI(
  title: string,
  content: string
): Promise<{
  summary: string;
  tags: string[];
  confidence: number;
  inappropriate: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
}> {
  const prompt = `다음 지하철 관련 게시글을 분석해주세요.

제목: ${title}
내용: ${content}

다음 형식으로 JSON 응답을 해주세요:
{
  "summary": "게시글의 핵심 내용을 100자 이내로 요약",
  "tags": ["태그1", "태그2", "태그3"],
  "inappropriate": false,
  "sentiment": "positive|neutral|negative",
  "confidence": 0.0-1.0
}

부적절한 내용(욕설, 비방, 허위정보 등)이 있으면 inappropriate를 true로 설정하세요.
태그는 게시글의 주요 키워드(역명, 노선, 시간대, 주제 등)를 포함하세요.`;

  const messages = [
    {
      role: 'system',
      content: '당신은 지하철 관련 게시글을 분석하는 AI 어시스턴트입니다. 한국어로 응답하고, JSON 형식을 정확히 지켜주세요.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callOpenAI(messages, 'gpt-3.5-turbo', 0.3);

  if (!response) {
    // API 실패 시 기본값 반환
    return {
      summary: content.length > 100 ? content.substring(0, 100) + '...' : content,
      tags: [],
      confidence: 0.5,
      inappropriate: false,
    };
  }

  try {
    // JSON 파싱 시도
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || content.substring(0, 100),
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        confidence: parsed.confidence || 0.8,
        inappropriate: parsed.inappropriate || false,
        sentiment: parsed.sentiment,
      };
    }
  } catch (error) {
    console.error('JSON 파싱 실패:', error);
  }

  // 파싱 실패 시 기본값 반환
  return {
    summary: content.length > 100 ? content.substring(0, 100) + '...' : content,
    tags: [],
    confidence: 0.5,
    inappropriate: false,
  };
}

// AI 추천 설명 생성
export async function generateAIRecommendationInsight(
  stationName: string,
  lineNum: string,
  recommendedCars: number[],
  congestionData: {
    carNumber: number;
    congestionLevel: string;
    percentage: number;
  }[]
): Promise<string> {
  const congestionInfo = congestionData
    .map((car) => `${car.carNumber}칸: ${car.congestionLevel} (${car.percentage}%)`)
    .join(', ');

  const prompt = `서울 지하철 ${lineNum}호선 ${stationName}역의 혼잡도 정보를 바탕으로 사용자에게 친절하고 실용적인 추천 설명을 작성해주세요.

추천 칸: ${recommendedCars.join(', ')}칸
칸별 혼잡도: ${congestionInfo}

다음 조건을 만족하는 짧고 명확한 설명을 작성해주세요:
- 50자 이내로 간결하게
- 실용적인 조언 포함
- 친근하고 도움이 되는 톤
- 한국어로 작성`;

  const messages = [
    {
      role: 'system',
      content: '당신은 지하철 혼잡도 정보를 바탕으로 사용자에게 유용한 조언을 제공하는 AI 어시스턴트입니다.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callOpenAI(messages, 'gpt-3.5-turbo', 0.7);

  if (!response) {
    // API 실패 시 기본 메시지 반환
    return `${recommendedCars.join(', ')}칸이 가장 여유롭습니다. 이 칸을 추천합니다.`;
  }

  return response.trim();
}

// 혼잡도 예측 설명 생성
export async function generateCongestionPredictionInsight(
  stationName: string,
  lineNum: string,
  currentCongestion: string,
  predictedCongestion: string,
  timeAhead: number = 10
): Promise<string> {
  const prompt = `서울 지하철 ${lineNum}호선 ${stationName}역의 혼잡도 예측 정보를 사용자에게 알기 쉽게 설명해주세요.

현재 혼잡도: ${currentCongestion}
${timeAhead}분 후 예상 혼잡도: ${predictedCongestion}

다음 조건을 만족하는 짧고 명확한 설명을 작성해주세요:
- 40자 이내로 간결하게
- 혼잡도 변화 추이 설명
- 실용적인 조언 포함
- 한국어로 작성`;

  const messages = [
    {
      role: 'system',
      content: '당신은 지하철 혼잡도 예측 정보를 사용자에게 알기 쉽게 설명하는 AI 어시스턴트입니다.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callOpenAI(messages, 'gpt-3.5-turbo', 0.7);

  if (!response) {
    // API 실패 시 기본 메시지 반환
    if (currentCongestion === predictedCongestion) {
      return `현재와 ${timeAhead}분 후 혼잡도가 비슷합니다.`;
    } else if (predictedCongestion === '혼잡' || predictedCongestion === '매우 혼잡') {
      return `${timeAhead}분 후 혼잡도가 증가할 예정입니다. 여유로운 칸을 선택하세요.`;
    } else {
      return `${timeAhead}분 후 혼잡도가 완화될 예정입니다.`;
    }
  }

  return response.trim();
}

// 경로 추천 설명 생성
export async function generateRouteRecommendationInsight(
  startStation: string,
  endStation: string,
  routeInfo: {
    totalTime: number;
    transfers: number;
    congestionLevel: string;
  }
): Promise<string> {
  const prompt = `서울 지하철 경로 추천 정보를 사용자에게 친절하게 설명해주세요.

출발역: ${startStation}
도착역: ${endStation}
소요 시간: ${routeInfo.totalTime}분
환승 횟수: ${routeInfo.transfers}회
혼잡도: ${routeInfo.congestionLevel}

다음 조건을 만족하는 짧고 명확한 설명을 작성해주세요:
- 60자 이내로 간결하게
- 경로의 장단점을 균형있게 설명
- 실용적인 조언 포함
- 한국어로 작성`;

  const messages = [
    {
      role: 'system',
      content: '당신은 지하철 경로 추천 정보를 사용자에게 친절하게 설명하는 AI 어시스턴트입니다.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await callOpenAI(messages, 'gpt-3.5-turbo', 0.7);

  if (!response) {
    // API 실패 시 기본 메시지 반환
    return `${startStation}에서 ${endStation}까지 ${routeInfo.totalTime}분 소요됩니다. 환승 ${routeInfo.transfers}회 필요합니다.`;
  }

  return response.trim();
}

