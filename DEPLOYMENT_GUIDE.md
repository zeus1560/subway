# 배포된 사이트 확인 방법

## 🌐 배포된 사이트 접속 방법

### 방법 1: Vercel 대시보드에서 확인 (가장 쉬운 방법)

1. **Vercel 웹사이트 접속**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인 (zeus1560)

2. **프로젝트 선택**
   - 대시보드에서 `station1` 프로젝트 클릭
   - 또는 직접 URL: https://vercel.com/dashboard

3. **배포 URL 확인**
   - 프로젝트 페이지에서 "Domains" 또는 "Deployments" 탭 확인
   - Production 배포의 URL 확인
   - 예: `https://station1-xxxxx.vercel.app` 또는 커스텀 도메인

### 방법 2: 최근 성공한 배포 URL 사용

최근 성공한 배포 URL (5일 전):
- **프로덕션**: https://station1-dpq6kdc9i-ahn-seungjoos-projects.vercel.app
- **프로덕션 (12일 전)**: https://station1-ircamvsod-ahn-seungjoos-projects.vercel.app

> ⚠️ **주의**: 최신 코드가 반영되지 않았을 수 있습니다. 최신 배포를 위해 다시 배포가 필요할 수 있습니다.

### 방법 3: Vercel CLI로 확인

```bash
# 배포 목록 확인
vercel ls

# 프로덕션 URL 확인
vercel inspect <deployment-url>
```

### 방법 4: GitHub 저장소에서 확인

1. **GitHub 저장소 접속**
   - https://github.com/zeus1560/subway

2. **Settings → Pages 확인**
   - 저장소 Settings → Pages 메뉴
   - 배포된 URL 확인 (GitHub Pages 사용 시)

## 🔄 최신 코드로 재배포하기

최신 변경사항을 배포하려면:

```bash
# 프로덕션 배포
vercel --prod

# 또는 GitHub에 푸시하면 자동 배포 (연동된 경우)
git push origin main
```

## 📋 배포 상태 확인

### 성공한 배포
- ✅ 5일 전: `station1-dpq6kdc9i-ahn-seungjoos-projects.vercel.app` (Ready)
- ✅ 12일 전: `station1-ircamvsod-ahn-seungjoos-projects.vercel.app` (Ready)
- ✅ 15일 전: `station1-53bl4n9t2-ahn-seungjoos-projects.vercel.app` (Ready)

### 최근 배포 (2분 전)
- ❌ `station1-a14objb16-ahn-seungjoos-projects.vercel.app` (Error)

> 최근 배포가 실패했으므로, 최신 코드로 재배포가 필요합니다.

## 🚀 빠른 재배포

```bash
# 1. 최신 코드 확인
git pull origin main

# 2. 프로덕션 배포
vercel --prod

# 3. 배포 완료 후 URL 확인
vercel ls
```

## 💡 문제 해결

### 배포가 실패하는 경우

1. **빌드 로그 확인**
   ```bash
   vercel inspect <deployment-url> --logs
   ```

2. **로컬에서 빌드 테스트**
   ```bash
   npm run build
   ```

3. **환경 변수 확인**
   - Vercel 대시보드 → Settings → Environment Variables
   - 필요한 환경 변수가 설정되어 있는지 확인

### 배포는 성공했지만 사이트가 작동하지 않는 경우

1. **환경 변수 확인**
   - `NEXT_PUBLIC_SEOUL_API_KEY` 설정 확인
   - `OPENAI_API_KEY` 설정 확인 (AI 기능 사용 시)

2. **브라우저 콘솔 확인**
   - F12 → Console 탭에서 에러 확인

3. **네트워크 탭 확인**
   - F12 → Network 탭에서 API 호출 실패 확인

