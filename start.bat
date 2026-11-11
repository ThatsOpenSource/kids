@echo off
cd /d %~dp0
docker compose up -d
start "KIDS-API" cmd /k "bun run dev:server"
start "KIDS-UI" cmd /k "bun run dev:client"
echo API: http://localhost:7420/health
echo UI:  http://localhost:7430
echo Login: admin@kids.local / ChangeMeNow!23
pause