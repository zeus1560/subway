import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 설정 파일
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* 테스트를 병렬로 실행할 최대 워커 수 */
  fullyParallel: true,
  /* CI에서 실패한 테스트를 재시도할 횟수 */
  retries: process.env.CI ? 2 : 0,
  /* 병렬 실행을 위한 워커 수 */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter 설정 */
  reporter: 'html',
  /* 공유 설정 */
  use: {
    /* 기본 타임아웃 */
    baseURL: 'http://localhost:4000',
    /* 각 액션의 타임아웃 */
    actionTimeout: 10000,
    /* 스크린샷 설정 */
    screenshot: 'only-on-failure',
    /* 비디오 설정 */
    video: 'retain-on-failure',
    /* 트레이스 설정 */
    trace: 'on-first-retry',
  },

  /* 테스트 프로젝트 설정 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 필요시 다른 브라우저 추가
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* 개발 서버 실행 설정 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

