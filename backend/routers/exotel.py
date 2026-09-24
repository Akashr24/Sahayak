"""
routers/exotel.py — Exotel Indian Cloud Telephony Gateway for Sahayak.
Native Indian Telephony integration with +91 / 080 Virtual Numbers (Bengaluru, Karnataka).
Zero ISD requirements — seamlessly handles calls from Jio, Airtel, Vi, and BSNL.
"""

import os
import re
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path

import httpx
from fastapi import APIRouter, Request, Query, Form, BackgroundTasks
from fastapi.responses import JSONResponse, Response
import aiosqlite
from dotenv import load_dotenv

load_dotenv()

from utils import broadcast, _now, make_req_id, make_emg_id
from nlp_triage import triage_transcript
from voice_service import transcribe_audio_bytes, speak_locally
from database import (
    get_requests, get_volunteers, add_request, add_emergency_record,
    log_audit, update_request_assign, DB_PATH, EMERGENCY_KEYWORDS,
)

log = logging.getLogger("sahayak.exotel")

# ── Config ─────────────────────────────────────────────────────────────────────
EXOTEL_ACCOUNT_SID = os.getenv("EXOTEL_ACCOUNT_SID", "sahayakshirva")
EXOTEL_API_KEY     = os.getenv("EXOTEL_API_KEY", "")
EXOTEL_API_TOKEN   = os.getenv("EXOTEL_API_TOKEN", "")
EXOTEL_CALLER_ID   = os.getenv("EXOTEL_CALLER_ID", "08047250112")
EXOTEL_SUBDOMAIN   = os.getenv("EXOTEL_SUBDOMAIN", "api.exotel.com")
PUBLIC_BASE_URL    = os.getenv("PUBLIC_BASE_URL", "http://localhost:5000").rstrip("/")
STATION_NAME       = os.getenv("STATION_NAME", "Shirva Police Station")
DUTY_OFFICER_PHONE = os.getenv("DUTY_OFFICER_PHONE", "+919945594198")

router = APIRouter(prefix="/api/exotel", tags=["Exotel (India Cloud Telephony)"])


# ── Phone Number Normalizer for India ──────────────────────────────────────────
def normalize_indian_phone(phone: str) -> str:
    """Normalize 10-digit, 0-prefixed, or +91 Indian phone numbers to E.164 format."""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+91{digits[1:]}"
    if len(digits) == 10:
        return f"+91{digits}"
    return phone if phone.startswith("+") else f"+{digits}"


async def _lookup_senior(caller_phone: str) -> tuple[str, str]:
    """Look up senior citizen by phone in SQLite database."""
    async with aiosqlite.connect(DB_PATH) as db:
        reqs = await get_requests(db)
    clean_caller = normalize_indian_phone(caller_phone)
    known = next((r for r in reqs if normalize_indian_phone(r.get("seniorPhone", "")) == clean_caller), None)
    if known:
        return known["seniorName"], known.get("location", "Shirva, Udupi District")
    return "Senior Citizen (Shirva Resident)", "Shirva, Udupi District"


