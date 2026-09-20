"""routers/calls.py — SSE stream, telephony webhook, call simulator, voice triage"""

import random
import urllib.parse
import base64
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Request, File, UploadFile, Query, Response
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from database import (
    get_requests, get_volunteers, add_request, add_emergency_record, log_audit,
    DB_PATH, EMERGENCY_KEYWORDS, update_request_assign,
)
import aiosqlite
from nlp_triage import triage_transcript
from voice_service import (
    get_available_voices,
    synthesize_speech_wav,
    speak_locally,
    transcribe_audio_bytes,
    listen_from_microphone,
)

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ─── SSE Stream ───────────────────────────────────────────────────────────────
@router.get("/api/calls/stream")
async def calls_stream(request: Request):
    app = request.app

    async def event_generator():
        import asyncio, json
        client_queue: asyncio.Queue = asyncio.Queue()
        app.state.sse_clients.append(client_queue)
        try:
            # Send init event
            yield {
                "event": "INIT",
                "data": json.dumps({
                    "helpline": app.state.helpline,
                    "currentCall": app.state.current_call,
                }),
            }
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(client_queue.get(), timeout=25)
                    yield msg
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}
        finally:
            app.state.sse_clients = [c for c in app.state.sse_clients if c is not client_queue]

    return EventSourceResponse(event_generator())



@router.post("/api/calls/trigger-incoming")
async def trigger_incoming(request: Request):
    app = request.app
    body = await request.json()
    caller_phone = body.get("callerPhone", "+91 98451 22340")
    senior_name  = body.get("seniorName", "Saraswathi Amma (Age 74)")
    location     = body.get("location", "Near Our Lady of Health Church, Shirva")
    spoken_text  = body.get("spokenText", "ನನಗೆ ಬಿಪಿ ಮಾತ್ರೆ ಬೇಕು (Need BP tablets)")
    language     = body.get("language", "Kannada")

    call_sid = f"CALL-SIM-{int(datetime.now().timestamp() * 1000)}"
    app.state.current_call = {
        "callId": call_sid, "callerPhone": caller_phone,
        "seniorName": senior_name, "location": location,
        "status": "RINGING", "startedAt": _now(),
        "speechTranscript": spoken_text, "language": language,
        "dialedNumber": app.state.helpline["primaryNumber"],
    }
    await _broadcast(app, "INCOMING_CALL", app.state.current_call)

    async with aiosqlite.connect(DB_PATH) as db:
        await log_audit(db, "PHONE_CALL_SIMULATED",
                        f"Simulated incoming call for {senior_name} ({caller_phone}). Ringing on console.",
                        "Web Operator Simulator")

    return {"success": True, "currentCall": app.state.current_call}


@router.post("/api/calls/answer")
async def answer_call(request: Request):
    app = request.app
    if app.state.current_call:
        app.state.current_call["status"] = "ANSWERED"
        app.state.current_call["answeredAt"] = _now()
        await _broadcast(app, "CALL_ANSWERED", app.state.current_call)
        async with aiosqlite.connect(DB_PATH) as db:
            await log_audit(db, "CALL_ANSWERED",
                            f"Call {app.state.current_call['callId']} answered by operator.",
                            "Shirva Police Web Operator")
    return {"success": True, "currentCall": app.state.current_call}


@router.post("/api/calls/hangup")
async def hangup_call(request: Request):
    app = request.app
    ended = app.state.current_call
    if ended:
        ended["status"] = "COMPLETED"
        await _broadcast(app, "CALL_ENDED", ended)
        app.state.current_call = None
        async with aiosqlite.connect(DB_PATH) as db:
            await log_audit(db, "CALL_ENDED",
                            f"Call {ended['callId']} ended by operator.",
                            "Shirva Police Web Operator")
        return {"success": True, "endedCall": ended}
    return {"success": True}


