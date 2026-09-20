"""
routers/telephony.py
Real-world Twilio telephony integration for Sahayak Helpline.

Call flow:
  PSTN caller dials Twilio number
    → /api/twilio/incoming          (Twilio webhook, plays greeting TwiML)
    → /api/twilio/gather            (Twilio posts SpeechResult here)
         → pyttsx3 TTS response synthesised, saved to /tts-audio/<uuid>.wav
         → TwiML <Play> streams WAV back to caller
         → police console alerted via SSE (INCOMING_CALL event)
         → optional: outbound SMS/call to duty officer
    → /api/twilio/record-callback   (if using <Record> fallback)
    → /api/twilio/status-callback   (call state events: ringing, completed…)

Outbound calls:
    POST /api/twilio/call-senior  → initiate call from Twilio to senior
"""

import io
import os
import uuid
import asyncio
import tempfile
import logging
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, Request, Form, BackgroundTasks
from fastapi.responses import Response, JSONResponse
from dotenv import load_dotenv

load_dotenv()

# ── Twilio SDK ────────────────────────────────────────────────────────────────
try:
    from twilio.rest import Client as TwilioClient
    from twilio.request_validator import RequestValidator
    _TWILIO_SDK = True
except ImportError:
    _TWILIO_SDK = False
    logging.warning("[Telephony] twilio package not installed — outbound calls disabled.")

# ── Local services ─────────────────────────────────────────────────────────────
from voice_service import synthesize_speech_wav, speak_locally
from nlp_triage import triage_transcript
from database import (
    get_requests, log_audit, add_emergency_record, add_request,
    DB_PATH, EMERGENCY_KEYWORDS,
)
import aiosqlite

# ── Config ─────────────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID   = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN    = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER  = os.getenv("TWILIO_PHONE_NUMBER", "")
TWILIO_ALERT_NUMBER  = os.getenv("TWILIO_ALERT_NUMBER", "")
PUBLIC_BASE_URL      = os.getenv("PUBLIC_BASE_URL", "http://localhost:5000").rstrip("/")
STATION_NAME         = os.getenv("STATION_NAME", "Shirva Police Station")
DUTY_OFFICER_PHONE   = os.getenv("DUTY_OFFICER_PHONE", "")
VALIDATE_TWILIO_SIG  = os.getenv("VALIDATE_TWILIO_SIG", "false").lower() == "true"

# Directory where pyttsx3-synthesised WAV files are stored for Twilio to <Play>
if os.environ.get("VERCEL"):
    TTS_AUDIO_DIR = Path("/tmp/tts_audio")
else:
    TTS_AUDIO_DIR = Path(__file__).parent.parent / "tts_audio"
TTS_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(tags=["Telephony (Real-World Twilio)"])
log = logging.getLogger("sahayak.telephony")


# ── Twilio client (lazy) ───────────────────────────────────────────────────────
def _twilio_client() -> "TwilioClient | None":
    if not _TWILIO_SDK or not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        return None
    return TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


# ── Helpers ────────────────────────────────────────────────────────────────────
def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def _broadcast(app, event: str, data: dict):
    import json
    msg = {"event": event, "data": json.dumps(data)}
    for q in list(app.state.sse_clients):
        await q.put(msg)


def _validate_twilio_request(request: Request, body: dict) -> bool:
    """Validate that the POST truly came from Twilio (production safety)."""
    if not VALIDATE_TWILIO_SIG or not TWILIO_AUTH_TOKEN:
        return True  # Skip in dev / when sig validation is off
    validator = RequestValidator(TWILIO_AUTH_TOKEN)
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    return validator.validate(url, body, signature)


async def _lookup_senior(caller_phone: str) -> tuple[str, str]:
    """Return (senior_name, location) from DB, or sensible defaults."""
    async with aiosqlite.connect(DB_PATH) as db:
        reqs = await get_requests(db)
    known = next((r for r in reqs if r.get("seniorPhone") == caller_phone), None)
    if known:
        return known["seniorName"], known.get("location", "Shirva")
    return "Senior Citizen (Shirva Resident)", "Shirva, Udupi District"


