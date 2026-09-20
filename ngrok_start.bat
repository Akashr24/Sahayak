@echo off
REM ─── Sahayak — ngrok Public Tunnel Launcher ────────────────────────────────
REM Run this script BEFORE starting the backend so that Twilio webhooks work.
REM Prerequisites: ngrok installed (https://ngrok.com/download) and auth token set.
REM
REM Usage:
REM   1. Double-click this file  OR  run from cmd:  ngrok_start.bat
REM   2. Copy the https:// URL that appears (e.g. https://xxxx.ngrok-free.app)
REM   3. Paste it as PUBLIC_BASE_URL in backend\.env
REM   4. In Twilio Console → Phone Numbers → your number → Voice → set:
REM        Incoming webhook: https://xxxx.ngrok-free.app/api/twilio/incoming
REM   5. Start the backend normally (start.bat or uvicorn)

echo ============================================
echo  Sahayak ngrok Tunnel
echo  Exposing localhost:5000 to the internet
echo ============================================
echo.

REM Check if ngrok is available
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] ngrok not found in PATH.
    echo Download it from: https://ngrok.com/download
    echo Then run: ngrok config add-authtoken YOUR_TOKEN
    pause
    exit /b 1
)

echo Starting ngrok tunnel on port 5000...
echo After it starts, copy the https URL and paste into backend\.env as PUBLIC_BASE_URL
echo Then set it in Twilio Console ^> Phone Numbers ^> Voice webhook
echo.
ngrok http 5000 --log=stdout