# ─── Telephony webhook (Twilio/exotel compatible) ─────────────────────────────
@router.post("/api/voice/webhook/incoming")
@router.post("/api/voice/incoming")
async def voice_webhook(request: Request):
    app = request.app
    form = await request.form()
    body = dict(form) or {}
    caller_phone = body.get("From") or body.get("caller_number") or "+91 98451 22340"
    call_sid     = body.get("CallSid") or f"CALL-{int(datetime.now().timestamp() * 1000)}"
    speech       = body.get("SpeechResult") or body.get("transcript") or ""

    async with aiosqlite.connect(DB_PATH) as db:
        reqs = await get_requests(db)
    known = next((r for r in reqs if r.get("seniorPhone") == caller_phone), None)
    senior_name = known["seniorName"] if known else "Senior Citizen (Shirva Resident)"
    location    = known["location"]   if known else "Manchakal, Shirva"

    app.state.current_call = {
        "callId": call_sid, "callerPhone": caller_phone,
        "seniorName": senior_name, "location": location,
        "status": "RINGING", "startedAt": _now(),
        "speechTranscript": speech,
        "dialedNumber": app.state.helpline["primaryNumber"],
    }
    await _broadcast(app, "INCOMING_CALL", app.state.current_call)

    async with aiosqlite.connect(DB_PATH) as db:
        await log_audit(db, "PHONE_CALL_RECEIVED",
                        f"Incoming call from {caller_phone} ({senior_name}).",
                        "Telephony Gateway")

    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        '<Gather input="speech dtmf" timeout="6" speechTimeout="auto" action="/api/voice/webhook/incoming" method="POST">'
        '<Say voice="Polly.Aditi" language="kn-IN">'
        "Namaskara. Shirva Police Sahayakke swagatha. Nimma samasye heLi, nava kshamavagi keluthiddene. Athava emergencyge 1 otti."
        "</Say>"
        '<Say voice="Polly.Aditi" language="en-IN">'
        "Welcome to Shirva Police Sahayak helpline. Please take your time to speak, we are listening patiently. You can also press 1 for emergency."
        "</Say>"
        "</Gather>"
        "</Response>"
    )
    from fastapi.responses import Response
    return Response(content=twiml, media_type="text/xml")