async def _save_tts_wav(text: str, language: str = "en-IN", rate: int = 145) -> str:
    """
    Synthesise text with pyttsx3 → save as WAV in TTS_AUDIO_DIR.
    Returns the public URL Twilio can <Play>.
    """
    wav_bytes = await asyncio.to_thread(
        synthesize_speech_wav, text, language, rate, 1.0
    )
    filename = f"{uuid.uuid4().hex}.wav"
    filepath = TTS_AUDIO_DIR / filename
    filepath.write_bytes(wav_bytes)
    return f"{PUBLIC_BASE_URL}/tts-audio/{filename}"


def _twiml_say(text_en: str, text_kn: str = "") -> str:
    """Build TwiML that speaks both Kannada and English."""
    kn_block = (
        f'<Say voice="Polly.Aditi" language="kn-IN">{text_kn}</Say>'
        if text_kn else ""
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"{kn_block}"
        f'<Say voice="Polly.Aditi" language="en-IN">{text_en}</Say>'
        "</Response>"
    )


def _twiml_gather(action_url: str, hint: str = "") -> str:
    """
    TwiML that records speech for up to 15 s and posts result to action_url.
    Uses Twilio Enhanced STT (en-IN + kn-IN) automatically.
    Falls back to a <Record> verb after Gather times out.
    """
    hint_attr = f' hints="{hint}"' if hint else ""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        # Brief hold tone so pyttsx3 greeting can play before caller speaks
        '<Pause length="1"/>'
        f'<Gather input="speech" language="en-IN" speechTimeout="auto" '
        f'timeout="8" action="{action_url}" method="POST"{hint_attr}>'
        '<Say voice="Polly.Aditi" language="kn-IN">'
        "Namaskara. Shirva Police Sahayakke swagatha. "
        "Nimma samasye heLi, nava kshamavagi keluthiddene. "
        "Athava emergencyge 1 otti."
        "</Say>"
        '<Say voice="Polly.Aditi" language="en-IN">'
        "Welcome to Shirva Police Sahayak. Please speak your need clearly. "
        "Take your time. Or press 1 for immediate emergency."
        "</Say>"
        "</Gather>"
        # If no speech gathered → redirect to record fallback
        f'<Redirect method="POST">{PUBLIC_BASE_URL}/api/twilio/no-input</Redirect>'
        "</Response>"
    )


def _twiml_play(audio_url: str, follow_up: str = "") -> str:
    """TwiML that plays a WAV and optionally gathers further input."""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f'<Play>{audio_url}</Play>'
        f"{follow_up}"
        "<Pause length='2'/>"
        '<Say voice="Polly.Aditi" language="en-IN">'
        "Thank you. Help is on the way. Please stay safe. Goodbye."
        "</Say>"
        "<Hangup/>"
        "</Response>"
    )


# ── Twilio webhooks ───────────────────────────────────────────────────────────

@router.post("/api/twilio/incoming")
async def twilio_incoming(request: Request, background: BackgroundTasks):
    """
    Step 1 – Twilio calls this when a new call arrives.
    Responds with TwiML that greets the caller and opens a Gather.
    """
    form = await request.form()
    body = dict(form)

    if not _validate_twilio_request(request, body):
        return Response(content="Forbidden", status_code=403)

    caller_phone = body.get("From", "+91Unknown")
    call_sid     = body.get("CallSid", f"CALL-{int(datetime.now().timestamp()*1000)}")
    call_status  = body.get("CallStatus", "ringing")

    log.info(f"[Twilio] Incoming call from {caller_phone} | SID={call_sid} status={call_status}")

    # Look up known senior
    senior_name, location = await _lookup_senior(caller_phone)

    # Push RINGING event to police dashboard SSE
    app = request.app
    call_obj = {
        "callId": call_sid, "callerPhone": caller_phone,
        "seniorName": senior_name, "location": location,
        "status": "RINGING", "startedAt": _now(),
        "speechTranscript": "", "language": "Kannada",
        "dialedNumber": app.state.helpline.get("primaryNumber", TWILIO_PHONE_NUMBER),
        "source": "twilio-real",
    }
    app.state.current_call = call_obj
    await _broadcast(app, "INCOMING_CALL", call_obj)

    # Log to DB
    async with aiosqlite.connect(DB_PATH) as db:
        await log_audit(
            db, "TWILIO_CALL_RECEIVED",
            f"Real call from {caller_phone} ({senior_name}) | SID={call_sid}",
            "Twilio Gateway"
        )

    # Respond with gather TwiML
    gather_url = f"{PUBLIC_BASE_URL}/api/twilio/gather"
    hints = "emergency, help, medicine, fall, doctor, police, ambulance"
    twiml = _twiml_gather(gather_url, hint=hints)
    return Response(content=twiml, media_type="text/xml")


