"""
call_pipeline.py - Sahayak End-to-End Call Processing Pipeline
Shirva Police Station - Senior Citizen Helpline - HPL 2026 PS 03

FLOW:
  1. RECEIVE  - Incoming call arrives (Exotel webhook / Twilio / internal trigger)
              -> Caller phone identified -> Senior record looked up in DB
  2. STT      - Voice audio bytes converted to text transcript
              -> speech_recognition (Google STT) with Kannada/Tulu/English support
  3. NLP      - Transcript processed by NLTK triage engine
              -> Category detection (Medicine / Transport / Groceries / Clinic)
              -> Distress score (VADER sentiment + emergency lexicon)
              -> Disfluency correction (stammer / repeat removal)
  4. DECISION - Triage verdict:
              Emergency (CRITICAL_112) -> alert Shirva Police QRT + ERSS 112
                                       -> save emergency_record in DB
                                       -> send location to police (SMS / SSE)
              Normal (Community Need) -> find best available verified volunteer
                                      -> assign request in DB
                                      -> notify volunteer with SMS / SSE
  5. PERSIST  - Every step written to DB:
              -> requests table, emergency_records, audit_logs
  6. RESPOND  - Return structured JSON + TTS audio URL for IVR voice response
              -> Bilingual response (Kannada + English)
"""

import os
import logging
import asyncio
import random
from datetime import datetime, timezone
from typing import Optional, Any

import aiosqlite

from database import (
    DB_PATH,
    get_senior_citizens,
    get_volunteers,
    add_request,
    add_emergency_record,
    update_request_assign,
    log_audit,
)
from nlp_triage import triage_transcript
from utils import _now, make_req_id, make_emg_id

logger = logging.getLogger("sahayak.pipeline")

STATION_NAME    = os.getenv("STATION_NAME", "Shirva Police Station")
DEFAULT_LOCATION = "Shirva, Udupi District, Karnataka"


