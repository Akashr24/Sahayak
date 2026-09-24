import React, { useState, useEffect } from 'react';
import { Shield, PhoneCall, Users, HeartHandshake, LogOut, UserCheck } from 'lucide-react';
import SimpleDashboard from './components/SimpleDashboard';
import PoliceLogin from './components/PoliceLogin';
import IncomingCallModal from './components/IncomingCallModal';

export default function App() {
  const [loggedOfficer, setLoggedOfficer] = useState(() => {
    try {
      const saved = localStorage.getItem('sahayak_police_officer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [stats, setStats] = useState({
    totalVolunteers: 4,
    verifiedVolunteersCount: 3,
    activeRequestsCount: 1,
    emergency112Count: 0,
    helpline: {
      primaryNumber: '+91 80 4725 0112',
      tollFree: '1800-889-0112'
    }
  });

  const [activeIncomingCall, setActiveIncomingCall] = useState(null);

  const fetchStats = async () => {
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
      console.warn('API sync notice:', err);
    }
  };

  // Connect to live SSE for incoming phone calls
  useEffect(() => {
    if (!loggedOfficer) return;

    fetchStats();

    let eventSource = null;
    try {
      eventSource = new EventSource('http://localhost:5000/api/calls/stream');

      eventSource.addEventListener('INCOMING_CALL', (e) => {
        const callData = JSON.parse(e.data);
        setActiveIncomingCall(callData);
      });

      eventSource.addEventListener('CALL_ENDED', () => {
        setActiveIncomingCall(null);
        fetchStats();
      });
    } catch (err) {
      console.error('SSE initialization error', err);
    }

    const interval = setInterval(fetchStats, 10000);
    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [loggedOfficer]);

  const handleLogout = () => {
    localStorage.removeItem('sahayak_police_officer');
    setLoggedOfficer(null);
  };

  // If officer is not authenticated, show ONLY Police Login Screen
  if (!loggedOfficer) {
    return <PoliceLogin onLoginSuccess={(officer) => setLoggedOfficer(officer)} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0b1120' }}>
      
      {/* Real-time Call Alert Overlay (if real call arrives) */}
      {activeIncomingCall && (
        <IncomingCallModal
          activeCall={activeIncomingCall}
          onAnswered={() => fetchStats()}
          onHangup={() => {
            setActiveIncomingCall(null);
            fetchStats();
          }}
        />
      )}

      {/* Official Police Department Masthead */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.3)',
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Logo & Police Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#070d1e',
              boxShadow: '0 4px 14px rgba(234, 179, 8, 0.4)',
              flexShrink: 0
            }}>
              <Shield size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: '900', color: '#fff', letterSpacing: '0.02em' }}>
                  SAHAYAK <span style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: '700' }}>(ಸಹಾಯಕ)</span>
                </span>
                <span style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  SHIRVA POLICE STATION
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Karnataka State Police • Official Senior Citizen & Emergency Control Room
              </div>
            </div>
          </div>

          {/* Officer Info & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            
            {/* Logged in Officer Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              padding: '6px 14px',
              borderRadius: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eab308',
                color: '#070d1e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '0.9rem'
              }}>
                PSI
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff' }}>
                  {loggedOfficer.name || 'Sub-Inspector'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#fbbf24' }}>
                  Badge: <strong>{loggedOfficer.badgeNo || 'SHR-PSI-01'}</strong> • Shirva PS
                </div>
              </div>
            </div>

            {/* Helpline status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Helpline: <strong style={{ color: '#fbbf24' }}>080-47250112</strong> • 🚨 <strong>112</strong>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Logout from Police Console"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>

        </div>
      </header>

      {/* Main Content: Just the Dashboard */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '24px 20px 48px' }}>
        <SimpleDashboard />
      </main>

      {/* Simple Footer */}
      <footer style={{
        background: 'rgba(15, 23, 42, 0.98)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#64748b'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>Sahayak Police Console</strong> • Shirva Police Station (HPL 2026 PS 03)
          </div>
          <div>
            Toll-Free Senior Hotline: <strong style={{ color: '#fbbf24' }}>1800-889-0112</strong> • Emergency: <strong style={{ color: '#ef4444' }}>112</strong>
          </div>
        </div>
      </footer>

    </div>
  );
}