@router.post("/api/twilio/gather")
async def twilio_gather(request: Request, background: BackgroundTasks):
    """
    Step 2 – Twilio posts the SpeechResult here.
    Runs NLP triage, synthesises a pyttsx3 TTS response, serves it back via <Play>.
    """
    form = await request.form()
    body = dict(form)

    if not _validate_twilio_request(request, body):
        return Response(content="Forbidden", status_code=403)

    caller_phone  = body.get("From", "+91Unknown")
    call_sid      = body.get("CallSid", "")
    speech_result = body.get("SpeechResult", "").strip()
    confidence    = float(body.get("Confidence", 0.0))
    digits        = body.get("Digits", "").strip()

    log.info(f"[Twilio] SpeechResult from {caller_phone}: '{speech_result}' (conf={confidence:.2f})")

    app = request.app

    # ── Handle DTMF 1 = emergency shortcut ───────────────────────────────────
    if digits == "1" or any(kw in speech_result.lower() for kw in EMERGENCY_KEYWORDS):
        background.add_task(_handle_emergency_call, app, caller_phone, call_sid, speech_result)
        sos_twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response>"
            '<Say voice="Polly.Aditi" language="en-IN">'
            "Emergency detected. Alerting duty officer immediately. "
            "Please stay on the line. Help is on the way."
            "</Say>"
            "<Pause length='2'/>"
            '<Say voice="Polly.Aditi" language="kn-IN">'
            "Tumcha emergency nondagide. Duty officer ge alert maduttiddewe. "
            "Dayavittu linenalli iridiri."
            "</Say>"
            "<Pause length='2'/>"
            "<Hangup/>"
            "</Response>"
        )
        return Response(content=sos_twiml, media_type="text/xml")

    # ── If no speech detected, try again ─────────────────────────────────────
    if not speech_result:
        retry_twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response>"
            '<Say voice="Polly.Aditi" language="en-IN">'
            "I didn't catch that. Please speak your need clearly."
            "</Say>"
            f'<Gather input="speech" language="en-IN" speechTimeout="auto" '
            f'timeout="8" action="{PUBLIC_BASE_URL}/api/twilio/gather" method="POST">'
            "</Gather>"
            '<Say voice="Polly.Aditi" language="en-IN">Thank you. Goodbye.</Say>'
            "<Hangup/>"
            "</Response>"
        )
        return Response(content=retry_twiml, media_type="text/xml")

    # ── NLP triage ────────────────────────────────────────────────────────────
    senior_name, location = await _lookup_senior(caller_phone)
    # Prepend context to transcript so triage has full picture
    enriched = f"{speech_result} (Caller: {senior_name}, Location: {location})"
    triage = await asyncio.to_thread(
        triage_transcript,
        enriched,
        "Kannada",  # default; caller language detected from Twilio header if needed
    )

    response_text  = triage.get("responseSpeech", "Thank you for calling. Help is being arranged.")
    priority       = triage.get("priority", "MEDIUM")
    category       = triage.get("category", "GENERAL")
    needs_dispatch = triage.get("dispatchNeeded", False)

    # ── Update police dashboard ───────────────────────────────────────────────
    call_update = {
        **(app.state.current_call or {}),
        "status": "PROCESSING",
        "speechTranscript": speech_result,
        "triageResult": triage,
    }
    app.state.current_call = call_update
    await _broadcast(app, "CALL_SPEECH_PROCESSED", call_update)

    # ── Synthesise pyttsx3 TTS response (served as public WAV) ───────────────
    audio_url = None
    try:
        audio_url = await _save_tts_wav(response_text, language="en-IN", rate=145)
        log.info(f"[Twilio] pyttsx3 audio ready: {audio_url}")
    except Exception as e:
        log.warning(f"[Twilio] pyttsx3 synthesis failed: {e} — falling back to Polly")

    # ── Speak on station console too (background) ─────────────────────────────
    console_text = (
        f"Incoming call from {senior_name} at {location}. "
        f"Category: {category}. Priority: {priority}. "
        f"Caller said: {speech_result[:120]}"
    )
    background.add_task(asyncio.to_thread, speak_locally, console_text, 160, 1.0)

    # ── Dispatch / alert if needed ────────────────────────────────────────────
    if needs_dispatch or priority in ("HIGH", "CRITICAL"):
        background.add_task(_alert_duty_officer, caller_phone, senior_name, location, speech_result, priority)

    # ── Save to DB ────────────────────────────────────────────────────────────
    async with aiosqlite.connect(DB_PATH) as db:
        await log_audit(
            db, "TWILIO_CALL_TRIAGED",
            f"Call from {caller_phone} — '{speech_result[:80]}' "
            f"| Category={category} Priority={priority}",
            "Twilio/NLP Triage"
        )
        if priority in ("HIGH", "CRITICAL") or needs_dispatch:
            # Also create a service request record so it shows on the dashboard
            await add_request(db, {
                "seniorName": senior_name,
                "seniorPhone": caller_phone,
                "location": location,
                "language": "Kannada",
                "category": category,
                "urgency": "CRITICAL_112" if priority == "CRITICAL" else "HIGH",
                "description": speech_result,
                "status": "PENDING",
                "audioNotes": f"Twilio call SID={call_sid}",
            })
            await add_emergency_record(db, {
                "requestId": f"REQ-{int(datetime.now().timestamp()*1000)}",
                "seniorName": senior_name,
                "location": location,
                "reason": speech_result,
                "callerPhone": caller_phone,
                "escalatedBy": "Twilio/NLP Auto-Escalation",
            })

    # ── Build TwiML response ──────────────────────────────────────────────────
    if audio_url:
        # Use pyttsx3-synthesised WAV
        twiml = _twiml_play(audio_url)
    else:
        # Fallback to Twilio's Polly TTS
        safe_text = response_text.replace("&", "and").replace("<", "").replace(">", "")
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response>"
            f'<Say voice="Polly.Aditi" language="en-IN">{safe_text}</Say>'
            "<Pause length='2'/>"
            '<Say voice="Polly.Aditi" language="en-IN">'
            "Help is being arranged. Please stay safe. Goodbye."
            "</Say>"
            "<Hangup/>"
            "</Response>"
        )

    return Response(content=twiml, media_type="text/xml")


