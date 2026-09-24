"""
routers/pipeline.py - Sahayak Call Processing Pipeline API Router
==================================================================
Shirva Police Station - HPL 2026 PS 03

Exposes two endpoints that wire into the full call_pipeline.py flow:

  POST /api/pipeline/process
    - Accept: audio file upload (WAV/PCM) OR JSON with { transcript, callerPhone }
    - Runs full 4-step pipeline: IDENTIFY -> STT -> NLP -> DISPATCH
    - Returns JSON with decision, requestId, volunteer/112 info, IVR speech

  POST /api/pipeline/text
    - Lightweight: JSON body only { callerPhone, transcript, language }
    - Skips STT, runs NLP + Dispatch directly (for testing/demo)

  GET /api/pipeline/demo
    - Run a demo pipeline with a preset transcript (no audio needed)
    - Useful for integration tests

Both endpoints update the DB and broadcast SSE events to the dashboard.
"""

from fastapi import APIRouter, Request, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse
from typing import Optional

from call_pipeline import run_call_pipeline

router = APIRouter(prefix="/api/pipeline")


@router.post("/process")
async def process_call_with_audio(
    request: Request,
    callerPhone: str = Form(...),
    language: str = Form("Kannada"),
    callSid: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
):
    """
    Full pipeline endpoint for real telephony (Exotel/Twilio webhook).
    Accepts multipart form with callerPhone + optional WAV audio file.

    Steps:
      1. Identify caller in senior_citizens DB
      2. STT: audio bytes -> text (Google STT via speech_recognition)
      3. NLP: text -> triage (NLTK VADER + emergency lexicon)
      4. Dispatch: EMERGENCY -> 112 record + SSE | NORMAL -> volunteer assignment + SSE

    Returns:
      { success, decision, requestId, volunteer/erss112RefNo, location, responseSpeech, pipelineTrace }
    """
    audio_bytes = None
    if audio:
        audio_bytes = await audio.read()

    result = await run_call_pipeline(
        caller_phone=callerPhone,
        audio_bytes=audio_bytes,
        language_hint=language,
        call_sid=callSid,
        app=request.app,
    )
    status_code = 200 if result.get("success") else 422
    return JSONResponse(content=result, status_code=status_code)


@router.post("/text")
async def process_call_with_transcript(
    request: Request,
    body: dict = Body(...),
):
    """
    Text-only pipeline (skips STT - transcript provided directly).
    Useful for:
      - Exotel ASR callbacks (they return transcript, not audio)
      - Testing the NLP + dispatch logic without audio
      - Integration with 3rd-party STT services (Whisper, Bhashini, etc.)

    Request body (JSON):
      {
        "callerPhone": "+91 97410 88231",
        "transcript":  "I need blood pressure medicine urgently",
        "language":    "Kannada",    // optional
        "callSid":     "EX123456"   // optional
      }

    Returns:
      { success, decision, requestId, volunteer/erss112RefNo, location, responseSpeech, pipelineTrace }
    """
    caller_phone = body.get("callerPhone", "")
    transcript   = body.get("transcript", "").strip()
    language     = body.get("language", "Kannada")
    call_sid     = body.get("callSid")

    if not caller_phone or not transcript:
        return JSONResponse(
            content={"success": False, "error": "callerPhone and transcript are required."},
            status_code=400,
        )

    result = await run_call_pipeline(
        caller_phone=caller_phone,
        transcript=transcript,
        language_hint=language,
        call_sid=call_sid,
        app=request.app,
    )
    status_code = 200 if result.get("success") else 422
    return JSONResponse(content=result, status_code=status_code)


@router.get("/demo")
async def demo_pipeline(
    request: Request,
    scenario: str = "medicine",
    callerPhone: str = "+91 97410 88231",
):
    """
    Run a demo pipeline trace without real audio.
    Scenarios:
      medicine    -> "I need blood pressure medicine and insulin urgently"
      transport   -> "I need an auto to go to PHC hospital"
      groceries   -> "Can someone bring me rice and atta from the shop"
      emergency   -> "chest pain heart attack cannot breathe please help"
      emergency_kn -> "ede novide help kaapaadi"

    Returns full pipeline trace for the selected scenario.
    """
    SCENARIOS = {
        "medicine":      "I need blood pressure medicine and insulin urgently",
        "transport":     "I need an auto rickshaw to go to PHC hospital for doctor visit",
        "groceries":     "Can someone help me buy rice and cooking oil from the market",
        "emergency":     "chest pain heart attack cannot breathe please help ambulance",
        "emergency_kn":  "ede novide help kaapaadi ambulance beku hospital",
    }

    transcript = SCENARIOS.get(scenario, SCENARIOS["medicine"])

    result = await run_call_pipeline(
        caller_phone=callerPhone,
        transcript=transcript,
        language_hint="Kannada" if "kn" in scenario else "English",
        call_sid=f"DEMO-{scenario.upper()}",
        app=request.app,
    )
    return JSONResponse(content=result)
