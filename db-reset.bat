@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  KIDS - Reset database volume
echo  WARNING: Deletes all Postgres data!
echo ========================================
pause

docker compose down -v
docker compose up -d
timeout /t 5 /nobreak >nul

pushd apps\server
call bunx prisma db push
call bun src/scripts/seedAdmin.ts
call bun src/scripts/seedSchools.ts
popd

echo Done. Admin: admin@kids.local / ChangeMeNow!23
pause
endlocal
