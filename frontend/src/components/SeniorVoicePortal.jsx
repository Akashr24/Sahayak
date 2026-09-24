import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, ShieldAlert, CheckCircle2, MapPin, HeartPulse, AlertCircle, RefreshCw } from 'lucide-react';

const PRESETS = [
  {
    id: 'emergency',
    title: '🚨 Heart / Chest Pain Emergency',
    titleKn: '🚨 ಎದೆ ನೋವು / ತುರ್ತು ಪರಿಸ್ಥಿತಿ (112)',
    kannada: 'ನನಗೆ ಎದೆಯಲ್ಲಿ ವಿಪರೀತ ನೋವು ಇದೆ ಮತ್ತು ಉಸಿರಾಟ ಕಷ್ಟವಾಗುತ್ತಿದೆ, ಮಂಚಕಲ್ ಜಂಕ್ಷನ್',
    english: 'I have severe chest pain and breathlessness near Manchakal Junction, Shirva.',
    type: 'EMERGENCY',
    location: 'Manchakal Junction, Shirva'
  },
  {
    id: 'medicine',
    title: '💊 Urgent BP Medicine Delivery',
    titleKn: '💊 ಬಿಪಿ ಮಾತ್ರೆ ತಲುಪಿಸುವುದು',
    kannada: 'ನನಗೆ ಶಿರ್ವಾ ಮೆಡಿಕಲ್ಸ್ ನಿಂದ ಬಿಪಿ ಮಾತ್ರೆಗಳು ತಕ್ಷಣ ಬೇಕಾಗಿದೆ, ಮತ್ತಾರ್ ಕ್ರಾಸ್ ಗೆ ತಲುಪಿಸಿ',
    english: 'Need urgent blood pressure tablets from Shirva Medicals delivered to Mattar Cross.',
    type: 'MEDICINE',
    location: 'Mattar Cross Road, Shirva'
  },
  {
    id: 'transport',
    title: '🛺 Auto-Rickshaw to Shirva PHC',
    titleKn: '🛺 ಆಸ್ಪತ್ರೆಗೆ ಆಟೋ ರಿಕ್ಷಾ',
    kannada: 'ಶಿರ್ವಾ ಸಮುದಾಯ ಆರೋಗ್ಯ ಕೇಂದ್ರಕ್ಕೆ ಹೋಗಲು ಆಟೋ ರಿಕ್ಷಾ ಬೇಕಾಗಿದೆ',
    english: 'Need an auto-rickshaw to visit Shirva Primary Health Centre.',
    type: 'TRANSPORT',
    location: 'Near Church, Shirva'
  },
  {
    id: 'groceries',
    title: '🛒 Daily Ration & Food Help',
    titleKn: '🛒 ದಿನಸಿ ಮತ್ತು ಆಹಾರ ಸಹಾಯ',
    kannada: 'ನಡೆದಾಡಲು ಆಗುತ್ತಿಲ್ಲ, ದಿನಸಿ ಮತ್ತು ಹಾಲು ತಂದುಕೊಡಲು ಯಾರಾದರೂ ಸಹಾಯ ಬೇಕು',
    english: 'Unable to walk, need someone to buy fresh milk and rations from Shirva Market.',
    type: 'ROUTINE',
    location: 'Paniyadi, Shirva'
  }
];