@router.post("/api/twilio/no-input")
async def twilio_no_input(request: Request):
    """Called when Gather gets no speech/DTMF — offer to try again or hang up."""
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        '<Say voice="Polly.Aditi" language="en-IN">'
        "We could not hear you. Please call back when you are ready. "
        "This is Shirva Police Sahayak helpline. We are always here to help. Goodbye."
        "</Say>"
        "<Hangup/>"
        "</Response>"
    )
    return Response(content=twiml, media_type="text/xml")


@router.post("/api/twilio/record-callback")
async def twilio_record_callback(request: Request, background: BackgroundTasks):
    """
    Fallback: Twilio posts the recording URL here after a <Record>.
    We download the WAV and process it through speech_recognition.
    """
    from voice_service import transcribe_audio_bytes

    form = await request.form()
    body = dict(form)

    caller_phone    = body.get("From", "+91Unknown")
    call_sid        = body.get("CallSid", "")
    recording_url   = body.get("RecordingUrl", "")
    recording_sid   = body.get("RecordingSid", "")

    log.info(f"[Twilio] Recording callback — {caller_phone} | rec={recording_sid}")

    if not recording_url:
        return JSONResponse({"error": "No recording URL provided"}, status_code=400)

    # Twilio recording URL needs .wav extension + authentication
    wav_url = recording_url if recording_url.endswith(".wav") else f"{recording_url}.wav"

    try:
        async with httpx.AsyncClient(auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=30) as client:
            resp = await client.get(wav_url)
            resp.raise_for_status()
            wav_bytes = resp.content

        transcript = await asyncio.to_thread(transcribe_audio_bytes, wav_bytes, "en-IN")
        log.info(f"[Twilio] Recording transcribed: '{transcript}'")

        # Reuse gather logic by calling our own endpoint
        # Push transcript to dashboard
        app = request.app
        call_update = {
            **(app.state.current_call or {}),
            "speechTranscript": transcript,
            "source": "twilio-recording",
        }
        app.state.current_call = call_update
        await _broadcast(app, "CALL_TRANSCRIPT_READY", call_update)

        triage = await asyncio.to_thread(
            triage_transcript,
            transcript,
            "Kannada",
        )
        response_text = triage.get("responseSpeech", "Thank you for calling. Help is being arranged.")
        audio_url = await _save_tts_wav(response_text)

        twiml = _twiml_play(audio_url)
    except Exception as e:
        log.error(f"[Twilio] record-callback error: {e}")
        twiml = (
            '<?xml version="1.0" encoding="UTF-8"?><Response>'
            '<Say voice="Polly.Aditi" language="en-IN">'
            "Thank you for calling. We received your message and will arrange help shortly."
            "</Say><Hangup/></Response>"
        )

    return Response(content=twiml, media_type="text/xml")