# ─── Voice AI Triage ──────────────────────────────────────────────────────────
@router.post("/api/voice/process")
async def voice_process(request: Request):
    body = await request.json()
    transcript  = body.get("transcript", "")
    senior_name = body.get("seniorName", "Senior Resident (Voice Caller)")
    senior_phone= body.get("seniorPhone", "+91 98450 00000")
    location    = body.get("location", "Shirva Town Centre")
    language    = body.get("language", "Kannada")

    # ── NLTK-Powered NLP Voice Triage ──
    triage_result = triage_transcript(transcript, language)
    is_emergency = triage_result["isEmergency"]
    matched_trigger = triage_result.get("matchedTrigger")
    distress_score = triage_result.get("distressScore", 0.0)
    category = triage_result.get("category", "General Community Support")
    urgency = triage_result.get("urgency", "MEDIUM")
    nlp_method = triage_result.get("nlpMethod", "NLTK")
    clean_tokens = triage_result.get("cleanTokens", [])
    has_disfluency = triage_result.get("hasSpeechDisfluency", False)
    assistive_note = triage_result.get("assistiveNote")
    cleaned_transcript = triage_result.get("cleanedTranscript", transcript)

    if is_emergency:
        emg_id = f"EMG-112-{int(datetime.now().timestamp() * 1000) % 10000}"
        emg_req = {
            "id": emg_id, "seniorName": senior_name, "seniorPhone": senior_phone,
            "location": location, "language": language,
            "category": "CRITICAL EMERGENCY (112)",
            "urgency": "CRITICAL_112",
            "description": f'[CRITICAL 112 ALERT] Trigger: "{matched_trigger}". Distress: {distress_score}. Caller: "{transcript}"',
            "status": "ESCALATED_112", "escalatedTo112": True,
            "audioNotes": f'NLTK flagged: "{matched_trigger}" (Distress Score: {distress_score}).' + (f" Speech Note: {assistive_note}" if assistive_note else ""),
        }
        async with aiosqlite.connect(DB_PATH) as db:
            await add_request(db, emg_req)
            await add_emergency_record(db, {
                "id": f"EMG-{int(datetime.now().timestamp() * 1000)}",
                "requestId": emg_id, "seniorName": senior_name, "location": location,
                "reason": f'Trigger phrase: "{matched_trigger}". Distress: {distress_score}. {transcript}',
                "callerPhone": senior_phone, "escalatedBy": "NLTK Voice Safety Gate",
                "policeStation": "Shirva PS", "status": "DISPATCHED",
            })
            await log_audit(db, "EMERGENCY_112_ESCALATED",
                            f"112 Dispatch for {senior_name} at {location}. Trigger: '{matched_trigger}' (Distress: {distress_score})."
                            + (f" [Speech Disfluency Assist: {assistive_note}]" if assistive_note else ""),
                            "NLTK Voice Safety Gate")

        resp_text = (
            "ಇದು ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಾಗಿದೆ. ಶಿರ್ವಾ ಪೊಲೀಸ್ ಮತ್ತು 112 ತಕ್ಷಣ ಮಾಹಿತಿ ನೀಡಲಾಗಿದೆ."
            if language == "Kannada" else
            "Critical emergency detected. Shirva Police and 112 have been alerted."
        )
        return {
            "isEmergency": True,
            "category": "CRITICAL EMERGENCY (112)",
            "urgency": "CRITICAL_112",
            "matchedTrigger": matched_trigger,
            "distressScore": distress_score,
            "nlpMethod": nlp_method,
            "cleanTokens": clean_tokens,
            "hasSpeechDisfluency": has_disfluency,
            "assistiveNote": assistive_note,
            "cleanedTranscript": cleaned_transcript,
            "request": emg_req,
            "responseSpeech": resp_text,
            "ttsEngine": "pyttsx3",
            "ttsAudioUrl": f"/api/voice/tts?text={urllib.parse.quote(resp_text)}&language={urllib.parse.quote(language)}",
            "escalationDetails": {
                "escalatedTo": "Karnataka 112 Emergency Response",
                "dispatchedStation": "Shirva Police QRT",
                "ambulanceAlerted": True,
                "priority": "P0 - IMMEDIATE INTERVENTION",
                "distressScore": distress_score,
                "assistiveNote": assistive_note,
            },
        }

    async with aiosqlite.connect(DB_PATH) as db:
        volunteers = await get_volunteers(db)
        matched_vol = None
        avail = [v for v in volunteers if v["verificationStatus"] == "VERIFIED" and v["isAvailable"]]
        if avail:
            if "Transport" in category:
                matched_vol = next((v for v in avail if any("transport" in s.lower() or "auto" in s.lower() for s in v["skills"])), avail[0])
            elif "Medicine" in category:
                matched_vol = next((v for v in avail if any("medicine" in s.lower() or "first aid" in s.lower() for s in v["skills"])), avail[0])
            else:
                matched_vol = avail[0]

        req_id = f"REQ-{datetime.now().year}-{random.randint(100, 999)}"
        new_req = {
            "id": req_id, "seniorName": senior_name, "seniorPhone": senior_phone,
            "location": location, "language": language,
            "category": category, "urgency": urgency,
            "description": transcript,
            "status": "ASSIGNED" if matched_vol else "PENDING",
            "assignedVolunteerId": matched_vol["id"] if matched_vol else None,
            "assignedVolunteerName": matched_vol["name"] if matched_vol else "Awaiting Assignment",
            "escalatedTo112": False,
            "audioNotes": f"Processed via NLTK Triage. Distress: {distress_score}. Keywords: {', '.join(clean_tokens[:5])}."
                          + (f" Speech Assist: {assistive_note}" if assistive_note else ""),
        }
        await add_request(db, new_req)
        if matched_vol:
            await update_request_assign(db, req_id, matched_vol["id"], matched_vol["name"])
        await log_audit(db, "REQUEST_CREATED",
                        f"{category} ({urgency}) request for {senior_name} ({location}). "
                        f"NLTK Distress: {distress_score}. Assigned: {matched_vol['name'] if matched_vol else 'Broadcast'}."
                        + (f" [Speech Disfluency Assist: {assistive_note}]" if assistive_note else ""),
                        "Sahayak NLTK Voice IVR")

    if matched_vol:
        speech_kn = f"ನಮಸ್ಕಾರ, {matched_vol['name']} ({matched_vol['organization']}) ನಿಯೋಜಿಸಲಾಗಿದೆ."
        speech_en = f"Volunteer {matched_vol['name']} ({matched_vol['organization']}) has been assigned."
    else:
        speech_kn = "ನಮಸ್ಕಾರ, ಕೋರಿಕೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಹತ್ತಿರದ ಸ್ವಯಂಸೇವಕರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ."
        speech_en = "Your request has been received and broadcast to nearby verified volunteers."

    final_speech = speech_kn if language == "Kannada" else speech_en

    return {
        "isEmergency": False,
        "request": new_req,
        "matchedVolunteer": matched_vol,
        "category": category,
        "urgency": urgency,
        "distressScore": distress_score,
        "nlpMethod": nlp_method,
        "cleanTokens": clean_tokens,
        "hasSpeechDisfluency": has_disfluency,
        "assistiveNote": assistive_note,
        "cleanedTranscript": cleaned_transcript,
        "responseSpeech": final_speech,
        "ttsEngine": "pyttsx3",
        "ttsAudioUrl": f"/api/voice/tts?text={urllib.parse.quote(final_speech)}&language={urllib.parse.quote(language)}",
    }