# ── Inbound Webhook (Exotel Passthru Applet) ───────────────────────────────────
@router.api_route("/incoming", methods=["GET", "POST"])
async def exotel_incoming(request: Request, background: BackgroundTasks):
    """
    Called by Exotel Passthru Applet when an incoming call arrives from an Indian mobile.
    Exotel passes CallSid, From, To, Digits, etc.
    """
    app = request.app
    if request.method == "POST":
        form = await request.form()
        params = dict(form)
    else:
        params = dict(request.query_params)

    caller_phone = params.get("From") or params.get("CallFrom") or "+91 99455 94198"
    call_sid     = params.get("CallSid") or f"EXO-{int(datetime.now().timestamp() * 1000)}"
    digits       = params.get("Digits", "").strip()
    norm_phone   = normalize_indian_phone(caller_phone)

    senior_name, location = await _lookup_senior(norm_phone)

    log.info(f"[Exotel] Incoming call from {norm_phone} ({senior_name}) | SID={call_sid} | Digits={digits}")

    # Update active call state & broadcast to police console via SSE
    call_obj = {
        "callId": call_sid,
        "callerPhone": norm_phone,
        "seniorName": senior_name,
        "location": location,
        "status": "RINGING",
        "startedAt": _now(),
        "speechTranscript": "",
        "language": "Kannada",
        "dialedNumber": EXOTEL_CALLER_ID,
        "source": "exotel-india",
    }
    app.state.current_call = call_obj
    await broadcast(app, "INCOMING_CALL", call_obj)

    async with aiosqlite.connect(DB_PATH) as db:
        await log_audit(
            db, "EXOTEL_CALL_RECEIVED",
            f"Indian incoming call from {norm_phone} ({senior_name}) | SID={call_sid}",
            "Exotel India Gateway"
        )

    # If DTMF 1 pressed (Emergency Shortcut)
    if digits == "1":
        emg_id = make_emg_id()
        emg_req = {
            "id": emg_id, "seniorName": senior_name, "seniorPhone": norm_phone,
            "location": location, "language": "Kannada",
            "category": "CRITICAL EMERGENCY (112)", "urgency": "CRITICAL_112",
            "description": f"Exotel IVR DTMF 1 Keypress Emergency Alert from {norm_phone}",
            "status": "ESCALATED_112", "escalatedTo112": True,
            "audioNotes": f"Exotel Call SID: {call_sid} — DTMF 1 Pressed by caller.",
        }
        async with aiosqlite.connect(DB_PATH) as db:
            await add_request(db, emg_req)
            await add_emergency_record(db, {
                "id": f"EMG-{int(datetime.now().timestamp() * 1000)}",
                "requestId": emg_id, "seniorName": senior_name, "location": location,
                "reason": "DTMF 1 Immediate Emergency Trigger",
                "callerPhone": norm_phone, "escalatedBy": "Exotel IVR Emergency Key",
                "policeStation": "Shirva PS", "status": "DISPATCHED",
            })
            await log_audit(db, "EMERGENCY_112_ESCALATED",
                            f"Exotel 112 Dispatch for {senior_name} at {location}. Key 1 pressed.",
                            "Exotel Safety Gate")

        await broadcast(app, "EMERGENCY_ALERT", emg_req)
        await broadcast(app, "REQUEST_CREATED", emg_req)

        # Notify police console speaker
        background.add_task(asyncio.to_thread, speak_locally,
                            f"Emergency alert. Exotel call from {senior_name}. 112 dispatched.", 160, 1.0)

        return JSONResponse({
            "status": "emergency_escalated",
            "action": "play_and_hangup",
            "say": "Emergency detected. Shirva Police and 112 have been alerted immediately.",
            "say_kn": "ತುರ್ತು ಪರಿಸ್ಥಿತಿ ದಾಖಲಾಗಿದೆ. ಶಿರ್ವಾ ಪೊಲೀಸ್ ಮತ್ತು 112 ತಕ್ಷಣ ರವಾನಿಸಲಾಗಿದೆ."
        })

    # Normal response: Instruct Exotel to continue with bilingual greeting & record
    return JSONResponse({
        "status": "success",
        "action": "gather_and_record",
        "record_callback_url": f"{PUBLIC_BASE_URL}/api/exotel/record-callback",
        "prompt_en": "Welcome to Shirva Police Sahayak helpline. Please speak your requirement clearly after the beep.",
        "prompt_kn": "ಶಿರ್ವಾ ಪೊಲೀಸ್ ಸಹಾಯಕ ಸಹಾಯವಾಣಿಗೆ ಸ್ವಾಗತ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಅಗತ್ಯವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ."
    })


