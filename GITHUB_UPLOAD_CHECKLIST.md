# GitHub 업로드 전 체크리스트

## ✅ 필수 확인 사항

### 1. Git에 포함되어야 할 파일
- [x] `.env.example` - 환경 변수 예제 파일
- [x] `subway_passengers.csv` - 필수 데이터 파일
- [x] `README.md` - 실행 가이드
- [x] `DEPLOYMENT_CHECKLIST.md` - 배포 체크리스트
- [x] `package.json` - 의존성 정보
- [x] `package-lock.json` - 의존성 버전 고정
- [x] 모든 소스 코드 파일

### 2. Git에 포함되면 안 되는 파일
- [x] `.env.local` - 개인 API 키 (`.gitignore`에 포함됨)
- [x] `node_modules/` - 의존성 패키지 (`.gitignore`에 포함됨)
- [x] `.next/` - 빌드 결과물 (`.gitignore`에 포함됨)

### 3. 최종 확인
```bash
# Git 상태 확인
git status

# .env.local이 제외되는지 확인
git check-ignore .env.local

# subway_passengers.csv가 포함되는지 확인
git ls-files | grep subway_passengers.csv

# .env.example이 포함되는지 확인
git ls-files | grep .env.example
```

## 🚀 GitHub 업로드 명령어

```bash
# 1. Git 저장소 초기화 (아직 안 했다면)
git init

# 2. 모든 파일 추가
git add .

# 3. 커밋
git commit -m "Initial commit: 서울 지하철 혼잡도 앱 - 재현 가능한 버전"

# 4. GitHub 저장소 생성 후 원격 저장소 추가
git remote add origin https://github.com/<your-username>/<repo-name>.git

# 5. 메인 브랜치로 푸시
git branch -M main
git push -u origin main
```

## 📝 README에 추가할 내용 (선택사항)

GitHub 저장소 설명에 다음을 추가하면 좋습니다:

```
서울 지하철 역별 실시간 혼잡도 정보를 제공하는 Next.js 웹 애플리케이션입니다.

## 빠른 시작

1. `git clone <repo-url>`
2. `cd station1`
3. `npm install`
4. `.env.example`을 복사하여 `.env.local` 생성 후 API 키 입력
5. `npm run dev`
6. http://localhost:4000 접속
```

## ⚠️ 주의사항

1. **API 키 보안**: `.env.local` 파일은 절대 커밋하지 마세요!
2. **CSV 파일 크기**: `subway_passengers.csv` 파일이 크다면 Git LFS를 사용하는 것을 고려하세요.
3. **공개 저장소**: 공개 저장소로 만들 경우 API 키 예제 값은 실제 키가 아닌지 확인하세요.

## ✅ 최종 검증

다른 사람이 받아서 실행할 수 있는지 테스트:

1. 임시 폴더에 클론
2. `npm install` 실행
3. `.env.local` 생성 및 API 키 입력
4. `npm run dev` 실행
5. http://localhost:4000 접속하여 정상 작동 확인

이 모든 단계가 성공하면 GitHub에 업로드해도 안전합니다!