# ─── Internal broadcast helper ────────────────────────────────────────────────
async def _broadcast(app, event: str, data: dict):
    import json
    msg = {"event": event, "data": json.dumps(data)}
    for q in list(app.state.sse_clients):
        try:
            q.put_nowait(msg)
        except Exception:
            pass


# ─── pyttsx3 & speech_recognition Endpoints ───────────────────────────────────

@router.get("/api/voice/voices")
async def list_voices():
    """Returns available TTS voices on the server."""
    voices = await asyncio.to_thread(get_available_voices)
    return {"success": True, "voices": voices, "engine": "pyttsx3"}


@router.get("/api/voice/tts")
@router.post("/api/voice/tts")
async def text_to_speech_endpoint(
    request: Request,
    text: str = Query(None),
    language: str = Query("en-IN"),
    rate: int = Query(145),
    volume: float = Query(1.0),
):
    """
    Synthesize text into WAV audio using pyttsx3.
    Can be queried via GET query params or POST JSON payload.
    """
    if request.method == "POST":
        try:
            body = await request.json()
            text = body.get("text", text)
            language = body.get("language", language)
            rate = int(body.get("rate", rate))
            volume = float(body.get("volume", volume))
        except Exception:
            pass

    if not text:
        text = "Namaskara. Shirva Police Sahayak."

    wav_bytes = await asyncio.to_thread(synthesize_speech_wav, text, language, None, rate, volume)
    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'inline; filename="sahayak_tts.wav"',
            "Cache-Control": "no-cache"
        }
    )


@router.post("/api/voice/speak-server")
async def speak_on_server(request: Request):
    """
    Announce text on the station workstation speakers using pyttsx3.
    """
    body = await request.json()
    text = body.get("text", "Sahayak Police Control Room Alert.")
    rate = int(body.get("rate", 145))
    volume = float(body.get("volume", 1.0))
    await asyncio.to_thread(speak_locally, text, rate, volume)
    return {"success": True, "message": "Alert voiced on workstation speakers via pyttsx3."}


