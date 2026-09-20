import re
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("sahayak.nlp")

_NLTK_READY = False
_vader_analyzer = None
_lemmatizer = None
_stop_words = set()

def _init_nltk():
    global _NLTK_READY, _vader_analyzer, _lemmatizer, _stop_words
    if _NLTK_READY:
        return

    try:
        import nltk
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
        from nltk.stem import WordNetLemmatizer
        from nltk.corpus import stopwords

        packages = ["punkt", "punkt_tab", "vader_lexicon", "stopwords", "wordnet"]
        for pkg in packages:
            try:
                nltk.download(pkg, quiet=True)
            except Exception as e:
                logger.debug(f"NLTK download notice for {pkg}: {e}")

        _vader_analyzer = SentimentIntensityAnalyzer()
        _lemmatizer = WordNetLemmatizer()
        try:
            _stop_words = set(stopwords.words("english"))
        except Exception:
            _stop_words = {"the", "a", "an", "is", "in", "it", "to", "for", "of", "and", "or"}

        _NLTK_READY = True
        logger.info("NLTK Triage Engine initialized successfully.")
    except Exception as exc:
        logger.warning(f"NLTK initialization had issues, fallback rules active: {exc}")
        _NLTK_READY = False

_init_nltk()

EMERGENCY_LEXICON = [
    "chest pain", "heart attack", "cardiac", "unconscious", "breathing problem",
    "cannot breathe", "fainted", "bleeding", "accident", "fire", "thief",
    "robbery", "attacked", "choking", "stroke", "emergency", "ambulance",
    "severe pain", "head injury", "fracture", "collapsed", "poison",
    "ede novu", "ede novide", "raktasrava", "apaghatha", "benki", "kalla",
    "kallaru", "swasa kattide", "biddubitte", "thale suthu", "maranantika",
    "kondoyiri", "hospital beku", "athiyada novu", "upadrava", "kaapaadi",
]

CRITICAL_FUZZY_ANCHORS = [
    "ambulance", "emergency", "cardiac", "stroke", "bleeding", "unconscious",
    "apaghatha", "raktasrava", "biddubitte", "maranantika",
]

CATEGORY_PATTERNS = {
    "Medicines / Pharmacy": [
        "medicine", "tablet", "pill", "pharmacy", "doctor", "bp", "sugar",
        "insulin", "prescription", "injection", "osadhi", "mathre", "drops", "syrup",
    ],
    "Auto-Rickshaw / Transport": [
        "auto", "rickshaw", "vehicle", "transport", "pickup", "drop", "gaadi",
        "car", "taxi", "stand", "travel", "ride",
    ],
    "Groceries / Ration": [
        "ration", "grocery", "milk", "vegetable", "tarakaari", "angadi", "rice",
        "wheat", "food", "haalu", "oota", "provisions", "dal", "oil",
    ],
    "Clinic Escort / Hospital": [
        "clinic", "hospital", "accompany", "jothege", "escort", "checkup", "opd",
        "consultation", "appointment", "dispensary",
    ],
}

URGENCY_BOOSTERS = [
    "urgent", "urgently", "immediately", "quick", "asap", "fast",
    "tumba jaruru", "jaruru", "sheeghra", "igaale", "bega", "now",
]

def tokenize_and_clean(text: str) -> Tuple[List[str], List[str]]:
    cleaned = re.sub(r"[^\w\s-]", " ", text.lower()).strip()
    raw_tokens = [t for t in cleaned.split() if t]

    meaningful = []
    for t in raw_tokens:
        if t not in _stop_words and len(t) > 1:
            if _lemmatizer:
                try:
                    lem = _lemmatizer.lemmatize(t)
                    if lem == t:
                        lem = _lemmatizer.lemmatize(t, pos="v")
                    meaningful.append(lem)
                    continue
                except Exception:
                    pass
            meaningful.append(t)

    return raw_tokens, meaningful

def calculate_distress_score(text: str) -> Dict[str, Any]:
    compound = 0.0
    neg = 0.0

    if _vader_analyzer:
        try:
            scores = _vader_analyzer.polarity_scores(text)
            compound = scores.get("compound", 0.0)
            neg = scores.get("neg", 0.0)
        except Exception as e:
            logger.debug(f"VADER analysis fallback: {e}")

    distress = 0.0
    if compound < 0:
        distress = min(1.0, abs(compound) * 0.7 + neg * 0.5)
    elif neg > 0:
        distress = min(1.0, neg * 0.8)

    if "!" in text or any(w in text.lower() for w in ["help", "kaapaadi", "save", "die", "dying", "severe"]):
        distress = min(1.0, distress + 0.25)

    return {
        "distressScore": round(distress, 2),
        "compoundPolarity": round(compound, 2),
        "isHighDistress": distress >= 0.65,
    }