@router.post("/api/twilio/status-callback")
async def twilio_status_callback(request: Request):
    """Twilio posts call lifecycle events here (ringing, in-progress, completed)."""
    form = await request.form()
    body = dict(form)

    call_sid    = body.get("CallSid", "")
    call_status = body.get("CallStatus", "")
    caller      = body.get("From", "")
    duration    = body.get("CallDuration", "0")

    log.info(f"[Twilio] Status callback — {caller} | {call_status} | duration={duration}s")

    app = request.app
    if call_status in ("completed", "busy", "failed", "no-answer", "canceled"):
        async with aiosqlite.connect(DB_PATH) as db:
            await log_audit(
                db, f"TWILIO_CALL_{call_status.upper()}",
                f"Call {call_sid} from {caller} — status={call_status} duration={duration}s",
                "Twilio Status Webhook"
            )
        if app.state.current_call and app.state.current_call.get("callId") == call_sid:
            app.state.current_call["status"] = "ENDED"
            app.state.current_call["duration"] = duration
            await _broadcast(app, "CALL_ENDED", app.state.current_call)
            app.state.current_call = None

    # Always return 204 to Twilio
    return Response(status_code=204)


# ── Outbound call ─────────────────────────────────────────────────────────────

@router.post("/api/twilio/call-senior")
async def call_senior(request: Request):
    """
    Make an outbound call from Twilio to a senior citizen.
    Body: { "to": "+91XXXXXXXXXX", "message": "text to speak" }
    """
    if not _TWILIO_SDK:
        return JSONResponse({"error": "twilio SDK not installed"}, status_code=503)

    body = await request.json()
    to_number = body.get("to", "")
    message   = body.get("message", "Namaskara. This is Shirva Police Sahayak calling to check on you.")

    if not to_number:
        return JSONResponse({"error": "to number required"}, status_code=400)

    client = _twilio_client()
    if not client:
        return JSONResponse({"error": "Twilio credentials not configured"}, status_code=503)

    # Build TwiML URL — Twilio will GET this when the call connects
    # We use a data: URI trick with a hosted tiny TwiML
    twiml_xml = (
        '<?xml version="1.0" encoding="UTF-8"?><Response>'
        f'<Say voice="Polly.Aditi" language="en-IN">{message}</Say>'
        "<Pause length='2'/>"
        '<Say voice="Polly.Aditi" language="en-IN">'
        "This is a welfare check from Shirva Police Sahayak. If you need help, please call back at the helpline."
        "</Say>"
        "<Hangup/></Response>"
    )
    twiml_url = f"{PUBLIC_BASE_URL}/api/twilio/twiml-static"

    try:
        # Store message for the static TwiML endpoint
        request.app.state.outbound_twiml = twiml_xml
        call = client.calls.create(
            to=to_number,
            from_=TWILIO_PHONE_NUMBER,
            url=twiml_url,
            status_callback=f"{PUBLIC_BASE_URL}/api/twilio/status-callback",
            status_callback_method="POST",
        )
        async with aiosqlite.connect(DB_PATH) as db:
            await log_audit(db, "TWILIO_OUTBOUND_CALL",
                            f"Outbound call to {to_number} | SID={call.sid}",
                            "Duty Officer / Sahayak Dashboard")
        return {"success": True, "callSid": call.sid, "to": to_number}
    except Exception as e:
        log.error(f"[Twilio] Outbound call failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/twilio/twiml-static")