# ── Recording Callback (Voice Processing & Triage) ───────────────────────────
@router.api_route("/record-callback", methods=["GET", "POST"])
async def exotel_record_callback(request: Request, background: BackgroundTasks):
    """
    Called by Exotel when caller voice recording finishes.
    Downloads audio, runs Speech-to-Text, executes NLTK emergency triage,
    and dispatches 112 or assigns free volunteers.
    """
    app = request.app
    if request.method == "POST":
        form = await request.form()
        params = dict(form)
    else:
        params = dict(request.query_params)

    caller_phone  = params.get("From") or params.get("CallFrom") or "+91 99455 94198"
    call_sid      = params.get("CallSid", "")
    recording_url = params.get("RecordingUrl", "").strip()
    norm_phone    = normalize_indian_phone(caller_phone)

    log.info(f"[Exotel] Recording received for {norm_phone} | URL={recording_url}")

    transcript = ""
    if recording_url:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(recording_url)
                if resp.status_code == 200:
                    audio_bytes = resp.content
                    # Run speech recognition in thread pool
                    transcript = await asyncio.to_thread(
                        transcribe_audio_bytes, audio_bytes, "kn-IN"
                    )
                    if not transcript:
                        transcript = await asyncio.to_thread(
                            transcribe_audio_bytes, audio_bytes, "en-IN"
                        )
        except Exception as e:
            log.warning(f"[Exotel] Failed to download or transcribe audio: {e}")

    if not transcript:
        transcript = params.get("Digits") or "Need assistance from Shirva community volunteers."

    senior_name, location = await _lookup_senior(norm_phone)

    # ── NLTK-Powered NLP Voice Triage ──
    triage_result = triage_transcript(transcript, "Kannada")
    is_emergency = triage_result["isEmergency"]
    matched_trigger = triage_result.get("matchedTrigger")
    distress_score = triage_result.get("distressScore", 0.0)
    category = triage_result.get("category", "General Community Support")
    urgency = triage_result.get("urgency", "MEDIUM")
    nlp_method = triage_result.get("nlpMethod", "NLTK")
    clean_tokens = triage_result.get("cleanTokens", [])

    # Update active call object
    call_update = {
        **(app.state.current_call or {}),
        "status": "PROCESSING",
        "speechTranscript": transcript,
        "triageResult": triage_result,
    }
    app.state.current_call = call_update
    await broadcast(app, "CALL_SPEECH_PROCESSED", call_update)

    if is_emergency:
        emg_id = make_emg_id()
        emg_req = {
            "id": emg_id, "seniorName": senior_name, "seniorPhone": norm_phone,
            "location": location, "language": "Kannada",
            "category": "CRITICAL EMERGENCY (112)", "urgency": "CRITICAL_112",
            "description": f'[CRITICAL 112 ALERT] Exotel Call Trigger: "{matched_trigger}". Distress: {distress_score}. Transcript: "{transcript}"',
            "status": "ESCALATED_112", "escalatedTo112": True,
            "audioNotes": f'Exotel Recording: {recording_url}. NLTK Flag: "{matched_trigger}" (Distress: {distress_score}).',
        }
        async with aiosqlite.connect(DB_PATH) as db:
            await add_request(db, emg_req)
            await add_emergency_record(db, {
                "id": f"EMG-{int(datetime.now().timestamp() * 1000)}",
                "requestId": emg_id, "seniorName": senior_name, "location": location,
                "reason": f'Exotel trigger: "{matched_trigger}". {transcript}',
                "callerPhone": norm_phone, "escalatedBy": "Exotel/NLTK Safety Gate",
                "policeStation": "Shirva PS", "status": "DISPATCHED",
            })
            await log_audit(db, "EMERGENCY_112_ESCALATED",
                            f"112 Dispatch for {senior_name} via Exotel. Trigger: '{matched_trigger}' (Distress: {distress_score}).",
                            "Exotel Voice Gateway")

        await broadcast(app, "EMERGENCY_ALERT", emg_req)
        await broadcast(app, "REQUEST_CREATED", emg_req)

        # Alert duty officer
        background.add_task(asyncio.to_thread, speak_locally,
                            f"P0 Critical Emergency from Exotel caller {senior_name}. Dispatched 112.", 160, 1.0)

        return JSONResponse({
            "status": "emergency_escalated",
            "isEmergency": True,
            "category": "CRITICAL EMERGENCY (112)",
            "requestId": emg_id,
            "responseSpeech": "ಇದು ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಾಗಿದೆ. ಶಿರ್ವಾ ಪೊಲೀಸ್ ಮತ್ತು 112 ತಕ್ಷಣ ಮಾಹಿತಿ ನೀಡಲಾಗಿದೆ."
        })

    # Non-emergency: route to free volunteers
    async with aiosqlite.connect(DB_PATH) as db:
        volunteers = await get_volunteers(db)
        matched_vol = None
        avail = [v for v in volunteers if v.get("verificationStatus") == "VERIFIED" and v.get("isAvailable")]
        if avail:
            if "Transport" in category:
                matched_vol = next((v for v in avail if any("transport" in s.lower() or "auto" in s.lower() for s in v.get("skills", []))), avail[0])
            elif "Medicine" in category:
                matched_vol = next((v for v in avail if any("medicine" in s.lower() or "first aid" in s.lower() for s in v.get("skills", []))), avail[0])
            else:
                matched_vol = avail[0]

        req_id = make_req_id()
        new_req = {
            "id": req_id, "seniorName": senior_name, "seniorPhone": norm_phone,
            "location": location, "language": "Kannada",
            "category": category, "urgency": urgency,
            "description": transcript,
            "status": "ASSIGNED" if matched_vol else "PENDING",
            "assignedVolunteerId": matched_vol["id"] if matched_vol else None,
            "assignedVolunteerName": matched_vol["name"] if matched_vol else "Awaiting Assignment",
            "escalatedTo112": False,
            "audioNotes": f"Exotel voice call SID={call_sid}. Recording: {recording_url}.",
        }
        await add_request(db, new_req)
        if matched_vol:
            await update_request_assign(db, req_id, matched_vol["id"], matched_vol["name"])
        await log_audit(db, "REQUEST_CREATED",
                        f"{category} ({urgency}) request for {senior_name} via Exotel. "
                        f"Assigned: {matched_vol['name'] if matched_vol else 'Broadcast'}.",
                        "Exotel Voice Gateway")

    await broadcast(app, "REQUEST_CREATED", new_req)
    if matched_vol:
        await broadcast(app, "REQUEST_ASSIGNED", {
            "requestId": req_id,
            "assignedVolunteerId": matched_vol["id"],
            "assignedVolunteerName": matched_vol["name"],
        })

    return JSONResponse({
        "status": "routed_to_volunteer",
        "isEmergency": False,
        "requestId": req_id,
        "category": category,
        "matchedVolunteer": matched_vol["name"] if matched_vol else "Broadcast to Pool",
        "responseSpeech": f"ಕೋರಿಕೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. {matched_vol['name'] if matched_vol else 'ಸ್ವಯಂಸೇವಕರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ'}."
    })


