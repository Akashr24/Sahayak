import React, { useState, useEffect } from 'react';
import { Shield, Phone, Users, Siren, MapPin, Radio, HeartHandshake, FileCheck, PhoneCall } from 'lucide-react';
import SeniorVoicePortal from './components/SeniorVoicePortal';
import PoliceCommandCenter from './components/PoliceCommandCenter';
import VolunteerPortal from './components/VolunteerPortal';
import LiveRadarTrackerMap from './components/LiveRadarTrackerMap';
import IncomingCallModal from './components/IncomingCallModal';
import HelplineDialerWidget from './components/HelplineDialerWidget';

export default function App() {
  const [activeRole, setActiveRole] = useState('VOLUNTEER'); // VOLUNTEER, SENIOR_VOICE, POLICE_ADMIN, MAP
  const [trackedPhone, setTrackedPhone] = useState('');

  // Called from anywhere to jump to Map tab and pre-fill phone
  const handleTrackPhone = (phone) => {
    setTrackedPhone(phone);
    setActiveRole('MAP');
  };
  const [stats, setStats] = useState({
    totalVolunteers: 4,
    verifiedVolunteersCount: 3,
    pendingVolunteersCount: 1,
    activeRequestsCount: 1,
    emergency112Count: 0,
    resolvedRequestsCount: 1,
    helpline: {
      primaryNumber: '+91 80 4725 0112',
      tollFree: '1800-889-0112'
    }
  });

  const [activeIncomingCall, setActiveIncomingCall] = useState(null);

  const [loggedVolunteer, setLoggedVolunteer] = useState(() => {
    try {
      const saved = localStorage.getItem('sahayak_volunteer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const fetchStats = async () => {
    try {
      const saved = localStorage.getItem('sahayak_volunteer_user');
      setLoggedVolunteer(saved ? JSON.parse(saved) : null);
    } catch {
      setLoggedVolunteer(null);
    }
    try {
      const res = await fetch('http://localhost:5000/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.currentCall && data.currentCall.status === 'RINGING') {
          setActiveIncomingCall(data.currentCall);
        }
      }
    } catch (err) {
      console.warn('API sync warning: Server might still be launching', err);
    }
  };

  // Connect to live SSE Call Stream
  useEffect(() => {
    fetchStats();

    let eventSource = null;
    try {
      eventSource = new EventSource('http://localhost:5000/api/calls/stream');

      eventSource.addEventListener('INIT', (e) => {
        const data = JSON.parse(e.data);
        if (data.currentCall && data.currentCall.status === 'RINGING') {
          setActiveIncomingCall(data.currentCall);
        }
      });

      eventSource.addEventListener('INCOMING_CALL', (e) => {
        const callData = JSON.parse(e.data);
        console.log('🔔 [LIVE INCOMING CALL ON WEB]', callData);
        setActiveIncomingCall(callData);
      });

      eventSource.addEventListener('CALL_ANSWERED', (e) => {
        const callData = JSON.parse(e.data);
        setActiveIncomingCall(prev => prev ? { ...prev, status: 'ANSWERED' } : callData);
      });

      eventSource.addEventListener('CALL_ENDED', () => {
        setActiveIncomingCall(null);
        fetchStats();
      });

      eventSource.onerror = () => {
        // SSE retry
      };
    } catch (err) {
      console.error('SSE initialization error', err);
    }

    const interval = setInterval(fetchStats, 6000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Real-time Incoming Call Ringing Overlay */}
      {activeIncomingCall && (
        <IncomingCallModal
          activeCall={activeIncomingCall}
          onAnswered={() => fetchStats()}
          onHangup={() => {
            setActiveIncomingCall(null);
            fetchStats();
          }}
          onTriageComplete={(result) => {
            fetchStats();
            if (result.isEmergency) {
              setActiveRole('POLICE_ADMIN');
            }
          }}
        />
      )}

      {/* Top Police Department Masthead */}
      <header style={{
        background: 'linear-gradient(180deg, rgba(7, 13, 30, 0.98) 0%, rgba(13, 27, 62, 0.95) 100%)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#070d1e',
              boxShadow: '0 4px 14px rgba(234, 179, 8, 0.4)'
            }}>
              <Shield size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', letterSpacing: '0.02em' }}>
                  SAHAYAK <span style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: '700' }}>(ಸಹಾಯಕ)</span>
                </span>
                <span className="badge-verified" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', borderColor: 'rgba(234, 179, 8, 0.35)', fontSize: '0.7rem' }}>
                  SHIRVA POLICE
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Community Assistance Platform for Senior Citizens • HPL 2026 PS 03
              </div>
            </div>
          </div>

          {/* Role Navigation Switcher */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setActiveRole('SENIOR_VOICE')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeRole === 'SENIOR_VOICE' ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'transparent',
                color: activeRole === 'SENIOR_VOICE' ? '#070d1e' : '#cbd5e1',
                fontWeight: activeRole === 'SENIOR_VOICE' ? '800' : '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Phone size={15} /> Senior Voice Line
            </button>

            <button
              onClick={() => setActiveRole('POLICE_ADMIN')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeRole === 'POLICE_ADMIN' ? 'linear-gradient(135deg, #1f3d8a 0%, #15295c 100%)' : 'transparent',
                color: activeRole === 'POLICE_ADMIN' ? '#fff' : '#cbd5e1',
                fontWeight: activeRole === 'POLICE_ADMIN' ? '800' : '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: activeRole === 'POLICE_ADMIN' ? '2px solid #eab308' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Shield size={15} color={activeRole === 'POLICE_ADMIN' ? '#eab308' : 'currentColor'} /> Police Command Center
              {stats.pendingVolunteersCount > 0 && (
                <span style={{ background: '#f59e0b', color: '#070d1e', padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '800' }}>
                  {stats.pendingVolunteersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveRole('VOLUNTEER')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeRole === 'VOLUNTEER' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeRole === 'VOLUNTEER' ? '#fff' : '#cbd5e1',
                fontWeight: activeRole === 'VOLUNTEER' ? '800' : '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <HeartHandshake size={15} /> {loggedVolunteer ? `Volunteer (${loggedVolunteer.name?.split(' ')[0]})` : 'Volunteer Portal (Login)'}
              {loggedVolunteer && (
                <span style={{
                  background: 'rgba(255,255,255,0.22)',
                  color: '#fff',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  letterSpacing: '0.02em'
                }}>
                  {loggedVolunteer.policeBadgeNo || 'Active'}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveRole('MAP')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeRole === 'MAP' ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'transparent',
                color: activeRole === 'MAP' ? '#070d1e' : '#cbd5e1',
                fontWeight: activeRole === 'MAP' ? '800' : '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Radio size={15} /> Geo-Radar
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content View */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '20px 24px 48px' }}>
        
        {/* Dedicated Phone Helpline Banner with Live Telephony Dial-In */}
        <HelplineDialerWidget
          helpline={stats.helpline}
          onCallTriggered={() => fetchStats()}
        />

        {activeRole === 'SENIOR_VOICE' && (
          <SeniorVoicePortal onRefreshNeeded={fetchStats} />
        )}

        {activeRole === 'POLICE_ADMIN' && (
          <PoliceCommandCenter stats={stats} onDataChanged={fetchStats} onTrackPhone={handleTrackPhone} />
        )}

        {activeRole === 'VOLUNTEER' && (
          <VolunteerPortal onRefreshNeeded={fetchStats} />
        )}

        {activeRole === 'MAP' && (
          <LiveRadarTrackerMap initialPhone={trackedPhone} />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: 'rgba(7, 13, 30, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '0.82rem',
        color: '#64748b'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>Sahayak Community Assistance Platform</strong> • Official Problem Statement PS 03
          </div>
          <div>
            Sponsor: <span style={{ color: '#fbbf24' }}>Shirva Police Station</span> • Organizers: <span style={{ color: '#38bdf8' }}>SMVITM Bantakal & Code Troopers</span>
          </div>
          <div>
            Senior Citizen Dedicated Line: <strong style={{ color: '#fbbf24' }}>{stats.helpline?.primaryNumber || '+91 80 4725 0112'}</strong> • Emergency: <strong>112</strong>
          </div>
        </div>
      </footer>

    </div>
  );
}
