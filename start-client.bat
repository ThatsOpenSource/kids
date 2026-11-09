@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Starting Client on http://localhost:7430 ...
call bun run dev:client
endlocal
