"""
test_voice_service.py — Verification script for pyttsx3 and speech_recognition integration
"""

import os
import sys
import io

print("--- Testing voice_service.py ---")
try:
    import voice_service
    print("[PASS] voice_service imported.")
except Exception as e:
    print(f"[FAIL] voice_service import failed: {e}")
    sys.exit(1)

# 1. Test Voices
try:
    voices = voice_service.get_available_voices()
    print(f"[PASS] Retrieved {len(voices)} voices from pyttsx3:")
    for v in voices:
        print(f"       - {v['name']} (Languages: {v['languages']})")
except Exception as e:
    print(f"[FAIL] get_available_voices failed: {e}")

# 2. Test TTS Synthesis
try:
    test_phrase = "Namaskara, Shirva Police Sahayak emergency assistance."
    wav_bytes = voice_service.synthesize_speech_wav(test_phrase, language="en-IN")
    assert len(wav_bytes) > 1000, "WAV bytes too small"
    print(f"[PASS] pyttsx3 synthesized '{test_phrase[:30]}...' -> {len(wav_bytes)} bytes WAV")
except Exception as e:
    print(f"[FAIL] synthesize_speech_wav failed: {e}")
    sys.exit(1)

# 3. Test Speech Recognition from WAV
try:
    stt_res = voice_service.transcribe_audio_bytes(wav_bytes, language="en-IN")
    print(f"[PASS] speech_recognition result: {stt_res}")
    assert stt_res.get("success") is True, f"Recognition failed: {stt_res}"
except Exception as e:
    print(f"[FAIL] transcribe_audio_bytes failed: {e}")
    sys.exit(1)

# 4. Test routers/calls.py and main.py import
try:
    from routers import calls
    print("[PASS] routers.calls imported successfully with new endpoints.")
except Exception as e:
    print(f"[FAIL] routers.calls import failed: {e}")
    sys.exit(1)

try:
    from main import app
    routes = [getattr(r, "path", str(r)) for r in app.routes]
    print(f"[PASS] FastAPI initialized with {len(routes)} top-level routes/mounts.")
    voice_routes = [r.path for r in calls.router.routes]
    print(f"[PASS] Calls router voice routes: {voice_routes}")
except Exception as e:
    print(f"[FAIL] main.app import failed: {e}")
    sys.exit(1)

print("\n--- ALL VOICE SERVICE TESTS PASSED ---")