def clean_stutter_and_disfluencies(text: str) -> Tuple[str, bool]:
    has_disfluency = False
    cleaned = text

    if re.search(r"\b(?:[a-zA-Z]{1,3}[-–.]+)+([a-zA-Z]{2,})\b", cleaned):
        has_disfluency = True
        cleaned = re.sub(r"\b(?:[a-zA-Z]{1,3}[-–.]+)+([a-zA-Z]{2,})\b", r"\1", cleaned)

    if re.search(r"([a-zA-Z])\1{2,}", cleaned):
        has_disfluency = True
        cleaned = re.sub(r"([a-zA-Z])\1{2,}", r"\1", cleaned)

    if re.search(r"\b(\w+)(?:[\s.,-]+(?:\1\b))+", cleaned, flags=re.IGNORECASE):
        has_disfluency = True
        cleaned = re.sub(r"\b(\w+)(?:[\s.,-]+(?:\1\b))+", r"\1", cleaned, flags=re.IGNORECASE)

    if re.search(r"\b(uh+|um+|aa+|er+|hmm+)\b", cleaned, flags=re.IGNORECASE):
        has_disfluency = True
        cleaned = re.sub(r"\b(uh+|um+|aa+|er+|hmm+)\b", "", cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned, has_disfluency

def find_fuzzy_emergency_match(tokens: List[str]) -> Optional[str]:
    try:
        from nltk.metrics.distance import edit_distance
    except ImportError:
        return None

    for tok in tokens:
        if len(tok) < 5:
            continue
        for anchor in CRITICAL_FUZZY_ANCHORS:
            max_dist = 2 if len(anchor) > 7 else 1
            if edit_distance(tok, anchor) <= max_dist:
                return f"fuzzy_match:{anchor}(from '{tok}')"
    return None

def triage_transcript(transcript: str, language: str = "English") -> Dict[str, Any]:
    cleaned_transcript, has_disfluency = clean_stutter_and_disfluencies(transcript)
    normalized = cleaned_transcript.lower().strip()
    raw_tokens, clean_tokens = tokenize_and_clean(cleaned_transcript)
    distress_info = calculate_distress_score(transcript)

    matched_trigger = next((kw for kw in EMERGENCY_LEXICON if kw in normalized or kw in transcript.lower()), None)

    if not matched_trigger:
        fuzzy = find_fuzzy_emergency_match(raw_tokens)
        if fuzzy:
            matched_trigger = fuzzy

    assistive_note = "Speech disfluency/stammer detected. Operator guidance: Speak gently, give caller time, do not interrupt." if has_disfluency else None

    if matched_trigger:
        return {
            "isEmergency": True,
            "category": "CRITICAL EMERGENCY (112)",
            "urgency": "CRITICAL_112",
            "matchedTrigger": matched_trigger,
            "distressScore": max(distress_info["distressScore"], 0.85),
            "cleanTokens": clean_tokens,
            "hasSpeechDisfluency": has_disfluency,
            "assistiveNote": assistive_note,
            "cleanedTranscript": cleaned_transcript,
            "confidence": 0.98,
            "nlpMethod": "NLTK Token + Lexicon + Levenshtein Matching",
            "explanation": f"Emergency trigger detected: '{matched_trigger}' with distress score {distress_info['distressScore']}",
        }

    escalate_urgency = distress_info["isHighDistress"]

    matched_category = "General Community Support"
    best_score = 0

    all_check_tokens = set(clean_tokens + raw_tokens)

    for cat_name, patterns in CATEGORY_PATTERNS.items():
        score = sum(1 for p in patterns if p in all_check_tokens or any(p in t for t in raw_tokens))
        if score > best_score:
            best_score = score
            matched_category = cat_name

    has_booster = any(b in normalized or b in all_check_tokens for b in URGENCY_BOOSTERS)

    if matched_category == "Medicines / Pharmacy":
        urgency = "HIGH" if (has_booster or escalate_urgency) else "MEDIUM"
    elif matched_category == "Clinic Escort / Hospital":
        urgency = "HIGH"
    elif matched_category == "Auto-Rickshaw / Transport":
        urgency = "HIGH" if (has_booster or escalate_urgency) else "MEDIUM"
    elif matched_category == "Groceries / Ration":
        urgency = "MEDIUM" if (has_booster or escalate_urgency) else "ROUTINE"
    else:
        urgency = "HIGH" if escalate_urgency else "MEDIUM"

    return {
        "isEmergency": False,
        "category": matched_category,
        "urgency": urgency,
        "matchedTrigger": None,
        "distressScore": distress_info["distressScore"],
        "cleanTokens": clean_tokens,
        "hasSpeechDisfluency": has_disfluency,
        "assistiveNote": assistive_note,
        "cleanedTranscript": cleaned_transcript,
        "confidence": 0.90 if best_score > 0 else 0.70,
        "nlpMethod": "NLTK Lemmatizer + VADER Sentiment + Intent Classifier",
        "explanation": f"Categorized as '{matched_category}' ({urgency}) with distress score {distress_info['distressScore']}",
    }
