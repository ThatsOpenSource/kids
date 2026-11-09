@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  KIDS - Start (dev)
echo ========================================
echo.

where bun >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Bun not found.
  exit /b 1
)

where docker >nul 2>&1
if errorlevel 1 (
  echo [WARN] Docker not in PATH - skipping container start.
) else (
  echo [1/3] Ensuring Postgres is up ...
  docker compose up -d
  timeout /t 2 /nobreak >nul
)

if not exist "apps\server\.env" (
  echo [ERROR] apps\server\.env missing. Run install.bat first.
  exit /b 1
)

echo [2/3] Starting API on :7420  (window: KIDS-API)
start "KIDS-API" cmd /k "cd /d "%~dp0" && bun run dev:server"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Client on :7430  (window: KIDS-UI)
start "KIDS-UI" cmd /k "cd /d "%~dp0" && bun run dev:client"

echo.
echo ========================================
echo  API:  http://localhost:7420/health
echo  UI:   http://localhost:7430
echo  Login: admin@kids.local / ChangeMeNow!23
echo.
echo  Close the KIDS-API / KIDS-UI windows to stop.
echo  Or run stop.bat to stop Docker services.
echo ========================================
echo.
endlocal
