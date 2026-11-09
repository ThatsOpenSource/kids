@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  KIDS - Installation
echo ========================================
echo.

where bun >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Bun not found. Install from https://bun.sh then re-run this script.
  exit /b 1
)

where docker >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker not found. Install Docker Desktop and ensure it is running.
  exit /b 1
)

echo [1/6] bun install ...
call bun install
if errorlevel 1 (
  echo [ERROR] bun install failed.
  exit /b 1
)

if not exist "apps\server\.env" (
  echo [2/6] Creating apps\server\.env from .env.example ...
  if exist ".env.example" (
    copy /Y ".env.example" "apps\server\.env" >nul
  ) else (
    echo NODE_ENV=development> "apps\server\.env"
    echo PORT=7420>> "apps\server\.env"
    echo DATABASE_URL=postgres://kids:kids_secret@localhost:7432/kids>> "apps\server\.env"
    echo REDIS_URL=redis://localhost:6379>> "apps\server\.env"
    echo REDIS_ENABLED=false>> "apps\server\.env"
    echo JWT_ACCESS_SECRET=dev-access-secret-change-me-in-production-32chars>> "apps\server\.env"
    echo JWT_REFRESH_SECRET=dev-refresh-secret-change-me-in-production-32chars>> "apps\server\.env"
    echo ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef>> "apps\server\.env"
    echo CORS_ORIGIN=http://localhost:7430>> "apps\server\.env"
    echo LOG_DIR=./logs>> "apps\server\.env"
  )
) else (
  echo [2/6] apps\server\.env already exists - skipping
)

echo [3/6] Starting Postgres (Docker) ...
docker compose up -d
if errorlevel 1 (
  echo [ERROR] docker compose up failed. Is Docker Desktop running?
  exit /b 1
)

echo       Waiting for Postgres to become healthy ...
timeout /t 5 /nobreak >nul

echo [4/6] Prisma generate ...
pushd apps\server
call bunx prisma generate
if errorlevel 1 (
  echo [ERROR] prisma generate failed.
  popd
  exit /b 1
)

echo [5/6] Prisma db push ...
call bunx prisma db push
if errorlevel 1 (
  echo [ERROR] prisma db push failed. Check DATABASE_URL and that port 7432 is free for Docker Postgres.
  popd
  exit /b 1
)

echo [6/6] Seeding admin + sample school ...
call bun src/scripts/seedAdmin.ts
call bun src/scripts/seedSchools.ts
popd

echo.
echo ========================================
echo  Installation complete.
echo ========================================
echo  Login:  admin@kids.local
echo  Pass:   ChangeMeNow!23
echo.
echo  Start the app with:  start.bat
echo  UI:   http://localhost:7430
echo  API:  http://localhost:7420/health
echo ========================================
echo.
pause
endlocal
