# 제출용 ZIP 파일 생성 스크립트 (Windows PowerShell)

Write-Host "제출용 ZIP 파일 생성 중..." -ForegroundColor Green

# 현재 디렉토리 확인
$currentDir = Get-Location

# package.json이 있으면 현재 디렉토리가 프로젝트 루트
if (Test-Path (Join-Path $currentDir "package.json")) {
    $projectDir = $currentDir
    $outputDir = Split-Path -Parent $currentDir
    Write-Host "프로젝트 폴더: $projectDir" -ForegroundColor Cyan
} else {
    Write-Host "오류: package.json을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host "      station1 폴더 안에서 이 스크립트를 실행하세요." -ForegroundColor Yellow
    exit 1
}

# ZIP 파일명 (날짜 포함)
$dateStr = Get-Date -Format "yyyyMMdd"
$zipFileName = "station1-submission-$dateStr.zip"
$zipPath = Join-Path $outputDir $zipFileName

# 임시 폴더 생성
$tempDir = Join-Path $env:TEMP "station1-submission"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "파일 복사 중..." -ForegroundColor Yellow

# robocopy를 사용하여 파일 복사 (제외 폴더 제외)
# robocopy는 더 빠르고 안정적이며 제외 옵션이 명확함
try {
    $robocopyArgs = @(
        "`"$projectDir`"",    # Source (따옴표로 경로 보호)
        "`"$tempDir`"",        # Destination
        "/E",                  # 하위 폴더 포함
        "/XD",                 # 디렉토리 제외
        "node_modules",
        ".next",
        ".vercel",
        ".git",
        "coverage",
        ".vscode",
        ".idea",
        "/XF",                 # 파일 제외
        "*.log",
        ".env.local",
        ".env",
        "*.zip",
        "Thumbs.db",
        ".DS_Store",
        "/NFL",                # 파일 목록 표시 안 함
        "/NDL",                # 디렉토리 목록 표시 안 함
        "/NJH",                # 작업 헤더 표시 안 함
        "/NJS"                 # 작업 요약 표시 안 함
    )

    $null = & robocopy @robocopyArgs 2>&1
    Write-Host "파일 복사 완료" -ForegroundColor Green
} catch {
    Write-Host "robocopy 사용 실패, 대체 방법 사용 중..." -ForegroundColor Yellow
    
    # 대체 방법: Get-ChildItem 사용
    Get-ChildItem -Path $projectDir -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $fullPath = $_.FullName
        $relativePath = $fullPath.Substring($projectDir.Length + 1)
        
        # 제외 목록 확인
        $excludePatterns = @(
            "node_modules",
            ".next",
            ".vercel",
            ".git",
            "coverage",
            ".vscode",
            ".idea"
        )
        
        $excludeFiles = @(
            "*.log",
            ".env.local",
            ".env",
            "*.zip",
            "Thumbs.db",
            ".DS_Store"
        )
        
        $shouldExclude = $false
        
        # 폴더 제외 확인
        foreach ($pattern in $excludePatterns) {
            if ($relativePath -like "$pattern*" -or $relativePath -like "*\$pattern\*") {
                $shouldExclude = $true
                break
            }
        }
        
        # 파일 제외 확인
        if (-not $shouldExclude) {
            foreach ($pattern in $excludeFiles) {
                $filePattern = $pattern -replace '\*', '.*'
                if ($relativePath -match $filePattern) {
                    $shouldExclude = $true
                    break
                }
            }
        }
        
        return -not $shouldExclude
    } | ForEach-Object {
        $relativePath = $_.FullName.Substring($projectDir.Length + 1)
        $destPath = Join-Path $tempDir $relativePath
        
        if ($_.PSIsContainer) {
            if (-not (Test-Path $destPath)) {
                New-Item -ItemType Directory -Path $destPath -Force | Out-Null
            }
        } else {
            $destDir = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item $_.FullName -Destination $destPath -Force -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host "파일 복사 완료" -ForegroundColor Green
}

Write-Host "ZIP 파일 생성 중..." -ForegroundColor Yellow

# 기존 ZIP 파일 삭제
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# ZIP 파일 생성
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# 임시 폴더 삭제
Remove-Item $tempDir -Recurse -Force

# 파일 크기 확인
$fileSize = (Get-Item $zipPath).Length / 1MB
Write-Host ""
Write-Host "✓ ZIP 파일 생성 완료!" -ForegroundColor Green
Write-Host "  파일명: $zipFileName" -ForegroundColor Cyan
Write-Host "  크기: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
Write-Host "  위치: $zipPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "제출 준비 완료!" -ForegroundColor Green

