@echo off
cd /d "%~dp0"
echo Iniciando Memory Lab en http://localhost:3210 ...
start "" http://localhost:3210
node --no-warnings server/server.js
pause
