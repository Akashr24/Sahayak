"""
main.py — Sahayak Community Assistance Platform
FastAPI Backend (Python) — Port 5000
Shirva Police Station PS 03 · HPL 2026

Replaces the former Node.js/Express server.js
Run with:  uvicorn main:app --host 0.0.0.0 --port 5000 --reload
"""

import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load .env before anything else so routers see the env vars
load_dotenv(Path(__file__).parent / ".env")

from database import init_db, SHIRVA_LOCATIONS
from routers import health, location, calls, requests, volunteers, seniors
from routers import telephony


#  Helpline configuration 
HELPLINE_CONFIG = {
    "primaryNumber": "+91 80 4725 0112",
    "tollFree":      "1800-889-0112",
    "stationDesk":   "0820-2554112",
    "provider":      "Sahayak Telephony Gateway (Shirva Police Control Room)",
}


#  App lifespan (startup / shutdown) 
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()

    # Shared mutable state (equivalent to JS module-level vars in server.js)
    app.state.helpline        = HELPLINE_CONFIG
    app.state.shirva_locations= SHIRVA_LOCATIONS
    app.state.current_call    = None          # active call object (RINGING / ANSWERED)
    app.state.sse_clients     = []            # list of asyncio.Queue for SSE fans-out

    public_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:5000")
    twilio_ok  = bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"))
    print("=================================================")
    print(" Sahayak Backend API Server Running on Port 5000")
    print(" Connected to SQLite Database: database/sahayak.db")
    print(" Runtime: Python / FastAPI / uvicorn")
    print(" Live Location Radar API: /api/location/track-by-number")
    print(f" Senior Citizen Helpline: {HELPLINE_CONFIG['primaryNumber']}"
          f" | Toll-Free: {HELPLINE_CONFIG['tollFree']}")
    print(f" Public URL (Twilio webhooks): {public_url}")
    print(f" Twilio configured: {'[OK]' if twilio_ok else '[NO] -- set TWILIO_* in .env'}")
    print(f" Twilio incoming webhook: {public_url}/api/twilio/incoming")
    print(" Interactive API Docs: http://localhost:5000/docs")
    print("=================================================")

    yield

    # Shutdown — nothing to close (aiosqlite connections are per-request)
    print("[Sahayak] Backend shutting down.")


#  FastAPI app 
app = FastAPI(
    title="Sahayak Community Assistance Platform API",
    description=(
        "REST API for the Sahayak senior citizen community assistance platform.\n\n"
        "**Shirva Police Station · HPL 2026 PS 03**\n\n"
        "Provides volunteer management, request dispatch, 112 emergency escalation, "
        "real-time SSE call streaming, voice triage, and live location radar."
    ),
    version="2.0.0",
    contact={
        "name":  "Shirva Police Station",
        "email": "sahayak@shirvapolice.gov.in",
    },
    lifespan=lifespan,
)

#  CORS (allow all origins — same policy as former Express server) 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Routers 
app.include_router(health.router,      tags=["Health & Stats"])
app.include_router(location.router,    tags=["Location & Maps"])
app.include_router(calls.router,       tags=["Calls & Voice"])
app.include_router(requests.router,    tags=["Requests"])
app.include_router(volunteers.router,  tags=["Volunteers"])
app.include_router(seniors.router,     tags=["Senior Citizens"])
app.include_router(telephony.router)   # Real-world Twilio telephony

# Serve pyttsx3-synthesised TTS WAVs so Twilio's <Play> can fetch them
_TTS_AUDIO_DIR = Path(__file__).parent / "tts_audio"
_TTS_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/tts-audio", StaticFiles(directory=str(_TTS_AUDIO_DIR)), name="tts-audio")


#  Root redirect to docs 
@app.get("/", include_in_schema=False)
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


#  Dev entry point 
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
