#!/bin/bash
# 제출용 ZIP 파일 생성 스크립트 (Linux/macOS)

echo "제출용 ZIP 파일 생성 중..."

# 현재 디렉토리 확인
CURRENT_DIR=$(pwd)
PROJECT_DIR="$CURRENT_DIR/station1"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "오류: station1 폴더를 찾을 수 없습니다."
    exit 1
fi

# ZIP 파일명 (날짜 포함)
DATE_STR=$(date +%Y%m%d)
ZIP_FILE_NAME="station1-submission-$DATE_STR.zip"
ZIP_PATH="$CURRENT_DIR/$ZIP_FILE_NAME"

# 임시 폴더 생성
TEMP_DIR=$(mktemp -d)
echo "임시 폴더: $TEMP_DIR"

echo "파일 복사 중..."

# 프로젝트 파일 복사 (제외 항목 제외)
cd "$PROJECT_DIR"
rsync -av --progress \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.vercel' \
    --exclude '.git' \
    --exclude 'coverage' \
    --exclude '*.log' \
    --exclude '.env.local' \
    --exclude '.env' \
    --exclude '*.zip' \
    --exclude 'Thumbs.db' \
    --exclude '.DS_Store' \
    --exclude '.vscode' \
    --exclude '.idea' \
    . "$TEMP_DIR/"

echo "ZIP 파일 생성 중..."

# 기존 ZIP 파일 삭제
if [ -f "$ZIP_PATH" ]; then
    rm "$ZIP_PATH"
fi

# ZIP 파일 생성
cd "$TEMP_DIR"
zip -r "$ZIP_PATH" . -q

# 임시 폴더 삭제
rm -rf "$TEMP_DIR"

# 파일 크기 확인
FILE_SIZE=$(du -h "$ZIP_PATH" | cut -f1)

echo ""
echo "✓ ZIP 파일 생성 완료!"
echo "  파일명: $ZIP_FILE_NAME"
echo "  크기: $FILE_SIZE"
echo "  위치: $ZIP_PATH"
echo ""
echo "제출 준비 완료!"

