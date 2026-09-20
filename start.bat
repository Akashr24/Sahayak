@echo off
title Sahayak - Community Assistance Platform

echo =================================================
echo   SAHAYAK - Shirva Police Station (HPL 2026 PS 03)
echo   Community Senior Citizen Assistance Platform
echo =================================================
echo.

:: Kill any process already using port 5000 or 5173
echo [*] Checking for processes on ports 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 " 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [*] Ports cleared.
echo.

:: Start Python backend in a new window
echo [1] Starting Python Backend (FastAPI) on http://localhost:5000 ...
start "Sahayak Backend - Python FastAPI" cmd /k "cd /d c:\Sahayak\backend && set PYTHONUTF8=1 && uvicorn main:app --host 0.0.0.0 --port 5000 --reload"

:: Wait 3 seconds for backend to initialise before starting frontend
echo [*] Waiting for backend to start...
timeout /t 3 /nobreak >nul

:: Start React frontend in a new window
echo [2] Starting React Frontend (Vite) on http://localhost:5173 ...
start "Sahayak Frontend - React Vite" cmd /k "cd /d c:\Sahayak\frontend && npm run dev"

echo.
echo =================================================
echo   Both servers are starting in separate windows:
echo.
echo   Backend  ->  http://localhost:5000
echo   API Docs ->  http://localhost:5000/docs
echo   Frontend ->  http://localhost:5173
echo =================================================
echo.

:: Wait another 4 seconds then open the browser
echo [*] Opening browser in 4 seconds...
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo [*] Done! Close this window or the server windows to stop.
pause
