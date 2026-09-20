import React, { useState } from 'react';
import { Phone, PhoneCall, Radio, Send, Info, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export default function HelplineDialerWidget({ helpline, onCallTriggered }) {
  const [isOpen, setIsOpen] = useState(false);
  const [callerPhone, setCallerPhone] = useState('+91 98451 22340');
  const [seniorName, setSeniorName] = useState('Saraswathi Amma (Age 74)');
  const [location, setLocation] = useState('Near Our Lady of Health Church, Shirva');
  const [requirementType, setRequirementType] = useState('MEDICINE');
  const [customText, setCustomText] = useState('ನನಗೆ ಬಿಪಿ ಮಾತ್ರೆ ಬೇಕು, ಶಿರ್ವಾ ಮೆಡಿಕಲ್ಸ್ ನಿಂದ ಮತ್ತಾರ್ ಗೆ ಕಳುಹಿಸಿ (Need BP tablets from Shirva Medicals to Mattar)');
  const [isDialing, setIsDialing] = useState(false);
  const [copied, setCopied] = useState(false);

  const presets = [
    {
      label: '💊 Medicine Delivery (Kannada)',
      type: 'MEDICINE',
      text: 'ನನಗೆ ಬಿಪಿ ಮಾತ್ರೆ ಬೇಕು, ಶಿರ್ವಾ ಮೆಡಿಕಲ್ಸ್ ನಿಂದ ಮತ್ತಾರ್ ಗೆ ಕಳುಹಿಸಿ (Need BP tablets from Shirva Medicals to Mattar)',
      name: 'Saraswathi Amma (Age 74)',
      loc: 'Mattar Cross Road, Shirva',
      phone: '+91 97410 88231'
    },
    {
      label: '🚨 Heart Pain Emergency (112 Critical)',
      type: 'EMERGENCY',
      text: 'ನನಗೆ ಎದೆಯಲ್ಲಿ ವಿಪರೀತ ನೋವು ಇದೆ ಮತ್ತು ಉಸಿರಾಟ ಕಷ್ಟವಾಗುತ್ತಿದೆ (Severe chest pain and breathlessness)',
      name: 'Benedict D’Souza (Age 81)',
      loc: 'Manchakal Junction, Shirva',
      phone: '+91 94491 55672'
    },
    {
      label: '🛺 Auto-Rickshaw to Shirva PHC',
      type: 'TRANSPORT',
      text: 'Need an auto-rickshaw to visit Shirva Primary Health Centre for regular checkup',
      name: 'Kamala Bai (Age 69)',
      loc: 'Paniyadi Temple Road, Shirva',
      phone: '+91 98860 11982'
    }
  ];

  const handleSelectPreset = (p) => {
    setRequirementType(p.type);
    setCustomText(p.text);
    setSeniorName(p.name);
    setLocation(p.loc);
    setCallerPhone(p.phone);
  };

  const handleSimulateCall = async () => {
    setIsDialing(true);
    try {
      const res = await fetch('http://localhost:5000/api/calls/trigger-incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerPhone,
          seniorName,
          location,
          spokenText: customText,
          language: requirementType === 'TRANSPORT' ? 'English' : 'Kannada'
        })
      });
      if (res.ok) {
        setIsDialing(false);
        setIsOpen(false);
        if (onCallTriggered) onCallTriggered();
      }
    } catch (err) {
      console.error(err);
      alert('Error triggering incoming call');
      setIsDialing(false);
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(helpline?.primaryNumber || '+91 80 4725 0112');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(13, 27, 62, 0.95) 0%, rgba(7, 13, 30, 0.98) 100%)',
      border: '1px solid rgba(234, 179, 8, 0.35)',
      borderRadius: '16px',
      padding: '16px 20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      marginBottom: '20px'
    }}>
      
      {/* Banner Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#070d1e'
          }} className="animate-pulse">
            <PhoneCall size={20} />
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Dedicated Senior Citizen Voice Helpline</span>
              <span className="badge-verified" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>Active 24/7</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fbbf24', letterSpacing: '0.04em' }}>
                {helpline?.primaryNumber || '+91 80 4725 0112'}
              </span>

              <button
                onClick={handleCopyNumber}
                className="btn-outline"
                style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                title="Copy Number"
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                (Toll-Free: <strong style={{ color: '#fff' }}>{helpline?.tollFree || '1800-889-0112'}</strong>)
              </span>
            </div>
          </div>
        </div>

        {/* Right Action: Simulate Caller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn-police-gold"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Phone size={15} /> Simulate Senior Dialing In {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expandable Simulator Tray */}
      {isOpen && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '600' }}>
            📲 Test Live Incoming Telephony (Triggers Immediate Ringing on Web Console):
          </div>

          {/* Quick Scenario Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSelectPreset(p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#cbd5e1',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#eab308'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Caller Mobile Number:
              </label>
              <input
                type="text"
                value={callerPhone}
                onChange={(e) => setCallerPhone(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Senior Citizen Name:
              </label>
              <input
                type="text"
                value={seniorName}
                onChange={(e) => setSeniorName(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Location in Shirva:
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Spoken Requirement upon call connection:
            </label>
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={13} /> Real GSM webhook endpoint: <code>POST /api/voice/webhook/incoming</code>
            </div>

            <button
              onClick={handleSimulateCall}
              disabled={isDialing}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '8px 20px', fontSize: '0.85rem' }}
            >
              <PhoneCall size={15} /> {isDialing ? 'Dialing...' : 'Place Call to Web Now'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