# ── Outbound Calling via Exotel ────────────────────────────────────────────────
@router.post("/call")
async def exotel_outbound_call(request: Request):
    """
    Initiate an outbound phone call to an Indian mobile number using Exotel REST API.
    Calls senior or volunteer without requiring ISD or international dialing.
    """
    body = await request.json()
    to_phone = body.get("to") or "+919945594198"
    norm_to = normalize_indian_phone(to_phone)

    if not EXOTEL_API_KEY or not EXOTEL_API_TOKEN:
        return JSONResponse({
            "success": False,
            "message": "Exotel credentials not configured in backend/.env. Fill EXOTEL_API_KEY and EXOTEL_API_TOKEN.",
            "target": norm_to,
        }, status_code=400)

    url = f"https://{EXOTEL_SUBDOMAIN}/v1/Accounts/{EXOTEL_ACCOUNT_SID}/Calls/connect.json"
    auth = (EXOTEL_API_KEY, EXOTEL_API_TOKEN)
    data = {
        "From": norm_to,
        "To": EXOTEL_CALLER_ID,
        "CallerId": EXOTEL_CALLER_ID,
        "CallType": "trans",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, auth=auth, data=data)
            return JSONResponse({
                "success": resp.status_code == 200,
                "status_code": resp.status_code,
                "data": resp.json() if resp.status_code == 200 else resp.text,
                "dialed": norm_to
            })
    except Exception as exc:
        log.error(f"[Exotel] Outbound call error: {exc}")
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)


# ── Outbound SMS via Exotel ────────────────────────────────────────────────────
@router.post("/sms")
async def exotel_send_sms(request: Request):
    """Send an SMS alert to an Indian phone number via Exotel SMS API."""
    body = await request.json()
    to_phone = body.get("to") or "+919945594198"
    message  = body.get("message", "Sahayak Shirva Police Helpline Alert.")
    norm_to  = normalize_indian_phone(to_phone)

    if not EXOTEL_API_KEY or not EXOTEL_API_TOKEN:
        return JSONResponse({
            "success": False,
            "message": "Exotel credentials not configured in backend/.env.",
            "target": norm_to,
        }, status_code=400)

    url = f"https://{EXOTEL_SUBDOMAIN}/v1/Accounts/{EXOTEL_ACCOUNT_SID}/Sms/send.json"
    auth = (EXOTEL_API_KEY, EXOTEL_API_TOKEN)
    data = {
        "From": "SHRPOL",
        "To": norm_to,
        "Body": message,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, auth=auth, data=data)
            return JSONResponse({
                "success": resp.status_code == 200,
                "status_code": resp.status_code,
                "data": resp.json() if resp.status_code == 200 else resp.text,
            })
    except Exception as exc:
        log.error(f"[Exotel] SMS error: {exc}")
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)


# ── Status & Info Endpoint ────────────────────────────────────────────────────
@router.get("/status")
async def exotel_status():
    """Returns Exotel gateway configuration and connection state."""
    is_configured = bool(EXOTEL_API_KEY and EXOTEL_API_TOKEN and EXOTEL_ACCOUNT_SID)
    return {
        "provider": "Exotel (India Cloud Telephony)",
        "configured": is_configured,
        "callerId": EXOTEL_CALLER_ID,
        "accountSid": EXOTEL_ACCOUNT_SID,
        "subdomain": EXOTEL_SUBDOMAIN,
        "supportedRegions": ["Karnataka (080)", "All India (+91)"],
        "isdRequired": False,
        "incomingWebhook": f"{PUBLIC_BASE_URL}/api/exotel/incoming",
        "recordCallbackWebhook": f"{PUBLIC_BASE_URL}/api/exotel/record-callback",
    }
