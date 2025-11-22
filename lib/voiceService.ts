// 음성 명령 서비스

export interface VoiceCommand {
  type: 'congestion' | 'route' | 'station' | 'help';
  station?: string;
  line?: string;
  action?: string;
}

// 음성 명령 인식 (간단한 키워드 기반)
export const recognizeVoiceCommand = (text: string): VoiceCommand | null => {
  // 공백 제거 및 소문자 변환
  const normalizedText = text.replace(/\s+/g, '').toLowerCase();
  const lowerText = text.toLowerCase();

  // 혼잡도 조회 - 더 유연한 패턴 매칭
  if (normalizedText.includes('혼잡도') || normalizedText.includes('혼잡') || 
      lowerText.includes('혼잡도') || lowerText.includes('혼잡')) {
    
    // 역명 패턴 (더 많은 역 지원)
    const stationPatterns = [
      /(강남|홍대|명동|서울역|시청|종로|을지로|사당|역삼|선릉|건대|고속터미널|이태원|잠실|동대문|왕십리|교대|약수|충무로|안국|경복궁|독립문|홍제|무악재|불광|연신내|구파발|지축|삼송|원흥|원당|화정|대곡|백석|마두|정발산|주엽|대화|성수|삼성|방배|서초|잠원|옥수|압구정|신사|동대입구|회현|동대문역사문화공원|신촌|이대|충정로|서대문|광화문|안암|고려대|월곡|상월곡|돌곶이|석계|태릉입구|화랑대|봉화산|신내|갈매|별내|퇴계원|사릉|금곡|평내호평|천마산|마석|대성리|청평|상천|가평|굴봉산|백양리|강촌|김유정|남춘천|춘천|방화|개화산|김포공항|송정|마곡|발산|우장산|화곡|신정|목동|오목교|양평|영등포구청|당산|합정|홍대입구|신촌|이대앞|충정로|서대문|광화문|안국|경복궁|독립문|홍제|무악재|불광|연신내|구파발|지축|삼송|원흥|원당|화정|대곡|백석|마두|정발산|주엽|대화)/;
    ];
    
    let matchedStation: string | null = null;
    for (const pattern of stationPatterns) {
      const match = normalizedText.match(pattern) || lowerText.match(pattern);
      if (match) {
        matchedStation = match[1];
        break;
      }
    }
    
    const lineMatch = normalizedText.match(/([1-9])호선/) || lowerText.match(/([1-9])호선/);

    if (matchedStation) {
      return {
        type: 'congestion',
        station: matchedStation,
        line: lineMatch ? lineMatch[1] : '2',
      };
    }
  }

  // 경로 조회 - 더 많은 키워드 지원
  if (normalizedText.includes('경로') || normalizedText.includes('루트') || 
      normalizedText.includes('가는길') || normalizedText.includes('길찾기') ||
      lowerText.includes('경로') || lowerText.includes('루트') || 
      lowerText.includes('가는길') || lowerText.includes('길찾기')) {
    return {
      type: 'route',
      action: '/route',
    };
  }

  // 역 검색 - 더 유연한 패턴
  if ((normalizedText.includes('역') || lowerText.includes('역')) && 
      (normalizedText.includes('검색') || normalizedText.includes('찾') || 
       lowerText.includes('검색') || lowerText.includes('찾'))) {
    return {
      type: 'station',
      action: '/stations',
    };
  }

  // 도움말
  if (normalizedText.includes('도움말') || normalizedText.includes('도와줘') || 
      normalizedText.includes('help') || lowerText.includes('도움말') || 
      lowerText.includes('도와줘') || lowerText.includes('help')) {
    return {
      type: 'help',
    };
  }

  return null;
};

// 음성 인식 시작
export const startVoiceRecognition = (
  onResult: (command: VoiceCommand | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    onError?.(new Error('브라우저 환경이 아닙니다.'));
    return () => {};
  }

  // SpeechRecognition API 확인
  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  
  if (!SpeechRecognition) {
    onError?.(new Error('음성 인식이 지원되지 않습니다. Chrome 또는 Edge 브라우저를 사용해주세요.'));
    return () => {};
  }

  const recognition = new SpeechRecognition();
  
  recognition.lang = 'ko-KR';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let hasResult = false;

  recognition.onresult = (event: any) => {
    hasResult = true;
    try {
      const transcript = event.results[0][0].transcript.trim();
      console.log('음성 인식 결과:', transcript);
      
      if (!transcript || transcript.length === 0) {
        onResult(null);
        return;
      }
      
      const command = recognizeVoiceCommand(transcript);
      console.log('인식된 명령:', command);
      onResult(command);
    } catch (error) {
      console.error('음성 인식 결과 처리 오류:', error);
      onError?.(new Error('음성 인식 결과를 처리하는 중 오류가 발생했습니다.'));
    }
  };

  recognition.onerror = (event: any) => {
    console.error('음성 인식 오류:', event.error);
    let errorMessage = '음성 인식 중 오류가 발생했습니다.';
    
    switch (event.error) {
      case 'no-speech':
        errorMessage = '음성이 감지되지 않았습니다. 다시 말해주세요.';
        break;
      case 'audio-capture':
        errorMessage = '마이크에 접근할 수 없습니다. 마이크 권한을 확인해주세요.';
        break;
      case 'not-allowed':
        errorMessage = '마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
        break;
      case 'network':
        errorMessage = '네트워크 오류가 발생했습니다.';
        break;
      case 'aborted':
        errorMessage = '음성 인식이 중단되었습니다.';
        break;
      default:
        errorMessage = `음성 인식 오류: ${event.error}`;
    }
    
    onError?.(new Error(errorMessage));
  };

  recognition.onend = () => {
    if (!hasResult) {
      // 결과가 없이 종료된 경우 (타임아웃 등)
      console.log('음성 인식이 종료되었습니다 (결과 없음)');
      onResult(null);
    }
  };

  try {
    recognition.start();
    console.log('음성 인식 시작');
  } catch (error) {
    console.error('음성 인식 시작 실패:', error);
    onError?.(new Error('음성 인식을 시작할 수 없습니다. 이미 실행 중일 수 있습니다.'));
  }

  return () => {
    try {
      recognition.stop();
      console.log('음성 인식 중지');
    } catch (error) {
      console.error('음성 인식 중지 실패:', error);
    }
  };
};


