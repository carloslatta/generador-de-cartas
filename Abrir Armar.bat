@echo off
cd /d "%~dp0"
start "YGO Server" cmd /k node server.js
timeout /t 2 /nobreak >nul
start "" http://localhost:8080/armar.html