export default function SeniorVoicePortal({ onRefreshNeeded }) {
  const [lang, setLang] = useState('Kannada'); // 'Kannada' or 'English'
  const [callStatus, setCallStatus] = useState('IDLE'); // 'IDLE', 'CONNECTED', 'PROCESSING', 'RESULT'
  const [transcript, setTranscript] = useState('');
  const [seniorName] = useState('Saraswathi Amma (Age 74)');
  const [seniorPhone] = useState('+91 99455 94198');
  const [location, setLocation] = useState('Shirva Town Centre');
  const [callDuration, setCallDuration] = useState(0);
  const [triageResult, setTriageResult] = useState(null);
  const [isCallingPhone, setIsCallingPhone] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang === 'Kannada' ? 'kn-IN' : 'en-IN';

      rec.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript + ' ';
        }
        setTranscript(text.trim());
      };

      rec.onerror = (e) => console.warn('Speech Rec Error:', e);
      recognitionRef.current = rec;
    }
  }, [lang]);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'CONNECTED') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  // Start Call
  const handleStartCall = () => {
    setTranscript('');
    setTriageResult(null);
    setCallStatus('CONNECTED');

    // Speak initial greeting
    const greeting = lang === 'Kannada'
      ? 'ನಮಸ್ಕಾರ, ಶಿರ್ವಾ ಪೊಲೀಸ್ ಸಹಾಯಕ ಸಹಾಯವಾಣಿಗೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಹೇಳಿ.'
      : 'Welcome to Shirva Police Sahayak helpline. Please speak your requirement clearly.';
    
    speak(greeting, lang);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start warning:', err);
      }
    }
  };

  // End Call & Process Triage
  const handleEndCall = async () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const spokenText = transcript.trim() || (lang === 'Kannada' ? 'ನನಗೆ ಸಹಾಯ ಬೇಕು' : 'I need assistance');
    setCallStatus('PROCESSING');

    try {
      const res = await fetch('http://localhost:5000/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: spokenText,
          seniorName,
          seniorPhone,
          location,
          language: lang
        })
      });

      const data = await res.json();
      setTriageResult(data);
      setCallStatus('RESULT');

      // Speak confirmation
      if (data.responseSpeech) {
        speak(data.responseSpeech, lang);
      }

      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server. Make sure backend is running on port 5000.');
      setCallStatus('IDLE');
    }
  };

  // Speak text via SpeechSynthesis
  const speak = (text, language) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language === 'Kannada' ? 'kn-IN' : 'en-IN';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  };

  // Trigger Outbound GSM Call to user's phone (+91 99455 94198)
  const handleRingMyPhone = async () => {
    setIsCallingPhone(true);
    try {
      const res = await fetch('http://localhost:5000/api/calls/call-my-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+919945594198', seniorName })
      });
      const data = await res.json();
      if (data.success) {
        alert('📞 Calling your Indian mobile (+91 99455 94198) now! Pick up to hear the helpline.');
      } else {
        alert('Call failed: ' + (data.error || 'Unknown'));
      }
    } catch (e) {
      alert('Error triggering phone call: ' + e.message);
    } finally {
      setIsCallingPhone(false);
    }
  };

  // Apply quick preset scenario
  const handleSelectPreset = (p) => {
    const text = lang === 'Kannada' ? p.kannada : p.english;
    setLocation(p.location);
    setTranscript(text);
    if (callStatus !== 'CONNECTED') {
      setCallStatus('CONNECTED');
      speak(lang === 'Kannada' ? 'ಕೋರಿಕೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.' : 'Requirement received.', lang);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Language Toggle & Mode Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(15, 23, 42, 0.7)',
        padding: '12px 20px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Language (ಭಾಷೆ):</span>
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setLang('Kannada')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: lang === 'Kannada' ? '#fbbf24' : 'transparent',
                color: lang === 'Kannada' ? '#0f172a' : '#cbd5e1',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              ಕನ್ನಡ (Kannada)
            </button>
            <button
              onClick={() => setLang('English')}
              style={{
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: lang === 'English' ? '#fbbf24' : 'transparent',
                color: lang === 'English' ? '#0f172a' : '#cbd5e1',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              English
            </button>
          </div>
        </div>

        {/* Ring Real Phone Button */}
        <button
          onClick={handleRingMyPhone}
          disabled={isCallingPhone}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            border: 'none',
            padding: '8px 18px',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
          }}
        >
          <PhoneCall size={16} />
          {isCallingPhone ? 'Calling Mobile...' : '📲 Ring My Phone (+91 99455 94198)'}
        </button>
      </div>

      {/* 2. Main Large Interactive Call Card */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 14, 28, 0.98) 100%)',
        border: '2px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '24px',
        padding: '36px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        position: 'relative'
      }}>

        {/* State: IDLE */}
        {callStatus === 'IDLE' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '1rem', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
              {lang === 'Kannada' ? 'ಶಿರ್ವಾ ಪೊಲೀಸ್ ಸಹಾಯಕ ಸಹಾಯವಾಣಿ' : 'Shirva Police Senior Citizen Helpline'}
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#fff', margin: 0 }}>
              {lang === 'Kannada' ? 'ಕರೆ ಮಾಡಲು ಬಟನ್ ಒತ್ತಿರಿ' : 'Press to Call Helpline'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '500px', margin: 0 }}>
              {lang === 'Kannada'
                ? 'ಮಾತನಾಡುವ ಮೂಲಕ ನಿಮ್ಮ ತುರ್ತು ಅಥವಾ ದಿನಸಿ/ಔಷಧಿ ಅಗತ್ಯವನ್ನು ತಿಳಿಸಿ. 112 ಪೊಲೀಸ್ ತುರ್ತು ರವಾನೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿದೆ.'
                : 'Speak naturally in Kannada or English. Automated NLTK triage routes emergencies to 112 and community requests to volunteers.'}
            </p>

            {/* Giant Green Call Button */}
            <button
              onClick={handleStartCall}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: '4px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 40px rgba(34, 197, 94, 0.5)',
                transition: 'transform 0.2s',
                marginTop: '10px'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1.0)'}
            >
              <PhoneCall size={52} />
            </button>
            <div style={{ color: '#86efac', fontWeight: '700', fontSize: '1.1rem' }}>
              {lang === 'Kannada' ? 'ಕರೆ ಪ್ರಾರಂಭಿಸಿ' : 'Start Voice Call'}
            </div>
          </div>
        )}

        {/* State: CONNECTED (Active Call) */}
        {callStatus === 'CONNECTED' && (
          <div style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: '700',
              fontSize: '0.9rem'
            }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
              {lang === 'Kannada' ? 'ಕರೆ ಸಂಪರ್ಕಗೊಂಡಿದೆ' : 'Call Connected'} ({formatTime(callDuration)})
            </div>

            <h2 style={{ fontSize: '1.5rem', color: '#fff', margin: 0, fontWeight: '700' }}>
              🎙️ {lang === 'Kannada' ? 'ನಾವು ಕೇಳುತ್ತಿದ್ದೇವೆ, ಮಾತನಾಡಿ...' : 'We are listening, please speak...'}
            </h2>

            {/* Live Transcript Display */}
            <div style={{
              width: '100%',
              minHeight: '120px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '16px 20px',
              fontSize: '1.15rem',
              color: transcript ? '#f8fafc' : '#64748b',
              textAlign: 'left',
              lineHeight: '1.6'
            }}>
              {transcript || (lang === 'Kannada' ? 'ಇಲ್ಲಿ ನಿಮ್ಮ ಮಾತುಗಳು ಮೂಡಿಬರುತ್ತವೆ...' : 'Your spoken words will appear here...')}
            </div>

            {/* End Call / Send Button */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
              <button
                onClick={handleEndCall}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '14px',
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)'
                }}
              >
                <PhoneOff size={20} />
                {lang === 'Kannada' ? 'ಕರೆ ಮುಗಿಸಿ / ಕಳುಹಿಸಿ' : 'Finish Call & Submit'}
              </button>
            </div>
          </div>
        )}

        {/* State: PROCESSING */}
        {callStatus === 'PROCESSING' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '30px' }}>
            <RefreshCw size={48} className="animate-spin" style={{ color: '#fbbf24' }} />
            <h2 style={{ color: '#fff', margin: 0 }}>
              {lang === 'Kannada' ? 'ಎಐ ತುರ್ತು ವಿಶ್ಲೇಷಣೆ ನಡೆಯುತ್ತಿದೆ...' : 'AI Analyzing Urgency & Intent (NLTK)...'}
            </h2>
            <p style={{ color: '#94a3b8' }}>Checking emergency lexicons, distress sentiment & volunteer skills...</p>
          </div>
        )}

        {/* State: RESULT (Triage Verdict) */}
        {callStatus === 'RESULT' && triageResult && (
          <div style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            
            {/* Verdict Card */}
            {triageResult.isEmergency ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)',
                border: '2px solid #ef4444',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}>
                <ShieldAlert size={36} color="#ef4444" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#f87171', fontWeight: '800', fontSize: '1.2rem', textTransform: 'uppercase' }}>
                    🚨 {lang === 'Kannada' ? 'ಕ್ರಿಟಿಕಲ್ ಎಮರ್ಜೆನ್ಸಿ — 112 ಪೊಲೀಸ್ ರವಾನಿಸಲಾಗಿದೆ' : 'CRITICAL EMERGENCY — 112 DISPATCHED'}
                  </div>
                  <div style={{ color: '#fca5a5', marginTop: '4px', fontSize: '0.95rem' }}>
                    {triageResult.responseSpeech}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#fecaca' }}>
                    Station: <strong>Shirva Police QRT</strong> • Priority: <strong>P0 IMMEDIATE</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.3) 100%)',
                border: '2px solid #22c55e',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px'
              }}>
                <CheckCircle2 size={36} color="#22c55e" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#4ade80', fontWeight: '800', fontSize: '1.2rem', textTransform: 'uppercase' }}>
                    🤝 {lang === 'Kannada' ? 'ಸ್ವಯಂಸೇವಕರಿಗೆ ನಿಯೋಜಿಸಲಾಗಿದೆ' : 'COMMUNITY VOLUNTEER ASSIGNED'}
                  </div>
                  <div style={{ color: '#bbf7d0', marginTop: '4px', fontSize: '0.95rem' }}>
                    {triageResult.responseSpeech}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#dcfce7' }}>
                    Category: <strong>{triageResult.category}</strong> • Status: <strong>{triageResult.matchedVolunteer ? `Assigned to ${triageResult.matchedVolunteer.name}` : 'Broadcasted'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript recap */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', color: '#cbd5e1' }}>
              <strong>Caller said:</strong> "{transcript}"
            </div>

            {/* New Call Button */}
            <button
              onClick={() => { setCallStatus('IDLE'); setTranscript(''); setTriageResult(null); }}
              style={{
                background: '#fbbf24',
                color: '#0f172a',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '8px'
              }}
            >
              🔄 {lang === 'Kannada' ? 'ಮತ್ತೊಂದು ಕರೆ ಮಾಡಿ' : 'Start Another Call'}
            </button>
          </div>
        )}

      </div>

      {/* 3. Quick One-Tap Scenarios (KISS Test Chips) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fbbf24', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚡ {lang === 'Kannada' ? 'ತ್ವರಿತ ಪರೀಕ್ಷಾ ಸನ್ನಿವೇಶಗಳು (ಒಂದು ಕ್ಲಿಕ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ):' : 'Quick Test Scenarios (1-Click Speak):'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {PRESETS.map((p) => (
            <div
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              style={{
                background: p.type === 'EMERGENCY' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: p.type === 'EMERGENCY' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'transform 0.15s, border-color 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#fbbf24'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = p.type === 'EMERGENCY' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'; }}
            >
              <div style={{ fontWeight: '700', color: p.type === 'EMERGENCY' ? '#f87171' : '#f8fafc', fontSize: '0.95rem', marginBottom: '6px' }}>
                {lang === 'Kannada' ? p.titleKn : p.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4' }}>
                "{lang === 'Kannada' ? p.kannada : p.english}"
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
