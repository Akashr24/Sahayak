import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneCall, PhoneOff, Mic, Volume2, ShieldAlert, CheckCircle2, User, MapPin, Sparkles, Siren, Cpu } from 'lucide-react';

export default function IncomingCallModal({ activeCall, onAnswered, onHangup, onTriageComplete }) {
  const [callState, setCallState] = useState('RINGING'); // RINGING, IN_CALL, TRIAGING, COMPLETED
  const [transcript, setTranscript] = useState('');
  const [audioCtx, setAudioCtx] = useState(null);
  const ringIntervalRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);

  // Play pyttsx3 TTS audio from backend, fallback to Web Speech API
  const playBackendTTS = (text) => {
    const encoded = encodeURIComponent(text);
    const url = `http://localhost:5000/api/voice/tts?text=${encoded}&language=en-IN&rate=140`;
    setTtsAudioUrl(url);
    setTimeout(() => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.load();
        ttsAudioRef.current.play().catch(() => {
          // Fallback: Web Speech API
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'kn-IN'; u.rate = 0.9;
            window.speechSynthesis.speak(u);
          }
        });
      }
    }, 80);
  };

  // Synthesize realistic telephone ring-ring using Web Audio API
  const playTelephoneRing = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Dual-tone frequency of standard telephone bell (440Hz + 480Hz)
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);

      return ctx;
    } catch (e) {
      console.warn('Audio ringtone autoplay restricted until interaction', e);
      return null;
    }
  };

  useEffect(() => {
    if (activeCall && activeCall.status === 'RINGING') {
      setCallState('RINGING');
      setTranscript(activeCall.speechTranscript || '');

      // Trigger first ring
      playTelephoneRing();
      // Repeat ring tone every 3 seconds
      ringIntervalRef.current = setInterval(() => {
        playTelephoneRing();
      }, 3000);
    } else if (!activeCall) {
      clearInterval(ringIntervalRef.current);
    }

    return () => clearInterval(ringIntervalRef.current);
  }, [activeCall]);

  if (!activeCall) return null;

  const handleAnswer = async () => {
    clearInterval(ringIntervalRef.current);
    try {
      await fetch('http://localhost:5000/api/calls/answer', { method: 'POST' });
      setCallState('IN_CALL');
      if (onAnswered) onAnswered();

      // Greet caller using pyttsx3 backend TTS (fallback to Web Speech API)
      const welcomeText = "ನಮಸ್ಕಾರ ಶಿರ್ವಾ ಸಹಾಯಕ, ನಿಮ್ಮ ಕರೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಅಗತ್ಯವನ್ನು ತಿಳಿಸಿ.";
      playBackendTTS(welcomeText);
    } catch (err) {
      console.error(err);
    }
  };

  const handleHangup = async () => {
    clearInterval(ringIntervalRef.current);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ''; }
    try {
      await fetch('http://localhost:5000/api/calls/hangup', { method: 'POST' });
      if (onHangup) onHangup();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunTriage = async () => {
    setCallState('TRIAGING');
    try {
      const res = await fetch('http://localhost:5000/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript || activeCall.speechTranscript || 'Urgent senior request',
          seniorName: activeCall.seniorName,
          seniorPhone: activeCall.callerPhone,
          location: activeCall.location,
          language: activeCall.language || 'Kannada'
        })
      });
      const data = await res.json();
      setCallState('COMPLETED');
      if (onTriageComplete) onTriageComplete(data);
      setTimeout(() => {
        handleHangup();
      }, 3500);
    } catch (err) {
      console.error(err);
      alert('Triage process failed');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(7, 13, 30, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      {/* Hidden pyttsx3 TTS audio player */}
      {ttsAudioUrl && <audio ref={ttsAudioRef} src={ttsAudioUrl} style={{ display: 'none' }} />}

      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '32px',
        border: callState === 'RINGING' ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.15)',
        boxShadow: callState === 'RINGING' ? '0 0 40px rgba(234, 179, 8, 0.35)' : '0 10px 30px rgba(0,0,0,0.6)',
        position: 'relative',
        textAlign: 'center',
        borderRadius: '24px'
      }}>
        
        {/* Flashing Ringing Badge */}
        {callState === 'RINGING' && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(234, 179, 8, 0.2)',
            color: '#fbbf24',
            border: '1px solid #eab308',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '700',
            letterSpacing: '0.04em',
            marginBottom: '16px'
          }} className="animate-pulse">
            <PhoneCall size={16} /> INCOMING SENIOR CALL VIA HELPLINE
          </div>
        )}

        {callState === 'IN_CALL' && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            border: '1px solid #10b981',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            CALL CONNECTED • LIVE AUDIO
          </div>
        )}

        {/* Dialed Destination Info */}
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>
          Senior dialed: <strong style={{ color: '#fbbf24' }}>{activeCall.dialedNumber || '+91 80 4725 0112'}</strong>
        </div>

        {/* Caller Avatar & Identity */}
        <div style={{
          width: '84px',
          height: '84px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1f3d8a 0%, #0d1b3e 100%)',
          border: '3px solid #eab308',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fbbf24',
          fontSize: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <User size={40} />
        </div>

        <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
          {activeCall.seniorName}
        </h3>
        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fbbf24', letterSpacing: '0.05em', marginBottom: '6px' }}>
          {activeCall.callerPhone}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '20px' }}>
          <MapPin size={15} color="#38bdf8" /> {activeCall.location}
        </div>

        {/* Live Audio & Transcript Section */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '14px',
          padding: '16px',
          textAlign: 'left',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
              Spoken Audio Transcript (Kannada/English):
            </span>
            {callState === 'IN_CALL' && (
              <div style={{ display: 'flex', gap: '3px' }}>
                {[10, 18, 14, 22, 12, 19, 15].map((h, i) => (
                  <span key={i} style={{ width: '3px', height: `${h}px`, background: '#34d399', borderRadius: '2px' }} />
                ))}
              </div>
            )}
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '0.95rem',
              lineHeight: '1.4',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        {/* Interactive Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
          {callState === 'RINGING' && (
            <>
              <button
                onClick={handleAnswer}
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '14px 28px',
                  borderRadius: '30px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)'
                }}
              >
                <PhoneCall size={20} /> Answer Call on Web
              </button>

              <button
                onClick={handleHangup}
                className="btn-outline"
                style={{
                  padding: '14px 24px',
                  borderRadius: '30px',
                  color: '#f87171',
                  borderColor: 'rgba(239,68,68,0.4)'
                }}
              >
                <PhoneOff size={18} /> Decline
              </button>
            </>
          )}

          {callState === 'IN_CALL' && (
            <>
              <button
                onClick={handleRunTriage}
                className="btn-police-gold"
                style={{ padding: '14px 28px', borderRadius: '30px', fontSize: '1rem' }}
              >
                <Sparkles size={18} /> AI Classify & Dispatch Volunteer / 112
              </button>

              <button
                onClick={handleHangup}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  padding: '14px 24px',
                  borderRadius: '30px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <PhoneOff size={18} /> End Call
              </button>
            </>
          )}

          {callState === 'TRIAGING' && (
            <div style={{ fontSize: '0.95rem', color: '#fbbf24', fontWeight: '600' }}>
              Processing requirement & matching verified volunteer...
            </div>
          )}

          {callState === 'COMPLETED' && (
            <div style={{ fontSize: '0.95rem', color: '#34d399', fontWeight: '700' }}>
              ✓ Call Dispatched & Logged with Shirva Police!
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
