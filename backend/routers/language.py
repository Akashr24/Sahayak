"""
routers/language.py — Multi-language API support
Provides language detection and supported language list for Sahayak.
Shirva Police Station · HPL 2026 PS 03
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()

SUPPORTED_LANGUAGES = [
    {"code": "en", "label": "English",  "nativeLabel": "English",    "flag": "🇬🇧", "speechCode": "en-IN"},
    {"code": "kn", "label": "Kannada",  "nativeLabel": "ಕನ್ನಡ",      "flag": "🇮🇳", "speechCode": "kn-IN"},
    {"code": "hi", "label": "Hindi",    "nativeLabel": "हिन्दी",      "flag": "🇮🇳", "speechCode": "hi-IN"},
    {"code": "ta", "label": "Tamil",    "nativeLabel": "தமிழ்",       "flag": "🇮🇳", "speechCode": "ta-IN"},
    {"code": "te", "label": "Telugu",   "nativeLabel": "తెలుగు",      "flag": "🇮🇳", "speechCode": "te-IN"},
    {"code": "tl", "label": "Tulu",     "nativeLabel": "ತುಳು",        "flag": "🇮🇳", "speechCode": "kn-IN"},
]

# Browser lang header → our code mapping
_LANG_MAP = {
    "en": "en", "kn": "kn", "hi": "hi", "ta": "ta", "te": "te",
    "mr": "hi",  # Marathi → fallback Hindi
    "gu": "hi",  # Gujarati → fallback Hindi
    "bn": "hi",  # Bengali → fallback Hindi
}


@router.get("/api/languages", tags=["Language"])
async def list_languages():
    """Return all supported interface languages."""
    return SUPPORTED_LANGUAGES


@router.get("/api/languages/detect", tags=["Language"])
async def detect_language(request: Request):
    """
    Auto-detect preferred language from Accept-Language request header.
    Returns the best matching supported language code.
    """
    accept = request.headers.get("Accept-Language", "en")
    # Parse Accept-Language: e.g. "kn-IN,kn;q=0.9,en;q=0.8"
    preferred = []
    for part in accept.split(","):
        lang_q = part.strip().split(";")
        lang_code = lang_q[0].strip().split("-")[0].lower()
        q = 1.0
        if len(lang_q) > 1:
            try:
                q = float(lang_q[1].strip().replace("q=", ""))
            except ValueError:
                q = 0.5
        preferred.append((lang_code, q))

    preferred.sort(key=lambda x: x[1], reverse=True)

    for lang_code, _ in preferred:
        if lang_code in _LANG_MAP:
            detected = _LANG_MAP[lang_code]
            lang_meta = next((l for l in SUPPORTED_LANGUAGES if l["code"] == detected), None)
            return {
                "detected": detected,
                "source": "Accept-Language header",
                "language": lang_meta,
                "rawHeader": accept
            }

    # Default: Kannada for Shirva region
    return {
        "detected": "kn",
        "source": "regional default (Shirva, Karnataka)",
        "language": SUPPORTED_LANGUAGES[1],
        "rawHeader": accept
    }
