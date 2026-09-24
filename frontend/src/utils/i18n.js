/**
 * i18n.js — Sahayak Multi-Language Support
 * Languages: English, Kannada, Hindi, Tamil, Telugu, Tulu
 * Shirva Police Station · HPL 2026 PS 03
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',  nativeLabel: 'English',    flag: '🇬🇧', speechCode: 'en-IN' },
  { code: 'kn', label: 'Kannada',  nativeLabel: 'ಕನ್ನಡ',      flag: '🇮🇳', speechCode: 'kn-IN' },
  { code: 'hi', label: 'Hindi',    nativeLabel: 'हिन्दी',      flag: '🇮🇳', speechCode: 'hi-IN' },
  { code: 'ta', label: 'Tamil',    nativeLabel: 'தமிழ்',       flag: '🇮🇳', speechCode: 'ta-IN' },
  { code: 'te', label: 'Telugu',   nativeLabel: 'తెలుగు',      flag: '🇮🇳', speechCode: 'te-IN' },
  { code: 'tl', label: 'Tulu',     nativeLabel: 'ತುಳು',        flag: '🇮🇳', speechCode: 'kn-IN' },
];

/** Detect browser/device language and map to supported code */
export function detectBrowserLanguage() {
  const nav = navigator.language || navigator.userLanguage || 'en';
  const base = nav.split('-')[0].toLowerCase();
  const map = { en: 'en', kn: 'kn', hi: 'hi', ta: 'ta', te: 'te' };
  return map[base] || 'kn'; // Default to Kannada for Shirva region
}

