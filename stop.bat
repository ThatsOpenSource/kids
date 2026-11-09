@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  KIDS - Stop
echo ========================================
echo.

echo Stopping Docker services (Postgres / optional Redis) ...
where docker >nul 2>&1
if errorlevel 1 (
  echo Docker not found - skip.
) else (
  docker compose stop
  echo Docker services stopped.
)

echo.
echo Note: Close the "KIDS-API" and "KIDS-UI" terminal windows
echo       if they are still open (Ctrl+C or close window).
echo.
pause
endlocal