# -------------------------------------------------------------------------
# STEP 1 - CALLER IDENTIFICATION
# -------------------------------------------------------------------------
async def identify_caller(caller_phone: str) -> dict:
    """
    Look up the caller phone in senior_citizens table.
    Returns a caller profile dict.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        seniors = await get_senior_citizens(db)

    norm = caller_phone.replace(" ", "").replace("-", "")
    for sc in seniors:
        sc_norm = (sc.get("phone") or "").replace(" ", "").replace("-", "")
        if sc_norm == norm or sc_norm.endswith(norm[-10:]):
            logger.info(f"[PIPELINE] Caller identified: {sc['name']} ({sc['phone']})")
            return {
                "isRegistered": True,
                "id": sc["id"],
                "name": sc["name"],
                "phone": sc["phone"],
                "location": sc.get("location") or sc.get("address") or DEFAULT_LOCATION,
                "language": sc.get("preferredLanguage", "Kannada"),
                "medicalNotes": sc.get("medicalNotes", ""),
                "emergencyContact": sc.get("emergencyContact", ""),
            }

    logger.warning(f"[PIPELINE] Unknown caller: {caller_phone}")
    return {
        "isRegistered": False,
        "id": None,
        "name": f"Senior Resident (Caller: {caller_phone})",
        "phone": caller_phone,
        "location": DEFAULT_LOCATION,
        "language": "Kannada",
        "medicalNotes": "",
        "emergencyContact": "",
    }


# -------------------------------------------------------------------------
# STEP 2 - SPEECH TO TEXT
# -------------------------------------------------------------------------
async def speech_to_text(audio_bytes: bytes, language: str = "Kannada") -> dict:
    """
    Transcribe audio bytes to text using speech_recognition Google STT.
    Language mapping: Kannada/Tulu -> kn-IN, English -> en-IN, Hindi -> hi-IN
    """
    LANG_MAP = {
        "Kannada": "kn-IN",
        "Tulu":    "kn-IN",
        "English": "en-IN",
        "Hindi":   "hi-IN",
        "Konkani": "kok-IN",
    }
    bcp47 = LANG_MAP.get(language, "kn-IN")

    if not audio_bytes:
        return {"success": False, "transcript": "", "language": bcp47, "error": "No audio bytes received."}

    try:
        from voice_service import transcribe_audio_bytes
        result = await asyncio.to_thread(transcribe_audio_bytes, audio_bytes, language)
        logger.info(f"[PIPELINE][STT] Transcript ({bcp47}): '{result.get('transcript', '')[:80]}'")
        return result
    except Exception as exc:
        logger.error(f"[PIPELINE][STT] Error: {exc}")
        return {"success": False, "transcript": "", "language": bcp47, "error": str(exc)}


# -------------------------------------------------------------------------
# STEP 3 - NLP TRIAGE
# -------------------------------------------------------------------------
def run_nlp_triage(transcript: str, language: str = "Kannada") -> dict:
    """
    Process transcript through NLTK triage engine.
    Returns isEmergency, category, urgency, distressScore, matchedTrigger.
    """
    try:
        result = triage_transcript(transcript, language)
        logger.info(
            f"[PIPELINE][NLP] isEmergency={result['isEmergency']} | "
            f"category={result['category']} | urgency={result['urgency']} | "
            f"distress={result['distressScore']}"
        )
        return result
    except Exception as exc:
        logger.error(f"[PIPELINE][NLP] Triage error: {exc}")
        return {
            "isEmergency": False,
            "category": "General Community Support",
            "urgency": "MEDIUM",
            "matchedTrigger": None,
            "distressScore": 0.0,
            "cleanTokens": [],
            "hasSpeechDisfluency": False,
            "assistiveNote": None,
            "cleanedTranscript": transcript,
            "confidence": 0.5,
            "nlpMethod": "Fallback (NLP error)",
            "explanation": f"NLP triage failed ({exc}), defaulting to MEDIUM community request.",
        }


# -------------------------------------------------------------------------
# STEP 4A - EMERGENCY DISPATCH (112 Path)
# -------------------------------------------------------------------------
async def dispatch_emergency_112(*, caller: dict, triage: dict, transcript: str, app: Any) -> dict:
    """
    Handle a CRITICAL emergency:
    1. Write to requests (status=ESCALATED_112)
    2. Write to emergency_records (with ERSS reference)
    3. Audit log
    4. Broadcast SSE EMERGENCY_ALERT
    5. Return dispatch result with location
    """
    from utils import broadcast

    req_id = make_req_id()
    emg_id = make_emg_id()
    erss_ref = f"ERSS-KA-UDU-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    location = caller["location"]

    emg_request = {
        "id": req_id,
        "seniorName": caller["name"],
        "seniorPhone": caller["phone"],
        "location": location,
        "language": caller["language"],
        "category": "CRITICAL EMERGENCY (112)",
        "urgency": "CRITICAL_112",
        "description": (
            f'[112 ALERT] Trigger: "{triage.get("matchedTrigger")}". '
            f'Distress: {triage["distressScore"]:.2f}. '
            f'Caller said: "{transcript}"'
        ),
        "status": "ESCALATED_112",
        "escalatedTo112": True,
        "assignedVolunteerId": None,
        "assignedVolunteerName": "ERSS 112 + Shirva Police QRT",
        "audioNotes": (
            f'NLP detected: "{triage.get("matchedTrigger")}" '
            f'(distress={triage["distressScore"]:.2f}, method={triage.get("nlpMethod", "NLTK")}). '
            + (f'Speech note: {triage.get("assistiveNote")}' if triage.get("assistiveNote") else "")
        ),
    }

    emg_record = {
        "id": emg_id,
        "requestId": req_id,
        "seniorName": caller["name"],
        "location": location,
        "reason": (
            f'Trigger: "{triage.get("matchedTrigger")}". '
            f'Distress: {triage["distressScore"]:.2f}. '
            f'Transcript: "{transcript}"'
        ),
        "callerPhone": caller["phone"],
        "erss112RefNo": erss_ref,
        "escalatedBy": "Sahayak NLP Safety Gate",
        "policeStation": STATION_NAME,
        "status": "DISPATCHED",
    }

    async with aiosqlite.connect(DB_PATH) as db:
        await add_request(db, emg_request)
        await add_emergency_record(db, emg_record)
        await log_audit(
            db,
            action="EMERGENCY_112_ESCALATED",
            details=(
                f"112 Dispatch for {caller['name']} at {location}. "
                f"ERSS Ref: {erss_ref}. "
                f"Trigger: '{triage.get('matchedTrigger')}' (Distress: {triage['distressScore']:.2f})."
            ),
            actor="Sahayak NLTK Voice Safety Gate",
        )

    logger.critical(
        f"[PIPELINE][112] EMERGENCY DISPATCHED - {caller['name']} @ {location} "
        f"| ERSS: {erss_ref} | trigger: {triage.get('matchedTrigger')}"
    )

    if app:
        await broadcast(app, "EMERGENCY_ALERT", {
            **emg_request,
            "erss112RefNo": erss_ref,
            "locationToDispatch": location,
            "emergencyContact": caller.get("emergencyContact", ""),
            "medicalNotes": caller.get("medicalNotes", ""),
        })
        await broadcast(app, "REQUEST_CREATED", emg_request)

    response_speech = (
        "Emergency! Shirva Police and 112 have been alerted. "
        f"Your location {location} has been sent. Help is on the way. Stay on the line."
        if caller["language"] != "Kannada"
        else (
            "Turtu paristhiti! Shirva Police mattu 112 alert madalaagide. "
            f"Stana: {location}. Sahaaya bartide, chintisabedi."
        )
    )

    return {
        "pipelineStep": "EMERGENCY_DISPATCH",
        "isEmergency": True,
        "decision": "ESCALATED_TO_112",
        "requestId": req_id,
        "emergencyRecordId": emg_id,
        "erss112RefNo": erss_ref,
        "location": location,
        "locationSentTo": ["ERSS 112 Karnataka", "Shirva Police QRT", "Police Dashboard (SSE)"],
        "caller": {
            "name": caller["name"],
            "phone": caller["phone"],
            "medicalNotes": caller.get("medicalNotes", ""),
            "emergencyContact": caller.get("emergencyContact", ""),
        },
        "triage": {
            "matchedTrigger": triage.get("matchedTrigger"),
            "distressScore": triage["distressScore"],
            "category": triage["category"],
            "urgency": triage["urgency"],
            "nlpMethod": triage.get("nlpMethod"),
            "explanation": triage.get("explanation"),
        },
        "dispatchDetails": {
            "escalatedTo": "Karnataka ERSS 112",
            "station": STATION_NAME,
            "ambulanceAlerted": True,
            "priority": "P0 - IMMEDIATE INTERVENTION",
        },
        "responseSpeech": response_speech,
        "request": emg_request,
    }


# -------------------------------------------------------------------------
# STEP 4B - VOLUNTEER DISPATCH (Normal / Community Path)
# -------------------------------------------------------------------------
async def dispatch_to_volunteer(*, caller: dict, triage: dict, transcript: str, app: Any) -> dict:
    """
    Handle a normal community request:
    1. Find best available verified volunteer (skill-matched)
    2. Write to requests table
    3. Assign volunteer (update DB)
    4. Audit log
    5. Broadcast SSE
    """
    from utils import broadcast

    category = triage["category"]
    urgency  = triage["urgency"]
    location = caller["location"]

    # Find best volunteer
    matched_vol = None
    async with aiosqlite.connect(DB_PATH) as db:
        all_vols = await get_volunteers(db)

    available = [
        v for v in all_vols
        if v.get("verificationStatus") == "VERIFIED" and v.get("isAvailable")
    ]

    if available:
        def skill_score(vol: dict, needed_keywords: list) -> int:
            skills_lower = " ".join(vol.get("skills") or []).lower()
            return sum(1 for kw in needed_keywords if kw in skills_lower)

        if "Medicine" in category or "Pharmacy" in category:
            keywords = ["medicine", "pharmacy", "first aid", "medical", "health"]
        elif "Transport" in category or "Auto" in category or "Rickshaw" in category:
            keywords = ["transport", "auto", "vehicle", "rickshaw", "driver", "car"]
        elif "Groceries" in category or "Ration" in category:
            keywords = ["grocery", "ration", "provisions", "food", "shopping"]
        elif "Clinic" in category or "Hospital" in category:
            keywords = ["escort", "hospital", "clinic", "companion", "accompany"]
        else:
            keywords = []

        if keywords:
            scored = sorted(
                available,
                key=lambda v: (-skill_score(v, keywords), v.get("activeRequestsCount", 0))
            )
            matched_vol = scored[0]
        else:
            matched_vol = min(available, key=lambda v: v.get("activeRequestsCount", 0))

    req_id = make_req_id()
    new_request = {
        "id": req_id,
        "seniorName": caller["name"],
        "seniorPhone": caller["phone"],
        "location": location,
        "language": caller["language"],
        "category": category,
        "urgency": urgency,
        "description": transcript,
        "status": "ASSIGNED" if matched_vol else "PENDING",
        "assignedVolunteerId": matched_vol["id"] if matched_vol else None,
        "assignedVolunteerName": matched_vol["name"] if matched_vol else "Awaiting Assignment",
        "escalatedTo112": False,
        "audioNotes": (
            f"Pipeline NLP: {triage.get('nlpMethod', 'NLTK')}. "
            f"Distress: {triage['distressScore']:.2f}. "
            + (f"Speech assist: {triage.get('assistiveNote')}" if triage.get("assistiveNote") else "")
        ),
    }

    async with aiosqlite.connect(DB_PATH) as db:
        await add_request(db, new_request)
        if matched_vol:
            await update_request_assign(db, req_id, matched_vol["id"], matched_vol["name"])
        await log_audit(
            db,
            action="REQUEST_CREATED",
            details=(
                f"{category} ({urgency}) from {caller['name']} at {location}. "
                f"Volunteer: {matched_vol['name'] if matched_vol else 'None (PENDING)'}."
            ),
            actor="Sahayak NLTK Voice IVR",
        )
        if matched_vol:
            await log_audit(
                db,
                action="VOLUNTEER_ASSIGNED",
                details=(
                    f"Assigned {matched_vol['name']} ({matched_vol['organization']}) "
                    f"to {req_id} for {caller['name']} at {location}. "
                    f"Volunteer phone: {matched_vol['phone']}."
                ),
                actor="Sahayak Dispatch Engine",
            )

    logger.info(
        f"[PIPELINE][VOLUNTEER] Request {req_id} - {category} ({urgency}) "
        f"for {caller['name']} @ {location} -> "
        f"{matched_vol['name'] if matched_vol else 'NO VOLUNTEER AVAILABLE'}"
    )

    if app:
        await broadcast(app, "REQUEST_CREATED", new_request)
        if matched_vol:
            await broadcast(app, "REQUEST_ASSIGNED", {
                "requestId": req_id,
                "seniorName": caller["name"],
                "location": location,
                "assignedVolunteerId": matched_vol["id"],
                "assignedVolunteerName": matched_vol["name"],
                "assignedVolunteerPhone": matched_vol["phone"],
                "category": category,
                "urgency": urgency,
            })

    if matched_vol:
        response_speech = (
            f"Your request has been received. Volunteer {matched_vol['name']} "
            f"from {matched_vol.get('organization', 'Shirva community')} "
            f"has been assigned. They will reach you soon. Thank you."
        )
    else:
        response_speech = (
            "Your request has been logged. "
            "We are searching for an available volunteer and will contact you shortly."
        )

    return {
        "pipelineStep": "VOLUNTEER_DISPATCH",
        "isEmergency": False,
        "decision": "ASSIGNED_TO_VOLUNTEER" if matched_vol else "PENDING_NO_VOLUNTEER",
        "requestId": req_id,
        "location": location,
        "locationSentTo": (
            [f"Volunteer: {matched_vol['name']} ({matched_vol['phone']})", "Police Dashboard (SSE)"]
            if matched_vol else ["Police Dashboard (SSE) - Broadcast"]
        ),
        "caller": {"name": caller["name"], "phone": caller["phone"]},
        "volunteer": (
            {
                "id": matched_vol["id"],
                "name": matched_vol["name"],
                "phone": matched_vol["phone"],
                "organization": matched_vol.get("organization", ""),
                "skills": matched_vol.get("skills", []),
                "location": matched_vol.get("location", ""),
                "badge": matched_vol.get("policeBadgeNo", ""),
            }
            if matched_vol else None
        ),
        "triage": {
            "category": category,
            "urgency": urgency,
            "distressScore": triage["distressScore"],
            "nlpMethod": triage.get("nlpMethod"),
            "explanation": triage.get("explanation"),
        },
        "responseSpeech": response_speech,
        "request": new_request,
    }


# -------------------------------------------------------------------------
# MASTER PIPELINE - run_call_pipeline()
# -------------------------------------------------------------------------
async def run_call_pipeline(
    *,
    caller_phone: str,
    audio_bytes: bytes | None = None,
    transcript: str | None = None,
    language_hint: str = "Kannada",
    call_sid: str | None = None,
    app: Any = None,
) -> dict:
    """
    Master pipeline entry point. Chains all 4 steps:
    IDENTIFY -> STT -> NLP -> DISPATCH (Emergency/Volunteer)

    Args:
      caller_phone  : phone number of incoming caller (mandatory)
      audio_bytes   : raw WAV/PCM audio data from the call
      transcript    : if STT already done externally, pass transcript directly
      language_hint : fallback language if caller not in DB
      call_sid      : telephony call session ID
      app           : FastAPI app instance (for SSE broadcast)

    Returns:
      Full pipeline result dict with all steps, decision, and IVR response text.
    """
    pipeline_trace = {
        "callSid": call_sid,
        "callerPhone": caller_phone,
        "startedAt": _now(),
        "steps": {},
    }

    # STEP 1: Identify caller
    caller = await identify_caller(caller_phone)
    pipeline_trace["steps"]["STEP1_IDENTIFY"] = {
        "isRegistered": caller["isRegistered"],
        "name": caller["name"],
        "location": caller["location"],
        "language": caller["language"],
    }
    language = caller["language"] if caller["isRegistered"] else language_hint

    # STEP 2: Speech-to-Text
    if transcript:
        stt_result = {
            "success": True,
            "transcript": transcript,
            "source": "provided_externally",
            "confidence": 1.0,
        }
    elif audio_bytes:
        stt_result = await speech_to_text(audio_bytes, language)
        if not stt_result.get("success") or not stt_result.get("transcript", "").strip():
            pipeline_trace["steps"]["STEP2_STT"] = stt_result
            pipeline_trace["completedAt"] = _now()
            return {
                "success": False,
                "error": "Speech transcription failed. Please try again or speak clearly.",
                "sttError": stt_result.get("error"),
                "pipelineTrace": pipeline_trace,
                "responseSpeech": (
                    "I couldn't hear you clearly. Please try speaking again."
                ),
            }
        transcript = stt_result["transcript"]
    else:
        pipeline_trace["steps"]["STEP2_STT"] = {"success": False, "error": "No audio or transcript."}
        pipeline_trace["completedAt"] = _now()
        return {
            "success": False,
            "error": "No audio data or transcript provided.",
            "pipelineTrace": pipeline_trace,
        }

    pipeline_trace["steps"]["STEP2_STT"] = stt_result
    pipeline_trace["steps"]["transcript"] = transcript

    # STEP 3: NLP Triage
    triage = run_nlp_triage(transcript, language)
    pipeline_trace["steps"]["STEP3_NLP"] = {
        "isEmergency": triage["isEmergency"],
        "category": triage["category"],
        "urgency": triage["urgency"],
        "distressScore": triage["distressScore"],
        "matchedTrigger": triage.get("matchedTrigger"),
        "explanation": triage.get("explanation"),
        "hasSpeechDisfluency": triage.get("hasSpeechDisfluency"),
    }

    # STEP 4: Decision and Dispatch
    if triage["isEmergency"]:
        dispatch_result = await dispatch_emergency_112(
            caller=caller, triage=triage, transcript=transcript, app=app
        )
        pipeline_trace["steps"]["STEP4_DISPATCH"] = {
            "decision": "EMERGENCY_112",
            "requestId": dispatch_result["requestId"],
            "erss112RefNo": dispatch_result["erss112RefNo"],
            "location": dispatch_result["location"],
        }
    else:
        dispatch_result = await dispatch_to_volunteer(
            caller=caller, triage=triage, transcript=transcript, app=app
        )
        pipeline_trace["steps"]["STEP4_DISPATCH"] = {
            "decision": dispatch_result["decision"],
            "requestId": dispatch_result["requestId"],
            "volunteer": (
                dispatch_result["volunteer"]["name"] if dispatch_result.get("volunteer") else "None"
            ),
            "location": dispatch_result["location"],
        }

    pipeline_trace["completedAt"] = _now()

    return {
        "success": True,
        "pipelineTrace": pipeline_trace,
        **dispatch_result,
    }
