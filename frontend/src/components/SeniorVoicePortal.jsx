import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, ShieldAlert, CheckCircle2, Clock, MapPin, Sparkles, AlertTriangle, HeartPulse, User, Radio, Cpu } from 'lucide-react';
import { WAVAwbRecorder } from '../utils/audioRecorder';

const PRESET_SCENARIOS = [
  {
    id: 'chest-pain-emergency',
    title: '🚨 Critical Emergency (112)',
    kannadaText: 'ನನಗೆ ಎದೆಯಲ್ಲಿ ವಿಪರೀತ ನೋವು ಇದೆ ಮತ್ತು ಉಸಿರಾಟ ಕಷ್ಟವಾಗುತ್ತಿದೆ, ಮಂಚಕಲ್ ಜಂಕ್ಷನ್ ಬಳಿ',
    englishText: 'I am having severe chest pain and breathlessness near Manchakal Junction, Shirva.',
    language: 'Kannada',
    location: 'Manchakal Junction, Shirva',
    type: 'EMERGENCY'
  },
  {
    id: 'medicine-delivery',
    title: '💊 Urgent BP Medicine Delivery',
    kannadaText: 'ನನಗೆ ಶಿರ್ವಾ ಮೆಡಿಕಲ್ಸ್ ನಿಂದ ಬಿಪಿ ಮಾತ್ರೆಗಳು ತಕ್ಷಣ ಬೇಕಾಗಿದೆ, ಮತ್ತಾರ್ ಕ್ರಾಸ್ ಗೆ ತಲುಪಿಸಿ',
    englishText: 'Need urgent blood pressure tablets from Shirva Medicals delivered to Mattar Cross.',
    language: 'Kannada',
    location: 'Mattar Cross Road, Shirva',
    type: 'MEDICINE'
  },
  {
    id: 'auto-transport',
    title: '🛺 Auto-Rickshaw to Shirva Clinic',
    kannadaText: 'ಶಿರ್ವಾ ಸಮುದಾಯ ಆರೋಗ್ಯ ಕೇಂದ್ರಕ್ಕೆ ಹೋಗಲು ಆಟೋ ರಿಕ್ಷಾ ಬೇಕಾಗಿದೆ',
    englishText: 'Need an auto-rickshaw to visit Shirva Primary Health Centre (PHC).',
    language: 'Kannada',
    location: 'Near Our Lady of Health Church, Shirva',
    type: 'TRANSPORT'
  },
  {
    id: 'grocery-ration',
    title: '🛒 Daily Grocery & Ration Need',
    kannadaText: 'ನಡೆದಾಡಲು ಆಗುತ್ತಿಲ್ಲ, ದಿನಸಿ ಮತ್ತು ಹಾಲು ತಂದುಕೊಡಲು ಯಾರಾದರೂ ಸಹಾಯ ಬೇಕು',
    englishText: 'Unable to walk, need someone to buy fresh milk and rations from Shirva Market.',
    language: 'English',
    location: 'Paniyadi Temple Road, Shirva',
    type: 'GROCERY'
  }
];

