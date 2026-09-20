"""
voice_service.py — Text-to-Speech (pyttsx3) & Speech-to-Text (speech_recognition)
Modular, thread-safe voice processing service for the Sahayak platform.
Shirva Police Station · HPL 2026 PS 03
"""

import io
import os
import tempfile
import threading
from typing import Optional, List, Dict, Any

import pyttsx3
import speech_recognition as sr

try:
    import pythoncom
    HAS_PYTHONCOM = True
except ImportError:
    HAS_PYTHONCOM = False

_tts_lock = threading.Lock()
_recognizer = sr.Recognizer()


# ─── Text-to-Speech (pyttsx3) ────────────────────────────────────────────────

def get_available_voices() -> List[Dict[str, Any]]:
    """List system TTS voices available to pyttsx3."""
    with _tts_lock:
        if HAS_PYTHONCOM:
            pythoncom.CoInitialize()
        try:
            engine = pyttsx3.init()
            voices = engine.getProperty("voices")
            res = []
            for v in voices:
                res.append({
                    "id": v.id,
                    "name": v.name,
                    "languages": getattr(v, "languages", []),
                    "gender": getattr(v, "gender", None),
                    "age": getattr(v, "age", None)
                })
            return res
        except Exception as e:
            return [{"id": "default", "name": f"Default Voice ({e})", "languages": ["en"]}]
        finally:
            if HAS_PYTHONCOM:
                pythoncom.CoUninitialize()


def synthesize_speech_wav(
    text: str,
    language: str = "en-IN",
    voice_id: Optional[str] = None,
    rate: int = 145,
    volume: float = 1.0,
) -> bytes:
    """
    Synthesize text into WAV audio bytes using pyttsx3.
    Thread-safe and cleans up all temporary artifacts.
    """
    if not text or not text.strip():
        text = "No content to speak."

    temp_wav = os.path.join(tempfile.gettempdir(), f"sahayak_tts_{os.getpid()}_{threading.get_ident()}.wav")

    with _tts_lock:
        if HAS_PYTHONCOM:
            pythoncom.CoInitialize()
        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", rate)
            engine.setProperty("volume", max(0.0, min(1.0, volume)))

            if voice_id:
                try:
                    engine.setProperty("voice", voice_id)
                except Exception:
                    pass
            elif "kn" in language.lower() or "kannada" in language.lower():
                # Prefer Indian English / female voice if available for softer cadence
                voices = engine.getProperty("voices")
                for v in voices:
                    if "zira" in v.name.lower() or "aditi" in v.name.lower() or "india" in v.name.lower():
                        engine.setProperty("voice", v.id)
                        break

            engine.save_to_file(text, temp_wav)
            engine.runAndWait()

            if os.path.exists(temp_wav):
                with open(temp_wav, "rb") as f:
                    wav_data = f.read()
                return wav_data
            else:
                raise RuntimeError("pyttsx3 failed to generate WAV file.")
        finally:
            if os.path.exists(temp_wav):
                try:
                    os.remove(temp_wav)
                except Exception:
                    pass
            if HAS_PYTHONCOM:
                pythoncom.CoUninitialize()


def speak_locally(text: str, rate: int = 145, volume: float = 1.0) -> None:
    """
    Speak text directly aloud through local workstation/console speakers.
    Ideal for real-time police dispatch room alerts and operator announcements.
    """
    with _tts_lock:
        if HAS_PYTHONCOM:
            pythoncom.CoInitialize()
        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", rate)
            engine.setProperty("volume", max(0.0, min(1.0, volume)))
            engine.say(text)
            engine.runAndWait()
        finally:
            if HAS_PYTHONCOM:
                pythoncom.CoUninitialize()


# ─── Speech-to-Text (speech_recognition) ──────────────────────────────────────

def transcribe_audio_bytes(
    audio_bytes: bytes,
    language: str = "en-IN"
) -> Dict[str, Any]:
    """
    Transcribe raw WAV audio bytes using speech_recognition.
    Supports Kannada ('kn-IN'), English ('en-IN', 'en-US'), Hindi ('hi-IN'), etc.
    """
    if not audio_bytes:
        return {"success": False, "error": "Empty audio payload received."}

    # Normalize language tag
    lang_code = _normalize_lang_code(language)

    try:
        with sr.AudioFile(io.BytesIO(audio_bytes)) as source:
            audio = _recognizer.record(source)
            text = _recognizer.recognize_google(audio, language=lang_code)
            return {
                "success": True,
                "transcript": text,
                "language": lang_code,
                "engine": "speech_recognition (Google STT)"
            }
    except sr.UnknownValueError:
        return {
            "success": False,
            "error": "Speech was unclear or could not be recognized. Please speak distinctly.",
            "language": lang_code
        }
    except sr.RequestError as e:
        return {
            "success": False,
            "error": f"Speech recognition service request error: {e}",
            "language": lang_code
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Audio processing error: {e}",
            "language": lang_code
        }


def listen_from_microphone(
    timeout: int = 6,
    phrase_time_limit: int = 10,
    language: str = "en-IN",
    device_index: Optional[int] = None
) -> Dict[str, Any]:
    """
    Record live audio from the workstation/station microphone using speech_recognition
    and transcribe it.
    """
    lang_code = _normalize_lang_code(language)
    try:
        with sr.Microphone(device_index=device_index) as source:
            # Adjust quickly for background ambient noise (e.g., station desk / ceiling fan)
            _recognizer.adjust_for_ambient_noise(source, duration=0.8)
            audio = _recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)
            text = _recognizer.recognize_google(audio, language=lang_code)
            return {
                "success": True,
                "transcript": text,
                "language": lang_code,
                "engine": "speech_recognition (Live Microphone)"
            }
    except sr.WaitTimeoutError:
        return {
            "success": False,
            "error": f"No speech detected within {timeout} seconds.",
            "language": lang_code
        }
    except sr.UnknownValueError:
        return {
            "success": False,
            "error": "Microphone audio was unclear. Please repeat your emergency or request.",
            "language": lang_code
        }
    except sr.RequestError as e:
        return {
            "success": False,
            "error": f"Speech recognition service error: {e}",
            "language": lang_code
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Microphone error: {e}",
            "language": lang_code
        }


def _normalize_lang_code(lang: str) -> str:
    l = (lang or "").lower().strip()
    if "kannada" in l or l == "kn" or l == "kn-in":
        return "kn-IN"
    elif "hindi" in l or l == "hi" or l == "hi-in":
        return "hi-IN"
    elif "tulu" in l:
        return "kn-IN"  # Google STT transcribes Tulu best with kn-IN acoustic model
    elif "us" in l:
        return "en-US"
    return "en-IN"
