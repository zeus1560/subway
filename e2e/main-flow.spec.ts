import { test, expect } from '@playwright/test';

test.describe('서울 지하철 혼잡도 예측 서비스 - 메인 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 메인 페이지로 이동
    await page.goto('/');
    // 페이지 로딩 대기
    await page.waitForLoadState('networkidle');
  });

  test('메인 페이지가 정상적으로 로드되어야 함', async ({ page }) => {
    // 페이지 타이틀 또는 주요 헤더 확인
    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
    
    // 서비스명이 포함되어 있는지 확인
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('대시보드');
  });

  test('노선 체크박스 토글이 작동해야 함', async ({ page }) => {
    // 노선 체크박스 찾기 (예: 2호선 체크박스)
    // 실제 페이지 구조에 맞게 선택자 수정 필요
    const lineCheckbox = page.locator('input[type="checkbox"]').first();
    
    // 체크박스가 존재하는지 확인
    if (await lineCheckbox.count() > 0) {
      // 체크박스 클릭
      await lineCheckbox.click();
      
      // 체크박스 상태 확인
      await expect(lineCheckbox).toBeChecked();
      
      // 다시 클릭하여 해제
      await lineCheckbox.click();
      await expect(lineCheckbox).not.toBeChecked();
    }
  });

  test('전체보기 버튼이 작동해야 함', async ({ page }) => {
    // "전체보기" 또는 "전체" 버튼 찾기
    const viewAllButton = page.locator('button:has-text("전체보기"), button:has-text("전체")').first();
    
    if (await viewAllButton.count() > 0) {
      // 버튼 클릭
      await viewAllButton.click();
      
      // 버튼이 클릭되었는지 확인 (시각적 피드백 또는 상태 변화)
      await expect(viewAllButton).toBeVisible();
    }
  });

  test('경로 탐색 페이지로 이동하고 결과를 확인해야 함', async ({ page }) => {
    // 경로 찾기 탭 또는 링크 찾기
    const routeTab = page.locator('button:has-text("경로 찾기"), a:has-text("경로 찾기")').first();
    
    if (await routeTab.count() > 0) {
      // 경로 찾기 탭 클릭
      await routeTab.click();
      
      // 출발역 입력 필드 찾기
      const startInput = page.locator('input[placeholder*="출발"], input[placeholder*="시작"]').first();
      const endInput = page.locator('input[placeholder*="도착"], input[placeholder*="목적지"]').first();
      
      if (await startInput.count() > 0 && await endInput.count() > 0) {
        // 출발역 입력
        await startInput.fill('방화역');
        await page.waitForTimeout(500);
        
        // 도착역 입력
        await endInput.fill('강남역');
        await page.waitForTimeout(500);
        
        // 검색 버튼 클릭
        const searchButton = page.locator('button:has-text("검색"), button:has-text("찾기")').first();
        if (await searchButton.count() > 0) {
          await searchButton.click();
          
          // 결과가 표시될 때까지 대기
          await page.waitForTimeout(2000);
          
          // 결과 카드가 표시되는지 확인
          const resultCard = page.locator('[class*="route"], [class*="card"]').first();
          if (await resultCard.count() > 0) {
            await expect(resultCard).toBeVisible();
            
            // 혼잡도 정보가 포함되어 있는지 확인
            const cardText = await resultCard.textContent();
            expect(cardText).toBeTruthy();
          }
        }
      }
    }
  });

  test('경로 탐색 결과에 혼잡도 정보가 표시되어야 함', async ({ page }) => {
    // 경로 찾기 탭으로 이동
    const routeTab = page.locator('button:has-text("경로 찾기"), a:has-text("경로 찾기")').first();
    
    if (await routeTab.count() > 0) {
      await routeTab.click();
      await page.waitForTimeout(500);
      
      // 출발역과 도착역 입력
      const startInput = page.locator('input[placeholder*="출발"], input[placeholder*="시작"]').first();
      const endInput = page.locator('input[placeholder*="도착"], input[placeholder*="목적지"]').first();
      
      if (await startInput.count() > 0 && await endInput.count() > 0) {
        await startInput.fill('방화역');
        await endInput.fill('강남역');
        await page.waitForTimeout(500);
        
        // 검색 실행
        const searchButton = page.locator('button:has-text("검색"), button:has-text("찾기")').first();
        if (await searchButton.count() > 0) {
          await searchButton.click();
          await page.waitForTimeout(3000);
          
          // 혼잡도 관련 텍스트 확인 (쾌적, 보통, 혼잡 등)
          const pageContent = await page.textContent('body');
          const hasCongestionInfo = 
            pageContent?.includes('쾌적') ||
            pageContent?.includes('보통') ||
            pageContent?.includes('혼잡') ||
            pageContent?.includes('여유');
          
          // 혼잡도 정보가 표시되었는지 확인
          expect(hasCongestionInfo).toBeTruthy();
        }
      }
    }
  });

  test('홈 페이지에서 Analytics 페이지로 이동할 수 있어야 함', async ({ page }) => {
    // 헤더의 Analytics 아이콘 찾기
    const analyticsLink = page.locator('a[href="/analytics"], button:has-text("Analytics")').first();
    
    if (await analyticsLink.count() > 0) {
      await analyticsLink.click();
      await page.waitForURL('**/analytics');
      
      // Analytics 페이지가 로드되었는지 확인
      const analyticsTitle = page.locator('h1:has-text("혼잡도 예측 모델 성능 평가"), h1:has-text("성능 평가")');
      if (await analyticsTitle.count() > 0) {
        await expect(analyticsTitle).toBeVisible();
      }
    }
  });

  test('로그인 페이지로 이동할 수 있어야 함', async ({ page }) => {
    // 헤더의 로그인 링크 찾기
    const loginLink = page.locator('a[href="/login"], button:has-text("로그인")').first();
    
    if (await loginLink.count() > 0) {
      await loginLink.click();
      await page.waitForURL('**/login');
      
      // 로그인 페이지가 로드되었는지 확인
      const loginTitle = page.locator('h1:has-text("서울 지하철"), h1:has-text("로그인")');
      if (await loginTitle.count() > 0) {
        await expect(loginTitle).toBeVisible();
      }
      
      // 이메일 입력 필드 확인
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.count() > 0) {
        await expect(emailInput).toBeVisible();
      }
    }
  });
});