export default function SeniorVoicePortal({ onRefreshNeeded }) {
  const [callState, setCallState] = useState('IDLE'); // IDLE, DIALING, CONNECTED, PROCESSING, COMPLETED
  const [selectedLanguage, setSelectedLanguage] = useState('Kannada');
  const [seniorName, setSeniorName] = useState('Saraswathi Amma');
  const [seniorPhone, setSeniorPhone] = useState('+91 97410 88231');
  const [seniorLocation, setSeniorLocation] = useState('Manchakal Junction, Shirva');

  // Engine mode: 'browser' uses Web Speech API; 'backend' uses pyttsx3 + speech_recognition
  const [engineMode, setEngineMode] = useState('browser');

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [responseResult, setResponseResult] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  // Backend engine states
  const [isRecording, setIsRecording] = useState(false);
  const [backendStatus, setBackendStatus] = useState('');
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [backendVoices, setBackendVoices] = useState([]);
  const [isServerListening, setIsServerListening] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const recorderRef = useRef(null);
  const ttsAudioRef = useRef(null);

  // Setup Web Speech Recognition if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage === 'Kannada' ? 'kn-IN' : 'en-IN';

      recognition.onresult = (event) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLanguage]);

  // Fetch available pyttsx3 voices on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/voice/voices')
      .then(r => r.json())
      .then(d => setBackendVoices(d.voices || []))
      .catch(() => {});
  }, []);

  // Call timer effect
  useEffect(() => {
    if (callState === 'CONNECTED') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === 'IDLE') setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // Text to Speech — browser Web Speech API (fallback)
  const speakResponse = (text, lang) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'Kannada' ? 'kn-IN' : 'en-IN';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Play pyttsx3 TTS audio from backend
  const playBackendTTS = (text, lang) => {
    const encoded = encodeURIComponent(text);
    const langCode = lang === 'Kannada' ? 'kn-IN' : 'en-IN';
    const url = `http://localhost:5000/api/voice/tts?text=${encoded}&language=${langCode}`;
    setTtsAudioUrl(url);
    setTimeout(() => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.load();
        ttsAudioRef.current.play().catch(e => console.warn('TTS play:', e));
      }
    }, 80);
  };

  // Record from browser mic and transcribe via speech_recognition backend
  const toggleBackendRecording = async () => {
    if (isRecording) {
      // Stop and upload
      setIsRecording(false);
      setBackendStatus('Transcribing with speech_recognition...');
      try {
        const wavBlob = await recorderRef.current.stop();
        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('language', selectedLanguage === 'Kannada' ? 'kn-IN' : 'en-IN');
        const res = await fetch('http://localhost:5000/api/voice/transcribe', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          setTranscript(data.transcript);
          setBackendStatus(`✅ Recognized: "${data.transcript}"`);
        } else {
          setBackendStatus(`⚠️ ${data.error}`);
        }
      } catch (err) {
        setBackendStatus('❌ Recording/transcription failed.');
        console.error(err);
      }
    } else {
      // Start recording
      try {
        recorderRef.current = new WAVAwbRecorder();
        await recorderRef.current.start();
        setIsRecording(true);
        setBackendStatus('🎙️ Recording… click again to stop & transcribe.');
      } catch (err) {
        setBackendStatus('❌ Microphone access denied or unavailable.');
        console.error(err);
      }
    }
  };

  // Use server microphone via speech_recognition.Microphone
  const handleServerMicListen = async () => {
    setIsServerListening(true);
    setBackendStatus('🖥️ Server mic listening via speech_recognition.Microphone()...');
    try {
      const res = await fetch('http://localhost:5000/api/voice/listen-mic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage === 'Kannada' ? 'kn-IN' : 'en-IN',
          timeout: 7,
          phraseTimeLimit: 10
        })
      });
      const data = await res.json();
      if (data.success) {
        setTranscript(data.transcript);
        setBackendStatus(`✅ Server mic recognized: "${data.transcript}"`);
      } else {
        setBackendStatus(`⚠️ ${data.error}`);
      }
    } catch (err) {
      setBackendStatus('❌ Server mic endpoint failed.');
      console.error(err);
    } finally {
      setIsServerListening(false);
    }
  };

  // Announce on police console speakers via pyttsx3
  const handleSpeakOnConsole = async (text) => {
    try {
      await fetch('http://localhost:5000/api/voice/speak-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text || 'Sahayak Police Control Room Alert.', rate: 145 })
      });
      setBackendStatus('📢 Announced on station console via pyttsx3.');
    } catch (err) {
      setBackendStatus('❌ Console speaker failed.');
    }
  };

  const handleStartCall = () => {
    setCallState('DIALING');
    setResponseResult(null);
    setTranscript('');
    setTimeout(() => {
      setCallState('CONNECTED');
      // Greet senior warmly
      const greeting = selectedLanguage === 'Kannada' 
        ? "ನಮಸ್ಕಾರ, ಶಿರ್ವಾ ಸಹಾಯಕ ಸಹಾಯವಾಣಿಗೆ ಸ್ವಾಗತ. ನಿಮಗೆ ಯಾವ ಸಹಾಯ ಬೇಕು ಹೇಳಿ." 
        : "Hello, welcome to Shirva Sahayak community assistance hotline. How can we help you today?";
      speakResponse(greeting, selectedLanguage);
    }, 1500);
  };

  const handleEndCall = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallState('IDLE');
    setIsListening(false);
  };

  const toggleMicListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can click the presets below to simulate voice input!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = selectedLanguage === 'Kannada' ? 'kn-IN' : 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const submitVoiceRequest = async (textToSend) => {
    const speechText = textToSend || transcript;
    if (!speechText.trim()) {
      alert('Please speak or select a requirement first.');
      return;
    }

    setCallState('PROCESSING');

    try {
      const res = await fetch('http://localhost:5000/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: speechText,
          seniorName,
          seniorPhone,
          location: seniorLocation,
          language: selectedLanguage
        })
      });
      const data = await res.json();
      setResponseResult(data);
      setCallState('COMPLETED');

      // Speak back the response — use pyttsx3 backend TTS if in backend engine mode
      if (data.responseSpeech) {
        if (engineMode === 'backend' && data.ttsAudioUrl) {
          playBackendTTS(data.responseSpeech, selectedLanguage);
        } else {
          speakResponse(data.responseSpeech, selectedLanguage);
        }
      }

      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err) {
      console.error(err);
      alert('Error communicating with Sahayak Server. Ensure backend is running.');
      setCallState('CONNECTED');
    }
  };

  const handleApplyPreset = (scenario) => {
    const text = selectedLanguage === 'Kannada' ? scenario.kannadaText : scenario.englishText;
    setTranscript(text);
    setSeniorLocation(scenario.location);
    if (callState !== 'CONNECTED') {
      setCallState('CONNECTED');
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hidden pyttsx3 TTS audio player */}
      {ttsAudioUrl && (
        <audio ref={ttsAudioRef} src={ttsAudioUrl} style={{ display: 'none' }} />
      )}
      {/* Top Banner with Senior Assistance Context */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(13, 27, 62, 0.7) 100%)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge-verified" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                👴👵 Voice-First Elderly Access
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Designed for 60+ residents of Shirva
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
              Shirva Sahayak Voice Assistance Line
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Toll-Free Senior Hotline: <strong style={{ color: '#fbbf24' }}>1800-SHIRVA-CARE (1800-744-782)</strong> • Spoken in Kannada, Tulu & English
            </p>
          </div>

          {/* Language Selector + Engine Mode Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Language:</span>
              {['Kannada', 'English'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: selectedLanguage === lang ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'transparent',
                    color: selectedLanguage === lang ? '#070d1e' : '#cbd5e1',
                    fontWeight: selectedLanguage === lang ? '700' : '500',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {lang === 'Kannada' ? 'ಕನ್ನಡ (Kannada)' : 'English'}
                </button>
              ))}
            </div>

            {/* Engine mode switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Engine:</span>
              {[['browser', '🌐 Web Speech API'], ['backend', '🐍 pyttsx3 + SR']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setEngineMode(mode)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: engineMode === mode ? (mode === 'backend' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255,255,255,0.12)') : 'transparent',
                    color: engineMode === mode ? '#fff' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: engineMode === mode ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Phone Console & Presets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 480px) 1fr', gap: '24px' }}>
        
        {/* Phone Handset / Interactive Call Station */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          
          {/* Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: callState === 'CONNECTED' ? '#10b981' : (callState === 'DIALING' ? '#f59e0b' : '#64748b'),
              boxShadow: callState === 'CONNECTED' ? '0 0 10px #10b981' : 'none'
            }} />
            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: callState === 'CONNECTED' ? '#34d399' : '#94a3b8' }}>
              {callState === 'IDLE' && 'Line Idle • Ready to Dial'}
              {callState === 'DIALING' && 'Connecting to Shirva Sahayak IVR...'}
              {callState === 'CONNECTED' && `Call Active (${formatSeconds(callDuration)})`}
              {callState === 'PROCESSING' && 'AI Classifying Intent & Urgency...'}
              {callState === 'COMPLETED' && 'Request Dispatched & Confirmed'}
            </span>
          </div>

          {/* Caller Screen Simulation */}
          <div style={{
            width: '100%',
            background: 'linear-gradient(180deg, #09132b 0%, #050b18 100%)',
            border: '2px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Shirva Police Community Assistance Net
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>
              {seniorName}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
              <MapPin size={14} /> {seniorLocation}
            </div>

            {/* Audio Waveform / Status display */}
            <div style={{
              width: '100%',
              minHeight: '80px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              {callState === 'IDLE' && (
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Press the green button below to simulate dialing the senior hotline.
                </span>
              )}

              {callState === 'DIALING' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                  <PhoneCall size={20} className="animate-spin" />
                  <span style={{ fontSize: '0.9rem' }}>Ringing Shirva Police IVR...</span>
                </div>
              )}

              {(callState === 'CONNECTED' || callState === 'PROCESSING') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '28px', marginBottom: '6px' }}>
                    {[12, 24, 18, 28, 15, 26, 19, 14, 22].map((h, i) => (
                      <span
                        key={i}
                        style={{
                          width: '4px',
                          height: isListening ? `${h}px` : '6px',
                          background: isListening ? '#10b981' : '#64748b',
                          borderRadius: '2px',
                          transition: 'height 0.15s ease'
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: isListening ? '#34d399' : '#cbd5e1' }}>
                    {isListening ? 'Listening to your voice... Speak now' : 'Click Mic or Preset to speak your requirement'}
                  </span>
                </div>
              )}

              {callState === 'COMPLETED' && (
                <div style={{ color: responseResult?.isEmergency ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {responseResult?.isEmergency ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                    {responseResult?.isEmergency ? '112 Emergency Escalated' : 'Verified Volunteer Dispatched'}
                  </span>
                </div>
              )}
            </div>

            {/* Spoken Transcript preview */}
            <div style={{ width: '100%', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Spoken Transcript:</div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={selectedLanguage === 'Kannada' ? 'ಮಾತನಾಡಿದ ಮಾತುಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ...' : 'Voice spoken request will appear here...'}
                rows={3}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  padding: '8px 10px',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Call Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', width: '100%', flexWrap: 'wrap' }}>
            {callState === 'IDLE' ? (
              <button
                onClick={handleStartCall}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '14px 28px',
                  borderRadius: '30px',
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Phone size={20} /> Dial Sahayak Line
              </button>
            ) : (
              <>
                {/* Browser mic (Web Speech API) */}
                {engineMode === 'browser' && (
                  <button
                    onClick={toggleMicListening}
                    style={{
                      background: isListening ? '#ef4444' : 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '54px',
                      height: '54px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isListening ? '0 0 16px rgba(239, 68, 68, 0.6)' : 'none'
                    }}
                    title={isListening ? 'Stop Browser Mic' : 'Start Browser Speech Recognition'}
                  >
                    {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>
                )}

                {/* Backend recording buttons */}
                {engineMode === 'backend' && (
                  <>
                    <button
                      onClick={toggleBackendRecording}
                      style={{
                        background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '54px',
                        height: '54px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isRecording ? '0 0 16px rgba(239,68,68,0.6)' : '0 0 12px rgba(99,102,241,0.5)'
                      }}
                      title={isRecording ? 'Stop & Transcribe (speech_recognition)' : 'Record & Transcribe via Python SR'}
                    >
                      {isRecording ? <MicOff size={22} /> : <Cpu size={20} />}
                    </button>

                    <button
                      onClick={handleServerMicListen}
                      disabled={isServerListening}
                      style={{
                        background: isServerListening ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(99,102,241,0.4)',
                        color: '#fff',
                        borderRadius: '24px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: isServerListening ? 'not-allowed' : 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: '600'
                      }}
                      title="Use station server microphone via speech_recognition"
                    >
                      <Radio size={14} /> {isServerListening ? 'Listening…' : 'Server Mic'}
                    </button>
                  </>
                )}

                <button
                  onClick={() => submitVoiceRequest()}
                  className="btn-police-gold"
                  disabled={callState === 'PROCESSING'}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '24px',
                    fontSize: '0.95rem'
                  }}
                >
                  <Sparkles size={18} /> Confirm & Dispatch
                </button>

                <button
                  onClick={handleEndCall}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '54px',
                    height: '54px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                  }}
                  title="Hang Up Call"
                >
                  <PhoneOff size={22} />
                </button>
              </>
            )}
          </div>

          {/* Caller Details Customizer */}
          <div style={{ marginTop: '24px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={14} /> Senior Resident Profile (Simulated Line):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="text"
                value={seniorName}
                onChange={(e) => setSeniorName(e.target.value)}
                placeholder="Senior Name"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  color: '#cbd5e1',
                  fontSize: '0.8rem'
                }}
              />
              <input
                type="text"
                value={seniorLocation}
                onChange={(e) => setSeniorLocation(e.target.value)}
                placeholder="Location in Shirva"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  color: '#cbd5e1',
                  fontSize: '0.8rem'
                }}
              />
            </div>
          </div>

          {/* Backend engine status bar */}
          {engineMode === 'backend' && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
              fontSize: '0.78rem',
              color: '#a5b4fc',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap'
            }}>
              <Cpu size={12} />
              <span>{backendStatus || `🐍 pyttsx3 (${backendVoices.length} voices) + speech_recognition ready.`}</span>
              {ttsAudioUrl && (
                <button
                  onClick={() => { if (ttsAudioRef.current) { ttsAudioRef.current.load(); ttsAudioRef.current.play(); } }}
                  style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.3)', border: 'none', color: '#c7d2fe', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  <Volume2 size={11} style={{ display: 'inline', marginRight: '3px' }} />Replay pyttsx3 Audio
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: 1-Click Simulation Scenarios & Live Outcome View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1-Click Scenarios for Hackathon Evaluation */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#eab308" /> Evaluation Demo Scenarios (1-Click Presets)
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Click any scenario to inject into voice line
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {PRESET_SCENARIOS.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => handleApplyPreset(scenario)}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: scenario.type === 'EMERGENCY' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: scenario.type === 'EMERGENCY' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = scenario.type === 'EMERGENCY' ? '#ef4444' : '#eab308';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = scenario.type === 'EMERGENCY' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.08)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: scenario.type === 'EMERGENCY' ? '#fca5a5' : '#f8fafc' }}>
                      {scenario.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{scenario.language}</span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '8px', lineHeight: '1.4' }}>
                    "{selectedLanguage === 'Kannada' ? scenario.kannadaText : scenario.englishText}"
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <MapPin size={12} /> {scenario.location}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outcome Card: What the AI & Police System Decided */}
          {responseResult && (
            <div
              className={responseResult.isEmergency ? 'glass-panel-emergency' : 'glass-panel'}
              style={{
                padding: '24px',
                borderLeft: responseResult.isEmergency ? '6px solid #ef4444' : '6px solid #10b981'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {responseResult.isEmergency ? (
                    <span className="badge-emergency animate-siren">
                      🚨 112 CRITICAL EMERGENCY TRIGGERED
                    </span>
                  ) : (
                    <span className="badge-verified">
                      <CheckCircle2 size={14} /> POLICE-VERIFIED VOLUNTEER ASSIGNED
                    </span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Request ID: {responseResult.request?.id}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => speakResponse(responseResult.responseSpeech, selectedLanguage)}
                    className="btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    title="Replay using browser Web Speech API"
                  >
                    <Volume2 size={14} /> Browser TTS
                  </button>
                  <button
                    onClick={() => playBackendTTS(responseResult.responseSpeech, selectedLanguage)}
                    style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#c7d2fe', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Replay using pyttsx3 (Python backend)"
                  >
                    <Cpu size={13} /> pyttsx3
                  </button>
                  <button
                    onClick={() => handleSpeakOnConsole(responseResult.responseSpeech)}
                    style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Announce on station console speakers via pyttsx3"
                  >
                    <Radio size={13} /> Console
                  </button>
                </div>
              </div>

              {/* Spoken Response Readout */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '16px',
                fontSize: '0.95rem',
                color: '#f8fafc',
                lineHeight: '1.5'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '600', marginBottom: '4px' }}>
                  🤖 Sahayak Voice Agent Readout to Senior:
                </div>
                "{responseResult.responseSpeech}"
              </div>

              {/* Details breakdown */}
              {responseResult.isEmergency ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f87171', marginBottom: '4px' }}>
                    Emergency Protocols Activated:
                  </div>
                  <ul style={{ fontSize: '0.8rem', color: '#cbd5e1', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>Karnataka Emergency Response Support System (112) automated notification dispatched.</li>
                    <li>Shirva Police Station Quick Response Patrol van alerted to {responseResult.request?.location}.</li>
                    <li>Trigger keywords recognized: "{responseResult.matchedTrigger}".</li>
                  </ul>
                </div>
              ) : (
                responseResult.matchedVolunteer && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Assigned Volunteer</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>{responseResult.matchedVolunteer.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#34d399' }}>{responseResult.matchedVolunteer.policeBadgeNo}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Organization</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fbbf24' }}>{responseResult.matchedVolunteer.organization}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{responseResult.matchedVolunteer.phone}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Category & Urgency</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>{responseResult.request?.category}</div>
                      <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Status: Dispatched</div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