@router.post("/api/voice/transcribe")
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(None)
):
    """
    Transcribe uploaded audio (multipart/form-data) or JSON base64 audio
    using speech_recognition.
    """
    audio_bytes = b""
    language = "en-IN"

    if file is not None:
        audio_bytes = await file.read()
    else:
        try:
            body = await request.json()
            language = body.get("language", "en-IN")
            b64_str = body.get("audioBase64", "")
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            if b64_str:
                audio_bytes = base64.b64decode(b64_str)
        except Exception as e:
            return JSONResponse(status_code=400, content={"success": False, "error": f"Invalid request body: {e}"})

    if not audio_bytes:
        return JSONResponse(status_code=400, content={"success": False, "error": "No audio data provided."})

    res = await asyncio.to_thread(transcribe_audio_bytes, audio_bytes, language)
    return res


@router.post("/api/voice/listen-mic")
async def listen_mic_endpoint(request: Request):
    """
    Record live audio from the workstation microphone using speech_recognition.Microphone()
    and transcribe it.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    timeout = int(body.get("timeout", 6))
    phrase_time_limit = int(body.get("phraseTimeLimit", 10))
    language = body.get("language", "kn-IN")

    res = await asyncio.to_thread(listen_from_microphone, timeout, phrase_time_limit, language)
    return res


@router.post("/api/voice/process-audio")
async def process_audio_endpoint(
    request: Request,
    file: UploadFile = File(None)
):
    """
    End-to-end voice triage pipeline:
    1. Receives audio recording (WAV)
    2. Transcribes with speech_recognition
    3. Triages through NLTK safety gate
    4. Records request / 112 emergency in DB
    5. Returns triage result + pyttsx3 TTS audio stream URL
    """
    audio_bytes = b""
    senior_name = "Senior Resident (Voice Caller)"
    senior_phone = "+91 98450 00000"
    location = "Shirva Town Centre"
    language = "Kannada"

    if file is not None:
        audio_bytes = await file.read()
        form = await request.form()
        senior_name = form.get("seniorName", senior_name)
        senior_phone = form.get("seniorPhone", senior_phone)
        location = form.get("location", location)
        language = form.get("language", language)
    else:
        try:
            body = await request.json()
            senior_name = body.get("seniorName", senior_name)
            senior_phone = body.get("seniorPhone", senior_phone)
            location = body.get("location", location)
            language = body.get("language", language)
            b64_str = body.get("audioBase64", "")
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            if b64_str:
                audio_bytes = base64.b64decode(b64_str)
        except Exception as e:
            return JSONResponse(status_code=400, content={"success": False, "error": f"Invalid request body: {e}"})

    if not audio_bytes:
        return JSONResponse(status_code=400, content={"success": False, "error": "No audio data provided."})

    # Step 1: Transcribe via speech_recognition
    stt_res = await asyncio.to_thread(transcribe_audio_bytes, audio_bytes, language)
    if not stt_res.get("success"):
        return JSONResponse(status_code=422, content={
            "success": False,
            "error": stt_res.get("error", "Failed to transcribe audio."),
            "sttDetails": stt_res
        })

    transcript = stt_res["transcript"]

    # Step 2: Forward to voice_process logic with simulated request
    class FakeRequest:
        def __init__(self, data, app):
            self._data = data
            self.app = app
        async def json(self):
            return self._data

    fake_req = FakeRequest({
        "transcript": transcript,
        "seniorName": senior_name,
        "seniorPhone": senior_phone,
        "location": location,
        "language": language
    }, request.app)

    triage_output = await voice_process(fake_req)
    triage_output["recognizedTranscript"] = transcript
    triage_output["sttEngine"] = "speech_recognition"
    return triage_output
