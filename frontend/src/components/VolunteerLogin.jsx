import React, { useState } from 'react';
import { 
  Shield, 
  Phone, 
  KeyRound, 
  UserCheck, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  HeartHandshake, 
  FileBadge,
  Send,
  RefreshCw,
  Info
} from 'lucide-react';

export default function VolunteerLogin({ onLoginSuccess, onCancel }) {
  // Tabs: 'OTP', 'BADGE', 'DEMO', 'REGISTER'
  const [activeTab, setActiveTab] = useState('OTP');

  // OTP Login State
  const [phoneInput, setPhoneInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedSms, setSimulatedSms] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // Badge Login State
  const [badgeInput, setBadgeInput] = useState('');
  const [badgeLoading, setBadgeLoading] = useState(false);

  // Error / Info states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Register Form State
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    organization: 'Lions Club of Shirva',
    location: 'Shirva Market Road',
    skills: ['Medicine Purchase', 'Vehicle Available', 'First Aid'],
    notes: ''
  });
  const [regLoading, setRegLoading] = useState(false);

  // Demo Profiles list for 1-click convenience
  const demoProfiles = [
    {
      id: 'vol-001',
      name: 'Ramesh Acharya',
      phone: '+91 98451 22340',
      badge: 'SHR-VOL-101',
      org: 'Lions Club of Shirva',
      location: 'Shirva Market Road',
      status: 'VERIFIED',
      roleDescription: 'First aid, vehicle, critical medicine logistics',
      avatarColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      id: 'vol-002',
      name: 'Deepa Shetty',
      phone: '+91 98860 91823',
      badge: 'SHR-VOL-102',
      org: 'Leo Club Bantakal',
      location: 'Near SMVITM Bantakal',
      status: 'VERIFIED',
      roleDescription: 'Senior companionship & grocery assistance',
      avatarColor: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)'
    },
    {
      id: 'vol-003',
      name: 'Pradeep Kumar Nayak',
      phone: '+91 94480 34112',
      badge: 'SHR-VOL-103',
      org: 'Auto Driver Union & Red Cross',
      location: 'Manchakal Auto Stand',
      status: 'VERIFIED',
      roleDescription: '24/7 Emergency auto transport to PHC Shirva',
      avatarColor: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
    },
    {
      id: 'vol-004',
      name: 'Vikram Poojary',
      phone: '+91 87620 44519',
      badge: null,
      org: 'Independent Resident Volunteer',
      location: 'Mattar Village',
      status: 'PENDING',
      roleDescription: 'Awaiting station physical ID & background check',
      avatarColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    }
  ];

  // Request OTP
  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!phoneInput || phoneInput.replace(/[^\d]/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/volunteers/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
      setSimulatedSms({
        phone: data.cleanPhone,
        otp: data.simulatedOtp,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setSuccessMsg(`SMS verification code generated for +91 ${data.cleanPhone}`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMsg('Please enter the 4-digit verification code.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/volunteers/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, otp: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.registered && data.volunteer) {
        onLoginSuccess(data.volunteer);
      } else {
        // Not yet registered in DB, prepopulate registration
        setRegForm(prev => ({ ...prev, phone: phoneInput }));
        setActiveTab('REGISTER');
        setSuccessMsg('Phone verified! Please complete your registration for Shirva Police verification.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // Badge Login
  const handleBadgeLogin = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    if (!badgeInput.trim()) {
      setErrorMsg('Please enter your Police Badge Number (e.g. SHR-VOL-101).');
      return;
    }

    setBadgeLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/volunteers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeNo: badgeInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.volunteer);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBadgeLoading(false);
    }
  };

  // Demo 1-Click Profile Login
  const handleDemoLogin = async (profile) => {
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/volunteers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: profile.badge || profile.phone })
      });
      const data = await res.json();
      if (res.ok && data.volunteer) {
        onLoginSuccess(data.volunteer);
      } else {
        // Fallback: fetch directly by ID
        const directRes = await fetch(`http://localhost:5000/api/volunteers/${profile.id}`);
        if (directRes.ok) {
          const directData = await directRes.json();
          onLoginSuccess(directData);
        } else {
          throw new Error('Profile lookup failed');
        }
      }
    } catch (err) {
      setErrorMsg('Could not log in with demo profile. Please ensure the backend server is running.');
    }
  };

  // Registration Submit
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regForm.name || !regForm.phone) {
      setErrorMsg('Full Name and Phone Number are required.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const newVol = await res.json();
      if (!res.ok) {
        throw new Error(newVol.error || 'Failed to submit application');
      }

      setSuccessMsg(`Application submitted for ${newVol.name}! Shirva Police Station will review and issue your official badge.`);
      // Auto-login into pending state
      setTimeout(() => {
        onLoginSuccess(newVol);
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative'
    }}>
      
      {/* Background glow ambiance */}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(7, 13, 30, 0) 70%)',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        maxWidth: '560px',
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}>
        
        {/* Main Card Container */}
        <div className="glass-panel" style={{
          padding: '36px 32px',
          background: 'linear-gradient(180deg, rgba(13, 27, 62, 0.95) 0%, rgba(7, 13, 30, 0.98) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.15)',
          borderRadius: '20px'
        }}>
          
          {onCancel && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ← Back to Dashboard
              </button>
            </div>
          )}

          {/* Top Police Crest & Department Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
              marginBottom: '16px',
              position: 'relative'
            }}>
              <HeartHandshake size={34} />
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#eab308',
                color: '#070d1e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
              }}>
                <Shield size={14} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge-verified" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.72rem' }}>
                <Shield size={11} /> SHIRVA POLICE VOLUNTEER CORPS
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>• PS 03</span>
            </div>

            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: '6px'
            }}>
              Sahayak Volunteer Portal
            </h2>

            <p style={{ fontSize: '0.88rem', color: '#94a3b8', maxWidth: '420px', margin: '0 auto' }}>
              Community emergency response & senior citizen assistance network authorized by Shirva Police Station.
            </p>
          </div>

          {/* Tab Selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            background: 'rgba(0, 0, 0, 0.45)',
            padding: '5px',
            borderRadius: '14px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('OTP'); setErrorMsg(''); }}
              style={{
                padding: '8px 4px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'OTP' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'OTP' ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === 'OTP' ? '700' : '500',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
            >
              <Phone size={13} /> Mobile OTP
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('BADGE'); setErrorMsg(''); }}
              style={{
                padding: '8px 4px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'BADGE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'BADGE' ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === 'BADGE' ? '700' : '500',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
            >
              <FileBadge size={13} /> Police Badge
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('DEMO'); setErrorMsg(''); }}
              style={{
                padding: '8px 4px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'DEMO' ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'transparent',
                color: activeTab === 'DEMO' ? '#070d1e' : '#94a3b8',
                fontWeight: activeTab === 'DEMO' ? '800' : '500',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={13} /> Demo Logins
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('REGISTER'); setErrorMsg(''); }}
              style={{
                padding: '8px 4px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'REGISTER' ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'transparent',
                color: activeTab === 'REGISTER' ? '#070d1e' : '#94a3b8',
                fontWeight: activeTab === 'REGISTER' ? '800' : '500',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
            >
              <UserCheck size={13} /> Register
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              padding: '12px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '12px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#6ee7b7',
              fontSize: '0.85rem',
              marginBottom: '20px'
            }}>
              <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Simulated SMS Toast notification if OTP sent */}
          {simulatedSms && activeTab === 'OTP' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Send size={12} /> SMS GATEWAY • SHIRVA POLICE
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{simulatedSms.time}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '8px' }}>
                "Your Sahayak Volunteer login code is <strong style={{ color: '#fbbf24', fontSize: '1.05rem', letterSpacing: '0.1em' }}>{simulatedSms.otp}</strong>. Valid for 5 mins. Do not share with anyone."
              </div>
              <button
                type="button"
                onClick={() => setOtpCode(simulatedSms.otp)}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={12} /> Auto-fill {simulatedSms.otp}
              </button>
            </div>
          )}

          {/* TAB 1: Mobile Phone & OTP Login */}
          {activeTab === 'OTP' && (
            <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Registered Mobile Number
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    color: '#94a3b8',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>🇮🇳 +91</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="98451 22340"
                    disabled={otpSent}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 76px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      letterSpacing: '0.04em',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                  {otpSent && (
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpCode(''); setSimulatedSms(null); }}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Change
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '5px' }}>
                  Quick test: 98451 22340 (Ramesh) or 98860 91823 (Deepa)
                </div>
              </div>

              {/* OTP Code Input */}
              {otpSent && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1' }}>
                      4-Digit Verification Code (OTP)
                    </label>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#eab308',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RefreshCw size={11} /> Resend
                    </button>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 4-digit OTP"
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      borderRadius: '10px',
                      color: '#fbbf24',
                      fontSize: '1.2rem',
                      fontWeight: '800',
                      textAlign: 'center',
                      letterSpacing: '0.25em',
                      outline: 'none'
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', textAlign: 'center' }}>
                    Standard testing code: <strong style={{ color: '#fff' }}>1234</strong> or check simulated SMS above
                  </div>
                </div>
              )}

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={otpLoading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  justifyContent: 'center',
                  marginTop: '4px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                  cursor: otpLoading ? 'wait' : 'pointer'
                }}
              >
                {otpLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="animate-spin" /> Verifying...
                  </span>
                ) : otpSent ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Verify & Enter Duty Dashboard <ArrowRight size={16} />
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Send SMS OTP <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: Official Police Badge ID Sign-In */}
          {activeTab === 'BADGE' && (
            <form onSubmit={handleBadgeLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                  Official Police Volunteer Badge ID
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '14px', color: '#eab308' }}>
                    <Shield size={18} />
                  </div>
                  <input
                    type="text"
                    value={badgeInput}
                    onChange={(e) => setBadgeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. SHR-VOL-101"
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 44px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      borderRadius: '10px',
                      color: '#fbbf24',
                      fontSize: '1rem',
                      fontWeight: '700',
                      letterSpacing: '0.05em',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                  Valid badge IDs: <strong style={{ color: '#fbbf24' }}>SHR-VOL-101</strong>, <strong style={{ color: '#fbbf24' }}>SHR-VOL-102</strong>, <strong style={{ color: '#fbbf24' }}>SHR-VOL-103</strong>
                </div>
              </div>

              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '0.8rem',
                color: '#fef3c7',
                display: 'flex',
                gap: '8px'
              }}>
                <Info size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  Badges are issued by the Sub-Inspector, Shirva Police Station following background vetting. Unverified recruits should sign in via Mobile OTP or apply in the Register tab.
                </div>
              </div>

              <button
                type="submit"
                disabled={badgeLoading}
                className="btn-police-gold"
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  justifyContent: 'center',
                  marginTop: '4px'
                }}
              >
                {badgeLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="animate-spin" /> Authenticating Badge...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <KeyRound size={16} /> Authenticate Official Badge
                  </span>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: 1-Click Demo Profiles */}
          {activeTab === 'DEMO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                Select a verified persona to test role-based task dispatching and live location tracking:
              </div>

              {demoProfiles.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleDemoLogin(p)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: p.avatarColor,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}>
                      {p.name.charAt(0)}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{p.name}</strong>
                        {p.status === 'VERIFIED' ? (
                          <span className="badge-verified" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>
                            <Shield size={9} /> {p.badge}
                          </span>
                        ) : (
                          <span className="badge-pending" style={{ padding: '1px 6px', fontSize: '0.65rem' }}>
                            <Clock size={9} /> Pending Police Check
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ color: '#fbbf24' }}>{p.org}</span>
                        <span>•</span>
                        <span>{p.location}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Login <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: New Citizen Volunteer Registration */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Apply to become an authorized volunteer. Applications undergo physical police background checks by Shirva PS.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="e.g. Sunil Kumar Hegde"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>
                  Mobile / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="+91 9845X XXXXX"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>
                  Organization / Union Affiliation
                </label>
                <select
                  value={regForm.organization}
                  onChange={(e) => setRegForm({ ...regForm, organization: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#0d1b3e',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                >
                  <option value="Lions Club of Shirva">Lions Club of Shirva</option>
                  <option value="Leo Club Bantakal">Leo Club Bantakal</option>
                  <option value="Rotary Club Shirva">Rotary Club Shirva</option>
                  <option value="SMVITM Bantakal Student Volunteers">SMVITM Bantakal Student Volunteers</option>
                  <option value="Auto-Rickshaw Drivers Union Shirva">Auto-Rickshaw Drivers Union Shirva</option>
                  <option value="Independent Resident Volunteer">Independent Resident Volunteer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>
                  Operating Area (Shirva Jurisdiction)
                </label>
                <input
                  type="text"
                  required
                  value={regForm.location}
                  onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                  placeholder="e.g. Manchakal Junction, Shirva"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="btn-police-gold"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  justifyContent: 'center',
                  marginTop: '6px'
                }}
              >
                {regLoading ? 'Submitting to Police System...' : 'Submit Application for Police Vetting'}
              </button>
            </form>
          )}

          {/* Official Police Trust Footer */}
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.72rem',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Shield size={12} color="#eab308" />
              <span>Karnataka State Police • Shirva PS Division</span>
            </div>
            <div>
              Senior Citizen Emergency: <strong style={{ color: '#ef4444' }}>112</strong>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
