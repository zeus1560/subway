// 인증 서비스 (간단한 localStorage 기반, 실제로는 NextAuth 등 사용)

export interface User {
  id: string;
  email: string;
  name: string;
  type: 'personal' | 'company';
  companyId?: string;
  createdAt: Date;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

// 사용자 데이터 인터페이스 (비밀번호 포함)
interface UserData extends User {
  password: string;
}

// 회원가입
export const signup = async (email: string, password: string, name?: string): Promise<AuthSession> => {
  if (typeof window === 'undefined') {
    throw new Error('브라우저 환경에서만 사용 가능합니다.');
  }

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('올바른 이메일 형식이 아닙니다.');
  }

  // 비밀번호 검증 (최소 6자)
  if (!password || password.length < 6) {
    throw new Error('비밀번호는 최소 6자 이상이어야 합니다.');
  }

  const users = getUsers();
  
  // 이미 존재하는 이메일인지 확인
  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    throw new Error('이미 가입된 이메일입니다.');
  }

  // 새 사용자 생성
  const newUser: User = {
    id: `user_${Date.now()}`,
    email,
    name: name || email.split('@')[0],
    type: email.includes('@company.') ? 'company' : 'personal',
    createdAt: new Date(),
  };

  // 사용자 데이터 저장 (비밀번호 포함)
  const userData: UserData = {
    ...newUser,
    password, // 실제로는 해시화해야 하지만 여기서는 간단히 저장
  };
  users.push(userData);
  localStorage.setItem('users', JSON.stringify(users));

  // 세션 생성
  const session: AuthSession = {
    user: newUser,
    token: `token_${Date.now()}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
  };

  localStorage.setItem('auth_session', JSON.stringify(session));
  return session;
};

// 로그인 (간단한 구현)
export const login = async (email: string, password: string): Promise<AuthSession> => {
  if (typeof window === 'undefined') {
    throw new Error('브라우저 환경에서만 사용 가능합니다.');
  }

  // 실제로는 서버 API 호출
  // 여기서는 localStorage 기반 간단한 구현
  const users = getUsers();
  const userData = users.find((u) => u.email === email) as UserData | undefined;

  if (!userData) {
    throw new Error('가입되지 않은 이메일입니다. 회원가입을 먼저 해주세요.');
  }

  // 비밀번호 확인 (실제로는 해시 비교)
  if (userData.password !== password) {
    throw new Error('비밀번호가 일치하지 않습니다.');
  }

  // User 객체 생성 (비밀번호 제외)
  const user: User = {
    id: userData.id,
    email: userData.email,
    name: userData.name,
    type: userData.type,
    companyId: userData.companyId,
    createdAt: userData.createdAt,
  };

  const session: AuthSession = {
    user,
    token: `token_${Date.now()}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
  };

  localStorage.setItem('auth_session', JSON.stringify(session));
  return session;
};

// 소셜 로그인 (간단한 구현)
export const socialLogin = async (provider: 'google' | 'kakao' | 'naver'): Promise<AuthSession> => {
  // 실제로는 OAuth 플로우 구현
  const email = `${provider}_${Date.now()}@${provider}.com`;
  return login(email, '');
};

// 로그아웃
export const logout = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_session');
  // 로그아웃 후 전역 이벤트 발생
  window.dispatchEvent(new Event('auth-state-changed'));
};

// 현재 세션 조회
export const getCurrentSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null;

  try {
    const sessionStr = localStorage.getItem('auth_session');
    if (!sessionStr) return null;

    const session: AuthSession = JSON.parse(sessionStr);
    const expiresAt = new Date(session.expiresAt);

    // 만료 시간 체크 (7일 유지)
    if (expiresAt < new Date()) {
      // 만료된 세션은 자동으로 삭제
      localStorage.removeItem('auth_session');
      return null;
    }

    // 만료 시간이 1일 이내로 남았으면 자동 연장 (7일로 재설정)
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (expiresAt < oneDayFromNow) {
      const extendedSession: AuthSession = {
        ...session,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 연장
      };
      localStorage.setItem('auth_session', JSON.stringify(extendedSession));
      return extendedSession;
    }

    return session;
  } catch (error) {
    return null;
  }
};

// 현재 사용자 조회
export const getCurrentUser = (): User | null => {
  const session = getCurrentSession();
  return session?.user || null;
};

// 사용자 목록 조회 (내부용)
function getUsers(): UserData[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem('users') || '[]');
  } catch (error) {
    return [];
  }
}


