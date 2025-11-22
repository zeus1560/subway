# GitHub 업로드 가이드

## 단계별 업로드 방법

### 1단계: Git 저장소 초기화

```bash
cd station1
git init
```

### 2단계: 파일 추가

```bash
# 모든 파일 추가
git add .

# 또는 특정 파일만 추가하려면
git add package.json package-lock.json README.md .env.example subway_passengers.csv
git add app/ components/ lib/ public/ scripts/
```

### 3단계: 첫 커밋

```bash
git commit -m "Initial commit: 서울 지하철 혼잡도 앱 - 재현 가능한 버전"
```

### 4단계: GitHub 저장소 생성

1. GitHub 웹사이트 (https://github.com) 접속
2. 로그인
3. 우측 상단의 **+** 버튼 클릭 → **New repository** 선택
4. 저장소 이름 입력 (예: `seoul-subway-congestion-app`)
5. **Public** 또는 **Private** 선택
6. **README, .gitignore, license 추가하지 않기** (이미 있으므로)
7. **Create repository** 클릭

### 5단계: 원격 저장소 연결

GitHub에서 생성된 저장소의 URL을 복사한 후:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
```

예시:
```bash
git remote add origin https://github.com/yourusername/seoul-subway-congestion-app.git
```

### 6단계: 메인 브랜치 설정 및 푸시

```bash
git branch -M main
git push -u origin main
```

## 전체 명령어 한 번에 실행

```bash
cd station1
git init
git add .
git commit -m "Initial commit: 서울 지하철 혼잡도 앱 - 재현 가능한 버전"
git branch -M main
# 아래 명령어는 GitHub 저장소 생성 후 실행
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 주의사항

1. **`.env.local` 파일은 절대 커밋하지 마세요!**
   - `.gitignore`에 이미 포함되어 있지만, 확인하세요:
   ```bash
   git check-ignore .env.local
   ```

2. **필수 파일이 포함되는지 확인:**
   ```bash
   git ls-files | grep subway_passengers.csv
   git ls-files | grep .env.example
   ```

3. **커밋 전 상태 확인:**
   ```bash
   git status
   ```

## 문제 해결

### 이미 Git 저장소가 있는 경우
```bash
# 원격 저장소 확인
git remote -v

# 기존 원격 저장소 제거 (필요시)
git remote remove origin

# 새 원격 저장소 추가
git remote add origin https://github.com/<your-username>/<repo-name>.git
```

### 인증 오류가 발생하는 경우
- Personal Access Token 사용 필요
- GitHub Settings → Developer settings → Personal access tokens → Generate new token
- `repo` 권한 선택
- 토큰을 비밀번호 대신 사용

### 파일이 너무 큰 경우
- `subway_passengers.csv` 파일이 100MB 이상이면 Git LFS 사용 고려
- 또는 `.gitignore`에 추가하고 README에 다운로드 링크 제공