// ─── Translation strings ──────────────────────────────────────────────────────
const T = {
  // ── App shell ─────────────────────────────────────────────────────────────
  appName: {
    en: 'SAHAYAK', kn: 'ಸಹಾಯಕ', hi: 'सहायक', ta: 'சகாயக்', te: 'సహాయక్', tl: 'ಸಹಾಯಕ'
  },
  appSubtitle: {
    en: 'Community Assistance Platform for Senior Citizens',
    kn: 'ಹಿರಿಯ ನಾಗರಿಕರಿಗಾಗಿ ಸಮುದಾಯ ಸಹಾಯ ವೇದಿಕೆ',
    hi: 'वरिष्ठ नागरिकों के लिए सामुदायिक सहायता मंच',
    ta: 'மூத்த குடிமக்களுக்கான சமூக உதவி தளம்',
    te: 'జ్యేష్ఠ పౌరుల కోసం సమాజ సహాయ వేదిక',
    tl: 'ಹಿರಿಯ ನಾಗರಿಕೆರೆಗ್ ಸಮುದಾಯ ಸಹಾಯ ಪೀಠ',
  },

  // ── Navigation ───────────────────────────────────────────────────────────
  navSeniorVoice: {
    en: 'Senior Voice Line', kn: 'ಹಿರಿಯರ ಧ್ವನಿ ರೇಖೆ', hi: 'वरिष्ठ वॉइस लाइन',
    ta: 'மூத்தவர் குரல் வழி', te: 'జ్యేష్ఠ వాయిస్ లైన్', tl: 'ಹಿರಿಯರ್ ಧ್ವನಿ ರೇಕೆ'
  },
  navPoliceCmd: {
    en: 'Police Command Center', kn: 'ಪೊಲೀಸ್ ಆಜ್ಞಾ ಕೇಂದ್ರ', hi: 'पुलिस कमान केंद्र',
    ta: 'காவல்துறை கட்டளை மையம்', te: 'పోలీస్ కమాండ్ సెంటర్', tl: 'ಪೋಲೀಸ್ ಆಜ್ಞಾ ಕೇಂದ್ರ'
  },
  navVolunteer: {
    en: 'Volunteer Portal', kn: 'ಸ್ವಯಂಸೇವಕ ಪೋರ್ಟಲ್', hi: 'स्वयंसेवक पोर्टल',
    ta: 'தன்னார்வலர் போர்டல்', te: 'స్వచ్ఛంద సేవకుల పోర్టల్', tl: 'ಸ್ವಯಂಸೇವಕ ಪೋರ್ಟಲ್'
  },
  navGeoRadar: {
    en: 'Geo-Radar', kn: 'ಭೂ-ರೇಡಾರ್', hi: 'जियो-रडार',
    ta: 'புவி-ரேடார்', te: 'జియో-రాడార్', tl: 'ಭೂ-ರೇಡಾರ್'
  },

  // ── Helpline ─────────────────────────────────────────────────────────────
  helplineTitle: {
    en: 'Senior Citizen Helpline', kn: 'ಹಿರಿಯ ನಾಗರಿಕ ಸಹಾಯ ವಾಣಿ', hi: 'वरिष्ठ नागरिक हेल्पलाइन',
    ta: 'மூத்த குடிமக்கள் உதவி வரி', te: 'జ్యేష్ఠ పౌరుల హెల్ప్‌లైన్', tl: 'ಹಿರಿಯ ನಾಗರಿಕ ಸಹಾಯ ವಾಣಿ'
  },
  helplineCallNow: {
    en: 'Call Now', kn: 'ಈಗ ಕರೆ ಮಾಡಿ', hi: 'अभी कॉल करें',
    ta: 'இப்போது அழையுங்கள்', te: 'ఇప్పుడే కాల్ చేయండి', tl: 'ಎನ್ನ ಕರ್ ಮಲ್ಪುಲೆ'
  },

  // ── Senior Voice Portal ───────────────────────────────────────────────────
  svpTitle: {
    en: 'Senior Citizen Voice Line', kn: 'ಹಿರಿಯ ನಾಗರಿಕ ಧ್ವನಿ ರೇಖೆ', hi: 'वरिष्ठ नागरिक वाणी सेवा',
    ta: 'மூத்த குடிமக்கள் குரல் சேவை', te: 'జ్యేష్ఠ పౌరుల వాయిస్ సేవ', tl: 'ಹಿರಿಯ ನಾಗರಿಕ ಧ್ವನಿ ಸೇವೆ'
  },
  svpSubtitle: {
    en: 'Speak in your language — we understand Kannada, Tulu, Hindi & English',
    kn: 'ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ — ಕನ್ನಡ, ತುಳು, ಹಿಂದಿ ಮತ್ತು ಆಂಗ್ಲ ಅರ್ಥವಾಗುತ್ತದೆ',
    hi: 'अपनी भाषा में बोलें — हम कन्नड, तुलु, हिंदी और अंग्रेजी समझते हैं',
    ta: 'உங்கள் மொழியில் பேசுங்கள் — கன்னடம், துளு, இந்தி மற்றும் ஆங்கிலம் புரியும்',
    te: 'మీ భాషలో మాట్లాడండి — కన్నడ, తులు, హిందీ మరియు ఆంగ్లం అర్థమవుతుంది',
    tl: 'ನಿಕ್ಕ ಭಾಷೆಡ್ ಪಾತೆರ್ — ಕನ್ನಡ, ತುಳು, ಹಿಂದಿ ಬೊಕ್ಕ ಇಂಗ್ಲಿಷ್ ಅರ್ಥ ಆಪ್ತ್'
  },
  svpCallNow: {
    en: 'Start Call', kn: 'ಕರೆ ಪ್ರಾರಂಭಿಸಿ', hi: 'कॉल शुरू करें',
    ta: 'அழைப்பை தொடங்கு', te: 'కాల్ ప్రారంభించండి', tl: 'ಕರ್ ಸುರು ಮಲ್ಪುಲೆ'
  },
  svpHangup: {
    en: 'Hang Up', kn: 'ಸಂಪರ್ಕ ಕಡಿತ', hi: 'कॉल काटें',
    ta: 'அழைப்பை துண்டி', te: 'కాల్ కట్ చేయండి', tl: 'ಕರ್ ಕಡ್ಪುಲೆ'
  },
  svpMicStart: {
    en: 'Tap to Speak', kn: 'ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ', hi: 'बोलने के लिए टैप करें',
    ta: 'பேச தட்டவும்', te: 'మాట్లాడటానికి నొక్కండి', tl: 'ಪಾತೆರ್ಕ್ ಟ್ಯಾಪ್ ಮಲ್ಪುಲೆ'
  },
  svpProcessing: {
    en: 'Processing your request...', kn: 'ನಿಮ್ಮ ವಿನಂತಿ ಪ್ರಕ್ರಿಯೆ...', hi: 'आपका अनुरोध प्रक्रिया में है...',
    ta: 'உங்கள் கோரிக்கை செயலாக்கப்படுகிறது...', te: 'మీ అభ్యర్థన ప్రాసెస్ అవుతోంది...', tl: 'ನಿಕ್ಕ ವಿಜ್ಞಾಪನೆ ಆಯನ...'
  },

  // ── Volunteer Portal ──────────────────────────────────────────────────────
  volLogin: {
    en: 'Volunteer Login', kn: 'ಸ್ವಯಂಸೇವಕ ಪ್ರವೇಶ', hi: 'स्वयंसेवक लॉगिन',
    ta: 'தன்னார்வலர் உள்நுழைவு', te: 'స్వచ్ఛంద సేవకుడు లాగిన్', tl: 'ಸ್ವಯಂಸೇವಕ ಲಾಗಿನ್'
  },
  volRegister: {
    en: 'Register as Volunteer', kn: 'ಸ್ವಯಂಸೇವಕರಾಗಿ ನೋಂದಾಯಿಸಿ', hi: 'स्वयंसेवक के रूप में पंजीकरण',
    ta: 'தன்னார்வலராக பதிவு செய்யவும்', te: 'స్వచ్ఛంద సేవకుడిగా నమోదు', tl: 'ಸ್ವಯಂಸೇವಕರಾಯಿ ಪಂಜೀಕರಣ'
  },

  // ── Common actions ────────────────────────────────────────────────────────
  btnSubmit: {
    en: 'Submit', kn: 'ಸಲ್ಲಿಸಿ', hi: 'जमा करें', ta: 'சமர்ப்பி', te: 'సమర్పించు', tl: 'ಸಲ್ಲಿಸುಲೆ'
  },
  btnCancel: {
    en: 'Cancel', kn: 'ರದ್ದು', hi: 'रद्द करें', ta: 'ரத்து செய்', te: 'రద్దు చేయి', tl: 'ರದ್ದ್ ಮಲ್ಪುಲೆ'
  },
  btnSave: {
    en: 'Save', kn: 'ಉಳಿಸಿ', hi: 'सहेजें', ta: 'சேமி', te: 'సేవ్ చేయి', tl: 'ಉಳ್ಪಾವುಲೆ'
  },
  btnClose: {
    en: 'Close', kn: 'ಮುಚ್ಚು', hi: 'बंद करें', ta: 'மூடு', te: 'మూయండి', tl: 'ಮುಚ್ಚುಲೆ'
  },
  btnRefresh: {
    en: 'Refresh', kn: 'ನವೀಕರಿಸಿ', hi: 'रिफ्रेश करें', ta: 'புதுப்பி', te: 'రిఫ్రెష్ చేయి', tl: 'ನವೀಕರಿಸುಲೆ'
  },
  loading: {
    en: 'Loading...', kn: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...', hi: 'लोड हो रहा है...',
    ta: 'ஏற்றுகிறது...', te: 'లోడ్ అవుతోంది...', tl: 'ಲೋಡ್ ಆಪ್ತ...'
  },
  error: {
    en: 'Error', kn: 'ದೋಷ', hi: 'त्रुटि', ta: 'பிழை', te: 'లోపం', tl: 'ದೋಷ'
  },
  success: {
    en: 'Success', kn: 'ಯಶಸ್ಸು', hi: 'सफलता', ta: 'வெற்றி', te: 'విజయం', tl: 'ಯಶಸ್ಸ್'
  },

  // ── Emergency ────────────────────────────────────────────────────────────
  emergency: {
    en: 'EMERGENCY', kn: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿ', hi: 'आपातकाल', ta: 'அவசரநிலை', te: 'అత్యవసర పరిస్థితి', tl: 'ಅತ್ಯವಸರ'
  },
  callEmergency: {
    en: 'Call 112 – Emergency', kn: 'ತುರ್ತು: 112 ಕರೆ ಮಾಡಿ', hi: 'आपातकाल: 112 कॉल करें',
    ta: 'அவசர: 112 அழைக்கவும்', te: 'అత్యవసర: 112కి కాల్ చేయండి', tl: 'ಅತ್ಯವಸರ: 112 ಕರ್ ಮಲ್ಪುಲೆ'
  },

  // ── Status labels ─────────────────────────────────────────────────────────
  statusPending: {
    en: 'Pending', kn: 'ಬಾಕಿ ಇದೆ', hi: 'लंबित', ta: 'நிலுவை', te: 'పెండింగ్', tl: 'ಬಾಕಿ'
  },
  statusActive: {
    en: 'Active', kn: 'ಸಕ್ರಿಯ', hi: 'सक्रिय', ta: 'செயல்பாட்டில்', te: 'యాక్టివ్', tl: 'ಸಕ್ರಿಯ'
  },
  statusResolved: {
    en: 'Resolved', kn: 'ಪರಿಹರಿಸಲಾಗಿದೆ', hi: 'हल किया गया', ta: 'தீர்க்கப்பட்டது', te: 'పరిష్కరించబడింది', tl: 'ಪರಿಹರಿಸಿದ'
  },
  statusVerified: {
    en: 'Verified', kn: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ', hi: 'सत्यापित', ta: 'சரிபார்க்கப்பட்டது', te: 'ధృవీకరించబడింది', tl: 'ಪರಿಶೀಲಿಸಿದ'
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footerSponsored: {
    en: 'Sponsored by', kn: 'ಆಯೋಜಕರು', hi: 'प्रायोजित', ta: 'நிதியளிக்கப்பட்டது', te: 'ఆయోజకులు', tl: 'ಆಯೋಜಕೆರ್'
  },
  footerLanguage: {
    en: 'Language', kn: 'ಭಾಷೆ', hi: 'भाषा', ta: 'மொழி', te: 'భాష', tl: 'ಭಾಷೆ'
  },
  footerSelectLanguage: {
    en: 'Select Language', kn: 'ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ', hi: 'भाषा चुनें', ta: 'மொழியைத் தேர்வு செய்யவும்', te: 'భాష ఎంచుకోండి', tl: 'ಭಾಷೆ ಆರ್ಯೆ ಮಲ್ಪುಲೆ'
  },

  // ── Map / Radar ───────────────────────────────────────────────────────────
  radarTitle: {
    en: 'Live Geo-Radar', kn: 'ನೇರ ಭೂ-ರೇಡಾರ್', hi: 'लाइव जियो-रडार',
    ta: 'நேரடி புவி-ரேடார்', te: 'లైవ్ జియో-రాడార్', tl: 'ಲೈವ್ ಭೂ-ರೇಡಾರ್'
  },

  // ── Requests ──────────────────────────────────────────────────────────────
  reqTitle: {
    en: 'Help Requests', kn: 'ಸಹಾಯ ವಿನಂತಿಗಳು', hi: 'सहायता अनुरोध',
    ta: 'உதவி கோரிக்கைகள்', te: 'సహాయ అభ్యర్థనలు', tl: 'ಸಹಾಯ ವಿಜ್ಞಾಪನೆಲು'
  },

  // ── Auto-detect notice ────────────────────────────────────────────────────
  autoDetected: {
    en: 'Language auto-detected', kn: 'ಭಾಷೆ ಸ್ವಯಂ ಗುರುತಿಸಲಾಗಿದೆ', hi: 'भाषा स्वत: पहचानी गई',
    ta: 'மொழி தானாக கண்டறியப்பட்டது', te: 'భాష స్వయంచాలకంగా గుర్తించబడింది', tl: 'ಭಾಷೆ ಸ್ವಯಂ ಗೊತ್ತುಮಾಡ್ಯೆ'
  },
};

/**
 * Get a translated string.
 * @param {string} key - Translation key from T
 * @param {string} lang - Language code (en, kn, hi, ta, te, tl)
 * @param {Object} vars - Optional variable replacements { name: 'John' }
 */
export function t(key, lang = 'en', vars = {}) {
  const entry = T[key];
  if (!entry) return key;
  let str = entry[lang] ?? entry['en'] ?? key;
  // Replace variables like {name}
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  return str;
}

export default T;
