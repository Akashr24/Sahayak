import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  CheckSquare, 
  AlertCircle, 
  Sparkles, 
  Navigation,
  LogOut,
  Power,
  KeyRound
} from 'lucide-react';
import confetti from 'canvas-confetti';
import VolunteerLogin from './VolunteerLogin';

export default function VolunteerPortal({ onRefreshNeeded }) {
  const [volunteers, setVolunteers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [forceShowLogin, setForceShowLogin] = useState(false);
  
  // Persistent active logged-in volunteer
  const [currentVolunteer, setCurrentVolunteer] = useState(() => {
    try {
      const saved = localStorage.getItem('sahayak_volunteer_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // New volunteer form state
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    organization: 'Lions Club of Shirva',
    location: 'Shirva Market Road',
    skills: ['Medicine Purchase', 'Vehicle Available']
  });

  const fetchData = async () => {
    try {
      const [vRes, rRes] = await Promise.all([
        fetch('http://localhost:5000/api/volunteers'),
        fetch('http://localhost:5000/api/requests')
      ]);
      const [vData, rData] = await Promise.all([vRes.json(), rRes.json()]);
      setVolunteers(vData);
      setRequests(rData);
    } catch (err) {
      console.error('Error fetching volunteer portal data', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Determine currently active volunteer from state or fetched volunteers
  const activeVolunteer = volunteers.find(v => v.id === currentVolunteer?.id) || currentVolunteer;

  // Filter tasks assigned to this volunteer or pending tasks
  const myTasks = requests.filter(r => r.assignedVolunteerId === activeVolunteer?.id);
  const unassignedTasks = requests.filter(r => r.status === 'PENDING' && !r.escalatedTo112);

  const handleLogout = () => {
    try {
      localStorage.removeItem('sahayak_volunteer_user');
    } catch (e) {}
    setCurrentVolunteer(null);
  };

  const handleToggleAvailability = async () => {
    if (!activeVolunteer || activeVolunteer.verificationStatus !== 'VERIFIED') {
      alert('Only verified volunteers with an active Police Badge can toggle availability status.');
      return;
    }
    const newStatus = !activeVolunteer.isAvailable;
    try {
      const res = await fetch(`http://localhost:5000/api/volunteers/${activeVolunteer.id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAvailable: newStatus,
          actor: `Volunteer ${activeVolunteer.name}`
        })
      });
      if (res.ok) {
        fetchData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update availability');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/requests/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          actor: `Volunteer ${activeVolunteer.name} (${activeVolunteer.policeBadgeNo || 'Volunteer'})`,
          note: `Volunteer progressed task to ${newStatus}`
        })
      });
      if (res.ok) {
        if (newStatus === 'RESOLVED') {
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.7 }
          });
        }
        fetchData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update task status');
    }
  };

  const handleClaimTask = async (taskId) => {
    if (activeVolunteer?.verificationStatus !== 'VERIFIED') {
      alert('Police Verification Required: Only volunteers approved by Shirva Police Station can accept senior citizen requests.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/requests/${taskId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteerId: activeVolunteer.id,
          actor: `Self-assigned by ${activeVolunteer.name}`
        })
      });
      if (res.ok) {
        fetchData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err) {
      console.error(err);
      alert('Error claiming task');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      if (res.ok) {
        const newVol = await res.json();
        setShowRegisterModal(false);
        setRegForm({
          name: '',
          phone: '',
          organization: 'Lions Club of Shirva',
          location: 'Shirva Market Road',
          skills: ['Medicine Purchase', 'Vehicle Available']
        });
        await fetchData();
        setCurrentVolunteer(newVol);
        try {
          localStorage.setItem('sahayak_volunteer_user', JSON.stringify(newVol));
        } catch (e) {}
        alert(`Volunteer application submitted for ${newVol.name}! Now switch to the 'Shirva Police Command Center' tab to approve and issue the police badge.`);
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting registration');
    }
  };

  // If not logged in or explicitly requested, show the dedicated VolunteerLogin screen!
  if (!currentVolunteer || forceShowLogin) {
    return (
      <VolunteerLogin
        onLoginSuccess={(vol) => {
          setCurrentVolunteer(vol);
          setForceShowLogin(false);
          try {
            localStorage.setItem('sahayak_volunteer_user', JSON.stringify(vol));
          } catch (e) {}
          fetchData();
          if (onRefreshNeeded) onRefreshNeeded();
        }}
        onCancel={currentVolunteer ? () => setForceShowLogin(false) : null}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Volunteer Active Profile Header */}
      {/* Volunteer Active Profile Header with Liquid Glass */}
      <div className="liquid-glass liquid-glass-card" style={{ padding: '24px 28px', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="profile-avatar-border" style={{
              width: '62px',
              height: '62px',
              margin: 0,
              background: activeVolunteer?.verificationStatus === 'VERIFIED' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.45)'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: activeVolunteer?.verificationStatus === 'VERIFIED' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.4rem',
                fontWeight: '800',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)'
              }}>
                {activeVolunteer?.name?.charAt(0) || 'V'}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
                  {activeVolunteer?.name}
                </span>

                {activeVolunteer?.verificationStatus === 'VERIFIED' ? (
                  <span className="badge-verified">
                    <Shield size={12} /> Police Verified: {activeVolunteer?.policeBadgeNo}
                  </span>
                ) : (
                  <span className="badge-pending">
                    <Clock size={12} /> Pending Police Approval
                  </span>
                )}

                <span style={{
                  fontSize: '0.72rem',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  background: activeVolunteer?.isAvailable ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.25)',
                  color: activeVolunteer?.isAvailable ? '#34d399' : '#94a3b8',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: activeVolunteer?.isAvailable ? '#10b981' : '#64748b'
                  }} />
                  {activeVolunteer?.isAvailable ? 'ON-DUTY' : 'OFF-DUTY'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: '#fbbf24', fontWeight: '600' }}>{activeVolunteer?.organization}</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> {activeVolunteer?.location}</span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> {activeVolunteer?.phone}</span>
                <span>•</span>
                <span>Rating: ⭐ {activeVolunteer?.rating || 5.0}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Duty Availability Toggle Button */}
            {activeVolunteer?.verificationStatus === 'VERIFIED' && (
              <button
                type="button"
                onClick={handleToggleAvailability}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: activeVolunteer?.isAvailable ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                  background: activeVolunteer?.isAvailable ? 'rgba(16, 185, 129, 0.18)' : 'rgba(0, 0, 0, 0.4)',
                  color: activeVolunteer?.isAvailable ? '#34d399' : '#cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Power size={14} color={activeVolunteer?.isAvailable ? '#10b981' : '#94a3b8'} />
                {activeVolunteer?.isAvailable ? 'Available for Missions' : 'Duty Paused (Offline)'}
              </button>
            )}

            {/* Persona Switcher for Quick Demo testing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Switch:</span>
              <select
                value={activeVolunteer?.id || ''}
                onChange={(e) => {
                  const found = volunteers.find(v => v.id === e.target.value);
                  if (found) {
                    setCurrentVolunteer(found);
                    try {
                      localStorage.setItem('sahayak_volunteer_user', JSON.stringify(found));
                    } catch (err) {}
                  }
                }}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontSize: '0.82rem'
                }}
              >
                {volunteers.map(v => (
                  <option key={v.id} value={v.id} style={{ background: '#0d1b3e', color: '#fff' }}>
                    {v.name} ({v.verificationStatus === 'VERIFIED' ? '✓ Verified' : '⏳ Pending'})
                  </option>
                ))}
              </select>
            </div>

            {/* Switch to Login Screen */}
            <button
              type="button"
              onClick={() => setForceShowLogin(true)}
              className="btn-outline"
              style={{
                padding: '7px 12px',
                fontSize: '0.82rem',
                color: '#34d399',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Switch Account or Open Login Page"
            >
              <KeyRound size={14} /> Volunteer Login Screen
            </button>

            {/* Logout / Exit */}
            <button
              type="button"
              onClick={handleLogout}
              className="btn-outline"
              style={{
                padding: '7px 12px',
                fontSize: '0.82rem',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Sign Out of Volunteer Portal"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Verification Warning Notice if unverified */}
      {activeVolunteer?.verificationStatus !== 'VERIFIED' && (
        <div style={{ background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.35)', padding: '14px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={22} color="#f59e0b" />
          <div style={{ fontSize: '0.85rem', color: '#fef3c7' }}>
            <strong>Police Verification Pending:</strong> Shirva Police Station is reviewing your background and ID documents. You will be able to accept senior citizen assistance tasks once the Sub-Inspector issues your official badge.
          </div>
        </div>
      )}

      {/* Main Task Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Left Column: Tasks Assigned to Me */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={18} color="#10b981" /> Tasks Assigned to Me ({myTasks.length})
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Live Senior Citizen Support Missions</span>
          </div>

          {myTasks.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <Sparkles size={32} color="#64748b" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#94a3b8' }}>No Active Assigned Tasks</div>
              <div style={{ fontSize: '0.8rem' }}>Check the unassigned broadcast pool on the right to accept tasks.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {myTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '18px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: task.status === 'RESOLVED' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>{task.id}</span>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>{task.seniorName}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} /> {task.location}
                      </div>
                    </div>

                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: task.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: task.status === 'RESOLVED' ? '#34d399' : '#38bdf8'
                    }}>
                      {task.status}
                    </span>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '14px' }}>
                    <strong>Requirement:</strong> {task.description}
                  </div>

                  {/* Action Steps Progression */}
                  {task.status !== 'RESOLVED' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => alert(`Calling senior citizen ${task.seniorName} at ${task.seniorPhone}...`)}
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      >
                        <Phone size={14} /> Call {task.seniorPhone}
                      </button>

                      {task.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'IN_PROGRESS')}
                          className="btn-primary"
                          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                        >
                          <Navigation size={14} /> Mark "On My Way"
                        </button>
                      )}

                      {task.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, 'RESOLVED')}
                          className="btn-primary"
                          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontSize: '0.8rem', padding: '6px 14px' }}
                        >
                          <CheckCircle2 size={14} /> Complete & Close Task
                        </button>
                      )}
                    </div>
                  )}

                  {task.status === 'RESOLVED' && (
                    <div style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Task successfully completed & audit logged with Shirva Police.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Unassigned Senior Requests in Shirva (Pool) */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#f59e0b" /> Nearby Unassigned Requests ({unassignedTasks.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Broadcast Pool</span>
          </div>

          {unassignedTasks.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#94a3b8' }}>No Pending Requests</div>
              <div style={{ fontSize: '0.8rem' }}>All current senior citizen calls have been matched.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {unassignedTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '700' }}>{task.category}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{new Date(task.createdAt).toLocaleTimeString()}</span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>{task.seniorName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <MapPin size={12} /> {task.location}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '10px' }}>
                    "{task.description}"
                  </p>

                  <button
                    onClick={() => handleClaimTask(task.id)}
                    className="btn-police-gold"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', justifyContent: 'center' }}
                  >
                    Accept & Deliver Assistance
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Volunteer Self-Registration Modal */}
      {showRegisterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '24px', border: '1px solid rgba(234, 179, 8, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Shield size={24} color="#eab308" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
                Volunteer Registration (Shirva Community)
              </h3>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>
              All applications undergo police background verification by Shirva Police Station before task dispatch authorization.
            </p>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Full Name:</label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="e.g. Sunil Kumar Hegde"
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Mobile Phone (WhatsApp):</label>
                <input
                  type="text"
                  required
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  placeholder="+91 9845X XXXXX"
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Club / Organization Affiliation:</label>
                <select
                  value={regForm.organization}
                  onChange={(e) => setRegForm({ ...regForm, organization: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', background: '#0d1b3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
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
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Area of Operation (Shirva):</label>
                <input
                  type="text"
                  required
                  value={regForm.location}
                  onChange={(e) => setRegForm({ ...regForm, location: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="submit" className="btn-police-gold" style={{ flex: 1, justifyContent: 'center' }}>
                  Submit for Police Verification
                </button>
                <button type="button" onClick={() => setShowRegisterModal(false)} className="btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
