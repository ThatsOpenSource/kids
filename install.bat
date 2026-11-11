@echo off
cd /d %~dp0
echo KIDS Install
bun install
if not exist apps\server\.env copy .env.example apps\server\.env
docker compose up -d
echo Waiting for Postgres to become healthy...
:waitloop
docker inspect --format="{{.State.Health.Status}}" kids-postgres 2>nul | findstr /C:"healthy" >nul
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto waitloop
)
echo Postgres ready.
cd apps\server
bunx prisma generate
bunx prisma db push --accept-data-loss
bun src/scripts/seedAdmin.ts
bun src/scripts/seedSchools.ts
cd ..\..
echo Fertig. Starte mit start.bat
pause