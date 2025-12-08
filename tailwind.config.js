/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 기존 primary/secondary 유지
        primary: {
          DEFAULT: '#007AFF',
          dark: '#0A84FF',
        },
        secondary: {
          DEFAULT: '#5856D6',
          dark: '#5E5CE6',
        },
        // Core background & surface
        background: {
          DEFAULT: '#020617',   // 앱 전체 배경 (최상위)
          soft: '#020817',      // 살짝 떠 있는 영역
          elevated: '#0B1220',  // 카드/패널
        },
        // Text colors
        text: {
          strong: '#F9FAFB',   // 주요 텍스트
          muted: '#9CA3AF',    // 설명/보조 텍스트
          subtle: '#6B7280',   // 아주 약한 텍스트
        },
        // Primary / Accent
        brand: {
          primary: '#2563EB',  // 메인 액션, 주요 버튼
          primarySoft: '#1D4ED8',
          accent: '#8B5CF6',   // 포인트, 강조
          accentSoft: '#7C3AED',
        },
        // State colors
        state: {
          success: '#22C55E',
          warning: '#FACC15',
          danger: '#EF4444',
          info: '#38BDF8',
        },
        // Border / Divider
        border: {
          subtle: 'rgba(148, 163, 184, 0.4)',
          strong: 'rgba(148, 163, 184, 0.7)',
        },
        // Congestion (혼잡도 레벨)
        congestion: {
          free: '#22C55E',     // 여유
          normal: '#FACC15',   // 보통
          caution: '#FB923C',  // 주의
          crowded: '#EF4444',  // 혼잡
        },
        // Subway line colors
        line: {
          '1': '#0052A4',
          '2': '#00A84D',
          '3': '#EF7C1C',
          '4': '#00A5DE',
          '5': '#996CAC',
          '6': '#CD7C2F',
          '7': '#747F00',
          '8': '#E6186C',
          '9': '#BDB092',
        },
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '20px',
        'xl': '32px',
        '2xl': '48px',
      },
      borderRadius: {
        'card': '16px',      // 카드 공통
        'pill': '999px',     // 칩/버튼
      },
      boxShadow: {
        // 다크테마 기준, 너무 세지 않게
        'soft': '0 10px 25px rgba(15, 23, 42, 0.45)',
        'subtle': '0 4px 12px rgba(15, 23, 42, 0.35)',
      },
      fontSize: {
        // 텍스트 계층
        'title-1': ['28px', { lineHeight: '1.2', fontWeight: '700' }], // 큰 화면 제목
        'title-2': ['22px', { lineHeight: '1.3', fontWeight: '600' }], // 섹션 제목
        'body-1': ['16px', { lineHeight: '1.5' }],
        'body-2': ['14px', { lineHeight: '1.5' }],
        'caption': ['12px', { lineHeight: '1.4' }],
      },
      transitionDuration: {
        'fast': '120ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
