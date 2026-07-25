@echo off
cd /d "%~dp0"
start "Transforma Base 134" cmd /k "npm install && npm run dev"
timeout /t 5 /nobreak >nul
start http://localhost:3000