async def twiml_static(request: Request):
    """Dynamic TwiML served to outbound calls."""
    twiml = getattr(request.app.state, "outbound_twiml", None) or (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response><Say>Hello from Sahayak.</Say><Hangup/></Response>"
    )
    return Response(content=twiml, media_type="text/xml")


# ── Send SMS alert ─────────────────────────────────────────────────────────────

@router.post("/api/twilio/sms-alert")
async def send_sms_alert(request: Request):
    """
    Send an SMS alert via Twilio.
    Body: { "to": "+91XXXXXXXXXX", "message": "alert text" }
    """
    if not _TWILIO_SDK:
        return JSONResponse({"error": "twilio SDK not installed"}, status_code=503)

    body = await request.json()
    to_number = body.get("to", TWILIO_ALERT_NUMBER or DUTY_OFFICER_PHONE)
    message   = body.get("message", "Sahayak Alert")

    if not to_number:
        return JSONResponse({"error": "to number required"}, status_code=400)

    client = _twilio_client()
    if not client:
        return JSONResponse({"error": "Twilio credentials not configured"}, status_code=503)

    try:
        msg = client.messages.create(to=to_number, from_=TWILIO_PHONE_NUMBER, body=message)
        return {"success": True, "sid": msg.sid, "to": to_number}
    except Exception as e:
        log.error(f"[Twilio] SMS failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


# ── GET telephony status ───────────────────────────────────────────────────────

@router.get("/api/twilio/status")
async def twilio_status():
    """Returns current Twilio configuration status (no secrets exposed)."""
    return {
        "configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER),
        "twilioNumber": TWILIO_PHONE_NUMBER or "(not set)",
        "publicBaseUrl": PUBLIC_BASE_URL,
        "signatureValidation": VALIDATE_TWILIO_SIG,
        "sdkInstalled": _TWILIO_SDK,
        "ttsAudioDir": str(TTS_AUDIO_DIR),
        "dutyOfficerSmsEnabled": bool(DUTY_OFFICER_PHONE or TWILIO_ALERT_NUMBER),
    }


# ── Background helpers ─────────────────────────────────────────────────────────

async def _handle_emergency_call(app, caller_phone: str, call_sid: str, speech: str):
    """Escalate an emergency call: log, alert SSE, notify duty officer."""
    senior_name, location = await _lookup_senior(caller_phone)
    emergency = {
        "callId": call_sid, "callerPhone": caller_phone,
        "seniorName": senior_name, "location": location,
        "status": "EMERGENCY", "startedAt": _now(),
        "speechTranscript": speech,
        "priority": "CRITICAL", "source": "twilio-real",
    }
    app.state.current_call = emergency
    await _broadcast(app, "EMERGENCY_CALL", emergency)

    async with aiosqlite.connect(DB_PATH) as db:
        await log_audit(
            db, "EMERGENCY_CALL_ESCALATED",
            f"CRITICAL: {caller_phone} ({senior_name}) at {location} | '{speech[:80]}'",
            "Auto-Escalation Engine"
        )

    # Speak on console
    await asyncio.to_thread(
        speak_locally,
        f"EMERGENCY ALERT. {senior_name} at {location} needs immediate help. {speech[:100]}",
        180, 1.0
    )
    await _alert_duty_officer(caller_phone, senior_name, location, speech, "CRITICAL")


async def _alert_duty_officer(caller_phone, senior_name, location, speech, priority):
    """Send SMS (and optionally call) the duty officer for HIGH/CRITICAL events."""
    client = _twilio_client()
    if not client:
        return
    alert_to = DUTY_OFFICER_PHONE or TWILIO_ALERT_NUMBER
    if not alert_to:
        log.warning("[Twilio] Duty officer phone not configured — skipping SMS alert")
        return

    sms_body = (
        f"[SAHAYAK {priority}] {STATION_NAME}\n"
        f"Caller: {senior_name} ({caller_phone})\n"
        f"Location: {location}\n"
        f"Said: \"{speech[:120]}\"\n"
        "Respond immediately."
    )
    try:
        msg = client.messages.create(to=alert_to, from_=TWILIO_PHONE_NUMBER, body=sms_body)
        log.info(f"[Twilio] Duty officer SMS sent: {msg.sid}")
    except Exception as e:
        log.error(f"[Twilio] SMS alert failed: {e}")
