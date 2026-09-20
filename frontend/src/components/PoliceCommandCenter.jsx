import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, CheckCircle, XCircle, AlertTriangle, Clock, MapPin, UserCheck, Search, Filter, Phone, Siren, FileText, Check, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PoliceCommandCenter({ stats, onDataChanged, onTrackPhone }) {
  const [activeTab, setActiveTab] = useState('VERIFICATION'); // VERIFICATION, INCIDENTS, EMERGENCY_112, AUDIT
  const [volunteers, setVolunteers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification filter
  const [volunteerFilter, setVolunteerFilter] = useState('ALL'); // ALL, PENDING, VERIFIED, REJECTED
  const [officerNotes, setOfficerNotes] = useState('');

  // Manual 112 Trigger Modal State
  const [showManualSosModal, setShowManualSosModal] = useState(false);
  const [sosForm, setSosForm] = useState({
    seniorName: '',
    seniorPhone: '',
    location: 'Manchakal Junction, Shirva',
    reason: 'Emergency reported via police station desk'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, rRes, aRes] = await Promise.all([
        fetch('http://localhost:5000/api/volunteers'),
        fetch('http://localhost:5000/api/requests'),
        fetch('http://localhost:5000/api/audit-logs')
      ]);
      const [vData, rData, aData] = await Promise.all([
        vRes.json(),
        rRes.json(),
        aRes.json()
      ]);
      setVolunteers(vData);
      setRequests(rData);
      setAuditLogs(aData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching police center data', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyVolunteer = async (volunteerId, action) => {
    try {
      const res = await fetch(`http://localhost:5000/api/volunteers/${volunteerId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          officerName: 'Sub-Inspector, Shirva Police Station',
          notes: officerNotes || (action === 'APPROVE' ? 'Identity verified & background cleared' : 'Verification rejected')
        })
      });
      if (res.ok) {
        if (action === 'APPROVE') {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
        setOfficerNotes('');
        fetchData();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      console.error(err);
      alert('Verification update failed');
    }
  };

  const handleManual112Trigger = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/emergency/manual-escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sosForm)
      });
      if (res.ok) {
        setShowManualSosModal(false);
        setSosForm({
          seniorName: '',
          seniorPhone: '',
          location: 'Manchakal Junction, Shirva',
          reason: 'Emergency reported via police station desk'
        });
        fetchData();
        if (onDataChanged) onDataChanged();
        setActiveTab('EMERGENCY_112');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to trigger manual 112 escalation');
    }
  };

  const filteredVolunteers = volunteers.filter(v => {
    if (volunteerFilter === 'ALL') return true;
    return v.verificationStatus === volunteerFilter;
  });

  const emergencyRequests = requests.filter(r => r.escalatedTo112);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Police Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, rgba(13, 27, 62, 0.95) 0%, rgba(7, 13, 30, 0.98) 100%)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#070d1e',
              boxShadow: '0 4px 18px rgba(234, 179, 8, 0.4)'
            }}>
              <Shield size={32} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span className="badge-verified" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', borderColor: 'rgba(234, 179, 8, 0.35)' }}>
                  Karnataka State Police • Udupi District
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Station Code: SHR-PS</span>
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                Shirva Police Station — Sahayak Command & Control
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Volunteer Verification Authority • 112 Emergency Intercept • Community Senior Citizen Safeguard
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowManualSosModal(true)}
              className="btn-danger animate-siren"
              style={{ fontSize: '0.85rem', padding: '10px 18px' }}
            >
              <Siren size={18} /> Trigger 112 SOS Escalation
            </button>

            <button
              onClick={fetchData}
              className="btn-outline"
              style={{ fontSize: '0.85rem' }}
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Counter */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pending Police Verification</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>
              {volunteers.filter(v => v.verificationStatus === 'PENDING').length}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Active Verified Volunteers</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>
              {volunteers.filter(v => v.verificationStatus === 'VERIFIED').length}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>112 Emergency Escalations</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: emergencyRequests.length > 0 ? '#ef4444' : '#94a3b8' }}>
              {emergencyRequests.length}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Senior Citizen Cases</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#38bdf8' }}>
              {requests.length}
            </div>
          </div>
        </div>
      </div>

      {/* Police Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
        {[
          { id: 'VERIFICATION', label: 'Volunteer Verification Desk', count: volunteers.filter(v => v.verificationStatus === 'PENDING').length, countColor: '#f59e0b' },
          { id: 'EMERGENCY_112', label: '112 Emergency Intercept', count: emergencyRequests.length, countColor: '#ef4444' },
          { id: 'INCIDENTS', label: 'Live Incident & Request Monitor', count: requests.length, countColor: '#38bdf8' },
          { id: 'AUDIT', label: 'Police Station Audit Logs', count: auditLogs.length, countColor: '#94a3b8' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #1f3d8a 0%, #15295c 100%)' : 'rgba(255,255,255,0.03)',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
              fontWeight: activeTab === tab.id ? '700' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              borderBottom: activeTab === tab.id ? '2px solid #eab308' : 'none'
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                background: 'rgba(0,0,0,0.4)',
                color: tab.countColor,
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: VOLUNTEER VERIFICATION DESK */}
      {activeTab === 'VERIFICATION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
                Volunteer Background Verification & Police Badge Authorization
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Senior citizens must only be visited by trusted, police-vetted volunteers. Review and issue badges below.
              </p>
            </div>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
              {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map(status => (
                <button
                  key={status}
                  onClick={() => setVolunteerFilter(status)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: volunteerFilter === status ? '#1f3d8a' : 'transparent',
                    color: volunteerFilter === status ? '#fff' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Volunteer Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredVolunteers.map(vol => (
              <div
                key={vol.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  borderTop: vol.verificationStatus === 'VERIFIED' ? '4px solid #10b981' : (vol.verificationStatus === 'PENDING' ? '4px solid #f59e0b' : '4px solid #ef4444')
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>{vol.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: '600' }}>{vol.organization}</span>
                  </div>

                  {vol.verificationStatus === 'VERIFIED' && (
                    <span className="badge-verified">
                      <Shield size={12} /> {vol.policeBadgeNo}
                    </span>
                  )}
                  {vol.verificationStatus === 'PENDING' && (
                    <span className="badge-pending">
                      <Clock size={12} /> Pending Police Check
                    </span>
                  )}
                  {vol.verificationStatus === 'REJECTED' && (
                    <span className="badge-emergency" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                      <XCircle size={12} /> Rejected
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="#94a3b8" /> {vol.phone}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#94a3b8" /> {vol.location}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {vol.skills?.map((skill, idx) => (
                      <span key={idx} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>
                    Notes: {vol.notes}
                  </div>
                </div>

                {/* Police Action Buttons */}
                {vol.verificationStatus === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                    <button
                      onClick={() => handleVerifyVolunteer(vol.id, 'APPROVE')}
                      className="btn-police-gold"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', justifyContent: 'center' }}
                    >
                      <UserCheck size={16} /> Approve & Issue Badge
                    </button>
                    <button
                      onClick={() => handleVerifyVolunteer(vol.id, 'REJECT')}
                      className="btn-outline"
                      style={{ padding: '8px 12px', fontSize: '0.85rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {vol.verificationStatus === 'VERIFIED' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#34d399' }}>
                    <span>Police Cleared by PSI Shirva</span>
                    <span>Rating: ⭐ {vol.rating || 5.0}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: 112 EMERGENCY INTERCEPT */}
      {activeTab === 'EMERGENCY_112' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel-emergency" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Siren size={28} color="#ef4444" className="animate-siren" />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fca5a5' }}>
                  Karnataka Emergency Response Support System (112) Intercept
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#fecaca' }}>
                  Real-time feed of life-safety crises detected by Sahayak Voice AI and immediately escalated to 112 & Shirva Police Quick Response Patrol.
                </p>
              </div>
            </div>
          </div>

          {emergencyRequests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <CheckCircle size={36} color="#10b981" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff' }}>No Active 112 Emergencies</div>
              <div style={{ fontSize: '0.85rem' }}>All current community senior calls are routine/non-critical.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {emergencyRequests.map(item => (
                <div
                  key={item.id}
                  className="glass-panel"
                  style={{
                    padding: '20px',
                    borderLeft: '6px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="badge-emergency">CRITICAL P0</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>{item.id}</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Reported {new Date(item.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>
                        {item.seniorName} • {item.seniorPhone}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#fbbf24', marginBottom: '8px' }}>
                        <MapPin size={16} /> {item.location}
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', color: '#fca5a5', maxWidth: '700px' }}>
                        {item.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                      <button
                        onClick={() => alert(`112 Ambulance & Shirva Police Patrol Car #4 dispatched to ${item.location}`)}
                        className="btn-danger"
                        style={{ fontSize: '0.85rem', padding: '10px 14px', justifyContent: 'center' }}
                      >
                        <Siren size={16} /> Dispatch Police Patrol Car
                      </button>

                      <button
                        onClick={() => alert(`Contacting nearest hospital: Shirva Primary Health Centre (PHC)`)}
                        className="btn-outline"
                        style={{ fontSize: '0.85rem', padding: '8px 14px', justifyContent: 'center' }}
                      >
                        Alert Shirva PHC Hospital
                      </button>

                      {onTrackPhone && (
                        <button
                          onClick={() => onTrackPhone(item.seniorPhone)}
                          className="btn-outline"
                          style={{ fontSize: '0.85rem', padding: '8px 14px', justifyContent: 'center', borderColor: '#38bdf8', color: '#38bdf8' }}
                        >
                          <MapPin size={16} /> Track Cell Location on Map
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE INCIDENT & REQUEST MONITOR */}
      {activeTab === 'INCIDENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
              All Senior Citizen Assistance Tickets (Shirva & Vicinity)
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Showing all cases handled by Sahayak</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(req => (
              <div
                key={req.id}
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  borderLeft: req.escalatedTo112 ? '4px solid #ef4444' : (req.status === 'RESOLVED' ? '4px solid #10b981' : '4px solid #38bdf8')
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8' }}>{req.id}</span>
                    <span style={{
                      background: 'rgba(255,255,255,0.06)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#fbbf24',
                      fontWeight: '600'
                    }}>
                      {req.category}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: req.status === 'RESOLVED' ? '#34d399' : (req.status === 'ESCALATED_112' ? '#f87171' : '#38bdf8')
                    }}>
                      ● {req.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>
                    {req.seniorName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} /> {req.location}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px', maxWidth: '650px' }}>
                    "{req.description}"
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Assigned Volunteer:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: req.assignedVolunteerName ? '#34d399' : '#f59e0b' }}>
                    {req.assignedVolunteerName || 'Awaiting Broadcast'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {new Date(req.createdAt).toLocaleTimeString()}
                  </div>
                  {onTrackPhone && req.seniorPhone && (
                    <button
                      onClick={() => onTrackPhone(req.seniorPhone)}
                      style={{
                        marginTop: '6px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        background: 'rgba(56, 189, 248, 0.1)',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                    >
                      <MapPin size={13} /> Live Radar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#fff' }}>
              Shirva Police Official Audit Trail & Chain of Custody
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Complete chronological ledger of calls, automated AI classification, volunteer dispatch actions, and resolution records.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditLogs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: log.action.includes('112') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(31, 61, 138, 0.3)',
                      color: log.action.includes('112') ? '#fca5a5' : '#93c5fd'
                    }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>Actor: {log.actor}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{log.details}</div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual 112 SOS Modal */}
      {showManualSosModal && (
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
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '24px', border: '1px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Siren size={24} color="#ef4444" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fca5a5' }}>
                Trigger Manual 112 Police Escalation
              </h3>
            </div>

            <form onSubmit={handleManual112Trigger} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Senior Resident Name:</label>
                <input
                  type="text"
                  required
                  value={sosForm.seniorName}
                  onChange={(e) => setSosForm({ ...sosForm, seniorName: e.target.value })}
                  placeholder="e.g. John Baptist, Shirva"
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Contact Phone:</label>
                <input
                  type="text"
                  required
                  value={sosForm.seniorPhone}
                  onChange={(e) => setSosForm({ ...sosForm, seniorPhone: e.target.value })}
                  placeholder="+91 9845X XXXXX"
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Location in Shirva:</label>
                <input
                  type="text"
                  required
                  value={sosForm.location}
                  onChange={(e) => setSosForm({ ...sosForm, location: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Reason / Emergency Details:</label>
                <textarea
                  required
                  rows={3}
                  value={sosForm.reason}
                  onChange={(e) => setSosForm({ ...sosForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="submit" className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                  Confirm & Dispatch 112 Unit
                </button>
                <button type="button" onClick={() => setShowManualSosModal(false)} className="btn-outline">
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
