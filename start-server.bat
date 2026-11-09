@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where docker >nul 2>&1
if not errorlevel 1 (
  docker compose up -d
)

if not exist "apps\server\.env" (
  echo Run install.bat first.
  exit /b 1
)

echo Starting API on http://localhost:7420 ...
call bun run dev:server
endlocal
