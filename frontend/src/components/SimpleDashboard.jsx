import React, { useState, useEffect } from 'react';
import { 
  Users, 
  HeartHandshake, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  History, 
  ShieldAlert, 
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

export default function SimpleDashboard() {
  const [activeTab, setActiveTab] = useState('CALL_HISTORY'); // 'CALL_HISTORY', 'SENIORS', 'VOLUNTEERS'
  const [callHistory, setCallHistory] = useState([]);
  const [seniors, setSeniors] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [emergencyFilter, setEmergencyFilter] = useState('ALL'); // 'ALL', 'EMERGENCY_ONLY', 'COMMUNITY_ONLY'

  // Senior Modal State
  const [seniorModalOpen, setSeniorModalOpen] = useState(false);
  const [editingSenior, setEditingSenior] = useState(null); // null for Add, senior object for Edit
  const [seniorForm, setSeniorForm] = useState({
    name: '',
    phone: '',
    age: '65',
    location: 'Shirva',
    address: 'Shirva',
    preferredLanguage: 'Kannada',
    emergencyContact: '',
    medicalNotes: ''
  });

  // Volunteer Modal State
  const [volunteerModalOpen, setVolunteerModalOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null); // null for Add, volunteer object for Edit
  const [volunteerForm, setVolunteerForm] = useState({
    name: '',
    phone: '',
    organization: 'Local Resident',
    location: 'Shirva',
    skills: 'Emergency Transport, Medicine Delivery',
    isAvailable: true,
    verificationStatus: 'VERIFIED'
  });

  // Delete Confirmation State
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    type: null, // 'SENIOR' or 'VOLUNTEER'
    id: null,
    name: ''
  });

  // Action status message
  const [actionNotice, setActionNotice] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotice = (text, type = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, sRes, vRes] = await Promise.all([
        fetch('http://localhost:5000/api/requests'),
        fetch('http://localhost:5000/api/senior-citizens?active=true'),
        fetch('http://localhost:5000/api/volunteers')
      ]);

      const reqData = await reqRes.json();
      const sData = await sRes.json();
      const vData = await vRes.json();

      // Handle paginated or plain array responses
      const calls = reqData.items || (Array.isArray(reqData) ? reqData : []);
      setCallHistory(calls);
      setSeniors(sData.items || (Array.isArray(sData) ? sData : []));
      setVolunteers(vData.items || (Array.isArray(vData) ? vData : []));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Filter Call History based on search and emergency toggle
  const filteredCalls = callHistory.filter(call => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = (
      (call.seniorName && call.seniorName.toLowerCase().includes(q)) ||
      (call.description && call.description.toLowerCase().includes(q)) ||
      (call.category && call.category.toLowerCase().includes(q)) ||
      (call.location && call.location.toLowerCase().includes(q)) ||
      (call.seniorPhone && call.seniorPhone.toLowerCase().includes(q)) ||
      (call.assignedVolunteerName && call.assignedVolunteerName.toLowerCase().includes(q))
    );

    const isEmg = Boolean(call.escalatedTo112 || call.urgency === 'CRITICAL_112' || call.status === 'ESCALATED_112');

    if (emergencyFilter === 'EMERGENCY_ONLY') {
      return matchesQuery && isEmg;
    }
    if (emergencyFilter === 'COMMUNITY_ONLY') {
      return matchesQuery && !isEmg;
    }
    return matchesQuery;
  });

  // Filter Seniors
  const filteredSeniors = seniors.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.location && s.location.toLowerCase().includes(q)) ||
      (s.medicalNotes && s.medicalNotes.toLowerCase().includes(q))
    );
  });

  // Filter Volunteers
  const filteredVolunteers = volunteers.filter(v => {
    const q = searchQuery.toLowerCase();
    return (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.phone && v.phone.toLowerCase().includes(q)) ||
      (v.organization && v.organization.toLowerCase().includes(q)) ||
      (v.location && v.location.toLowerCase().includes(q)) ||
      (Array.isArray(v.skills) && v.skills.some(sk => sk.toLowerCase().includes(q)))
    );
  });

  const totalEmergencyCalls = callHistory.filter(c => c.escalatedTo112 || c.urgency === 'CRITICAL_112' || c.status === 'ESCALATED_112').length;

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Recent';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SENIOR CITIZEN CRUD HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const openSeniorModal = (senior = null) => {
    if (senior) {
      setEditingSenior(senior);
      setSeniorForm({
        name: senior.name || '',
        phone: senior.phone || '',
        age: senior.age ? String(senior.age) : '65',
        location: senior.location || 'Shirva',
        address: senior.address || senior.location || 'Shirva',
        preferredLanguage: senior.preferredLanguage || 'Kannada',
        emergencyContact: senior.emergencyContact || '',
        medicalNotes: senior.medicalNotes || ''
      });
    } else {
      setEditingSenior(null);
      setSeniorForm({
        name: '',
        phone: '+91 ',
        age: '65',
        location: 'Shirva',
        address: 'Shirva',
        preferredLanguage: 'Kannada',
        emergencyContact: '',
        medicalNotes: ''
      });
    }
    setSeniorModalOpen(true);
  };

  const handleSaveSenior = async (e) => {
    e.preventDefault();
    if (!seniorForm.name.trim() || !seniorForm.phone.trim()) {
      showNotice('Name and Phone are mandatory.', 'error');
      return;
    }

    const ageNum = parseInt(seniorForm.age, 10);
    if (isNaN(ageNum) || ageNum < 50) {
      showNotice('Senior Citizen age must be 50 or older according to helpline guidelines.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: seniorForm.name.trim(),
        phone: seniorForm.phone.trim(),
        age: ageNum,
        location: seniorForm.location.trim() || 'Shirva',
        address: seniorForm.address.trim() || seniorForm.location.trim() || 'Shirva',
        preferredLanguage: seniorForm.preferredLanguage,
        emergencyContact: seniorForm.emergencyContact.trim(),
        medicalNotes: seniorForm.medicalNotes.trim(),
        _actor: 'Shirva Police Officer'
      };

      let res;
      if (editingSenior) {
        res = await fetch(`http://localhost:5000/api/senior-citizens/${editingSenior.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('http://localhost:5000/api/senior-citizens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        showNotice(data.error || 'Failed to save senior citizen.', 'error');
      } else {
        showNotice(editingSenior ? `Updated details for ${payload.name}.` : `Registered ${payload.name} successfully.`);
        setSeniorModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showNotice('Network error while saving senior citizen.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSenior = async () => {
    if (!deleteDialog.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/senior-citizens/${deleteDialog.id}?actor=Shirva%20Police`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotice(`Removed ${deleteDialog.name} from active records.`);
        setDeleteDialog({ isOpen: false, type: null, id: null, name: '' });
        fetchData();
      } else {
        const data = await res.json();
        showNotice(data.error || 'Failed to remove senior citizen record.', 'error');
      }
    } catch (err) {
      showNotice('Network error while removing senior citizen.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VOLUNTEER CRUD HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const openVolunteerModal = (volunteer = null) => {
    if (volunteer) {
      setEditingVolunteer(volunteer);
      setVolunteerForm({
        name: volunteer.name || '',
        phone: volunteer.phone || '',
        organization: volunteer.organization || 'Local Resident',
        location: volunteer.location || 'Shirva',
        skills: Array.isArray(volunteer.skills) ? volunteer.skills.join(', ') : (volunteer.skills || 'Emergency Transport, Medicine Delivery'),
        isAvailable: Boolean(volunteer.isAvailable),
        verificationStatus: volunteer.verificationStatus || 'VERIFIED'
      });
    } else {
      setEditingVolunteer(null);
      setVolunteerForm({
        name: '',
        phone: '+91 ',
        organization: 'Rotary / Local Resident',
        location: 'Shirva',
        skills: 'Medicine Delivery, Emergency Transport, First Aid',
        isAvailable: true,
        verificationStatus: 'VERIFIED'
      });
    }
    setVolunteerModalOpen(true);
  };

  const handleSaveVolunteer = async (e) => {
    e.preventDefault();
    if (!volunteerForm.name.trim() || !volunteerForm.phone.trim()) {
      showNotice('Volunteer Name and Phone are mandatory.', 'error');
      return;
    }

    const skillsArray = volunteerForm.skills
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const payload = {
        name: volunteerForm.name.trim(),
        phone: volunteerForm.phone.trim(),
        organization: volunteerForm.organization.trim() || 'Citizen Volunteer',
        location: volunteerForm.location.trim() || 'Shirva',
        skills: skillsArray.length > 0 ? skillsArray : ['General Community Support'],
        isAvailable: volunteerForm.isAvailable,
        verificationStatus: volunteerForm.verificationStatus,
        _actor: 'Shirva Police Officer'
      };

      let res;
      if (editingVolunteer) {
        res = await fetch(`http://localhost:5000/api/volunteers/${editingVolunteer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('http://localhost:5000/api/volunteers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        showNotice(data.error || 'Failed to save volunteer.', 'error');
      } else {
        showNotice(editingVolunteer ? `Updated volunteer profile for ${payload.name}.` : `Enrolled volunteer ${payload.name} successfully.`);
        setVolunteerModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showNotice('Network error while saving volunteer.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVolunteer = async () => {
    if (!deleteDialog.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/volunteers/${deleteDialog.id}?actor=Shirva%20Police`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showNotice(`Removed volunteer ${deleteDialog.name}.`);
        setDeleteDialog({ isOpen: false, type: null, id: null, name: '' });
        fetchData();
      } else {
        showNotice(data.error || 'Cannot remove volunteer. Make sure they have no active calls.', 'error');
      }
    } catch (err) {
      showNotice('Network error while removing volunteer.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle volunteer availability in 1 click
  const handleToggleVolunteerAvailability = async (volunteer) => {
    try {
      const updatedAvailability = !volunteer.isAvailable;
      const res = await fetch(`http://localhost:5000/api/volunteers/${volunteer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: updatedAvailability, _actor: 'Shirva Police Officer' })
      });
      if (res.ok) {
        showNotice(`${volunteer.name} status marked as ${updatedAvailability ? 'Available' : 'On Duty'}.`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick verify volunteer with police badge
  const handleQuickVerifyVolunteer = async (volunteer) => {
    try {
      const res = await fetch(`http://localhost:5000/api/volunteers/${volunteer.id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          officerName: 'PSI Shirva Police Station',
          notes: 'Police background and identity check approved.'
        })
      });
      if (res.ok) {
        showNotice(`Police Verified badge granted to ${volunteer.name}.`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Toast Notice */}
      {actionNotice && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: actionNotice.type === 'error' ? '#ef4444' : '#16a34a',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          fontWeight: '600',
          fontSize: '0.9rem',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {actionNotice.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* 1. Header Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* Calls Logged Card */}
        <div 
          onClick={() => { setActiveTab('CALL_HISTORY'); setEmergencyFilter('ALL'); }}
          style={{
            background: activeTab === 'CALL_HISTORY' && emergencyFilter === 'ALL' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.75)',
            border: activeTab === 'CALL_HISTORY' && emergencyFilter === 'ALL' ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <History size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Calls Logged
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>
              {callHistory.length}
            </div>
          </div>
        </div>

        {/* 🚨 Emergency Calls (112) Card */}
        <div 
          onClick={() => { setActiveTab('CALL_HISTORY'); setEmergencyFilter('EMERGENCY_ONLY'); }}
          style={{
            background: activeTab === 'CALL_HISTORY' && emergencyFilter === 'EMERGENCY_ONLY' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.75)',
            border: activeTab === 'CALL_HISTORY' && emergencyFilter === 'EMERGENCY_ONLY' ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '18px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
              🚨 112 Emergencies
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f87171' }}>
              {totalEmergencyCalls}
            </div>
          </div>
        </div>

        {/* Senior Citizens Card */}
        <div 
          onClick={() => setActiveTab('SENIORS')}
          style={{
            background: activeTab === 'SENIORS' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.75)',
            border: activeTab === 'SENIORS' ? '2px solid #eab308' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a'
          }}>
            <Users size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Senior Citizens
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>
              {seniors.length}
            </div>
          </div>
        </div>

        {/* Volunteers Card */}
        <div 
          onClick={() => setActiveTab('VOLUNTEERS')}
          style={{
            background: activeTab === 'VOLUNTEERS' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(15, 23, 42, 0.75)',
            border: activeTab === 'VOLUNTEERS' ? '2px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <HeartHandshake size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Volunteers
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>
              {volunteers.length}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs & Search Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        background: 'rgba(15, 23, 42, 0.85)',
        padding: '14px 20px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('CALL_HISTORY')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'CALL_HISTORY' ? '#3b82f6' : 'rgba(255, 255, 255, 0.06)',
              color: activeTab === 'CALL_HISTORY' ? '#fff' : '#cbd5e1',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <History size={17} />
            Call History ({filteredCalls.length})
          </button>

          <button
            onClick={() => setActiveTab('SENIORS')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'SENIORS' ? '#eab308' : 'rgba(255, 255, 255, 0.06)',
              color: activeTab === 'SENIORS' ? '#0f172a' : '#cbd5e1',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Users size={17} />
            Senior Citizens ({filteredSeniors.length})
          </button>

          <button
            onClick={() => setActiveTab('VOLUNTEERS')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'VOLUNTEERS' ? '#22c55e' : 'rgba(255, 255, 255, 0.06)',
              color: activeTab === 'VOLUNTEERS' ? '#0f172a' : '#cbd5e1',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <HeartHandshake size={17} />
            Volunteers ({filteredVolunteers.length})
          </button>
        </div>

        {/* Search Bar & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '420px', minWidth: '240px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            padding: '8px 14px',
            width: '100%'
          }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder={
                activeTab === 'CALL_HISTORY'
                  ? 'Search caller, reason, category...'
                  : activeTab === 'SENIORS'
                  ? 'Search senior citizen by name, area...'
                  : 'Search volunteers by name, skill...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          <button
            onClick={fetchData}
            title="Refresh Data"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '10px',
              color: '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 3. TAB 1: CALL HISTORY VIEW */}
      {activeTab === 'CALL_HISTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Sub-Filter for Emergency vs Community Calls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Filter Calls:</span>
            {[
              ['ALL', 'All Calls'],
              ['EMERGENCY_ONLY', '🚨 112 Emergency Only'],
              ['COMMUNITY_ONLY', '🤝 Community Assistance']
            ].map(([fKey, fLabel]) => (
              <button
                key={fKey}
                onClick={() => setEmergencyFilter(fKey)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: emergencyFilter === fKey ? '700' : '500',
                  border: 'none',
                  background: emergencyFilter === fKey 
                    ? (fKey === 'EMERGENCY_ONLY' ? '#ef4444' : '#3b82f6')
                    : 'rgba(255, 255, 255, 0.05)',
                  color: emergencyFilter === fKey ? '#fff' : '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                {fLabel}
              </button>
            ))}
          </div>

          {filteredCalls.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px' }}>
              No calls found matching your search.
            </div>
          ) : (
            filteredCalls.map(call => {
              const isEmg = Boolean(call.escalatedTo112 || call.urgency === 'CRITICAL_112' || call.status === 'ESCALATED_112');
              return (
                <div
                  key={call.id}
                  style={{
                    background: isEmg 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'rgba(15, 23, 42, 0.85)',
                    border: isEmg ? '2px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: isEmg ? '0 4px 25px rgba(239, 68, 68, 0.15)' : '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* Top Row: Senior Name, Call ID, Time, Emergency Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
                        {call.seniorName}
                      </span>
                      <span style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: '#94a3b8',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '600'
                      }}>
                        {call.id}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Emergency Badge */}
                      {isEmg ? (
                        <span style={{
                          background: '#ef4444',
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)'
                        }}>
                          <ShieldAlert size={14} /> 🚨 112 CRITICAL EMERGENCY
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <CheckCircle size={14} /> Community Assistance
                        </span>
                      )}

                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> {formatDate(call.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Reason of Call (Spoken Description / Transcript) */}
                  <div style={{
                    background: isEmg ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.3)',
                    borderLeft: isEmg ? '4px solid #ef4444' : '4px solid #3b82f6',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '0.98rem',
                    color: '#f8fafc',
                    lineHeight: '1.5'
                  }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: isEmg ? '#fca5a5' : '#93c5fd', fontWeight: '700', marginBottom: '4px' }}>
                      🗣️ Reason of Call (ಮಾತನಾಡಿದ ವಿವರ):
                    </div>
                    "{call.description}"
                  </div>

                  {/* Bottom Row: Metadata (Phone, Location, Category, Assigned Volunteer / 112 Action) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={14} color="#38bdf8" />
                        <strong style={{ color: '#f8fafc' }}>{call.seniorPhone || 'N/A'}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="#f59e0b" />
                        {call.location}
                      </span>
                      <span>
                        Category: <strong style={{ color: '#fbbf24' }}>{call.category}</strong>
                      </span>
                    </div>

                    {/* Routing / Action Result */}
                    <div>
                      {isEmg ? (
                        <span style={{ color: '#fca5a5', fontWeight: '700' }}>
                          Dispatched: <strong style={{ color: '#fff' }}>Shirva Police QRT & ERSS 112</strong>
                        </span>
                      ) : (
                        <span>
                          Assigned Volunteer: <strong style={{ color: call.assignedVolunteerName ? '#4ade80' : '#fbbf24' }}>
                            {call.assignedVolunteerName || 'Awaiting Assignment'}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. TAB 2: SENIOR CITIZENS LIST VIEW & CRUD */}
      {activeTab === 'SENIORS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Header Action Bar for Senior Citizens */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#eab308" /> Senior Citizens Directory (ಹಿರಿಯ ನಾಗರಿಕರ ವಿವರಗಳು)
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Total {seniors.length} registered senior citizens under Shirva Police Station
              </span>
            </div>

            <button
              onClick={() => openSeniorModal()}
              style={{
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 18px',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(234, 179, 8, 0.3)'
              }}
            >
              <Plus size={16} /> + Register New Senior (ಹೊಸ ನೋಂದಣಿ)
            </button>
          </div>

          {filteredSeniors.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px' }}>
              No senior citizens found matching "{searchQuery}".
            </div>
          ) : (
            filteredSeniors.map(senior => (
              <div
                key={senior.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
              >
                {/* Left: Senior Core Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '1.1rem'
                  }}>
                    {senior.name ? senior.name.charAt(0) : 'S'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
                        {senior.name}
                      </span>
                      <span style={{
                        background: 'rgba(234, 179, 8, 0.2)',
                        color: '#fbbf24',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {senior.age ? `${senior.age} Yrs` : 'Elderly'}
                      </span>
                      <span style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {senior.preferredLanguage || 'Kannada'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '0.88rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={14} color="#38bdf8" />
                        <strong style={{ color: '#f8fafc' }}>{senior.phone}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="#f59e0b" />
                        {senior.location || senior.address}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Medical Needs & Emergency Contact */}
                <div style={{ minWidth: '240px', maxWidth: '380px', flex: 1 }}>
                  {senior.medicalNotes && (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      borderLeft: '3px solid #eab308',
                      fontSize: '0.82rem',
                      color: '#cbd5e1',
                      marginBottom: '6px'
                    }}>
                      <strong style={{ color: '#fbbf24' }}>Medical / Needs:</strong> {senior.medicalNotes}
                    </div>
                  )}

                  {senior.emergencyContact && (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Emergency Contact: <span style={{ color: '#f87171', fontWeight: '600' }}>{senior.emergencyContact}</span>
                    </div>
                  )}
                </div>

                {/* Right: Actions (Edit & Delete) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => openSeniorModal(senior)}
                    title="Edit Senior Details"
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#60a5fa',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>

                  <button
                    onClick={() => setDeleteDialog({ isOpen: true, type: 'SENIOR', id: senior.id, name: senior.name })}
                    title="Delete / Deactivate Senior Record"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. TAB 3: VOLUNTEERS LIST VIEW & CRUD */}
      {activeTab === 'VOLUNTEERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Header Action Bar for Volunteers */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HeartHandshake size={18} color="#22c55e" /> Community Volunteers Network (ಸ್ವಯಂಸೇವಕರ ಪಡೆ)
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Total {volunteers.length} community volunteers registered for elderly citizen assistance
              </span>
            </div>

            <button
              onClick={() => openVolunteerModal()}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 18px',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(34, 197, 94, 0.3)'
              }}
            >
              <Plus size={16} /> + Add Volunteer (ಹೊಸ ಸ್ವಯಂಸೇವಕರು)
            </button>
          </div>

          {filteredVolunteers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px' }}>
              No volunteers found matching "{searchQuery}".
            </div>
          ) : (
            filteredVolunteers.map(volunteer => (
              <div
                key={volunteer.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
              >
                {/* Left: Volunteer Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: volunteer.isAvailable ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                    border: volunteer.isAvailable ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(100, 116, 139, 0.3)',
                    color: volunteer.isAvailable ? '#4ade80' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '1.1rem'
                  }}>
                    {volunteer.name ? volunteer.name.charAt(0) : 'V'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>
                        {volunteer.name}
                      </span>

                      {/* Verification Status */}
                      {volunteer.verificationStatus === 'VERIFIED' ? (
                        <span style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <ShieldCheck size={12} /> Police Verified {volunteer.policeBadgeNo ? `(${volunteer.policeBadgeNo})` : ''}
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: '700'
                        }}>
                          ⏳ Pending Verification
                        </span>
                      )}

                      {/* Availability status toggle button */}
                      <button
                        onClick={() => handleToggleVolunteerAvailability(volunteer)}
                        title="Click to toggle availability"
                        style={{
                          background: volunteer.isAvailable ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: volunteer.isAvailable ? '#4ade80' : '#f87171',
                          border: 'none',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {volunteer.isAvailable ? '🟢 Available' : '🔴 On Duty'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '0.88rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={14} color="#38bdf8" />
                        <strong style={{ color: '#f8fafc' }}>{volunteer.phone}</strong>
                      </span>
                      <span>
                        Org: <strong style={{ color: '#cbd5e1' }}>{volunteer.organization || 'Local Resident'}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="#f59e0b" />
                        {volunteer.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle: Skills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '300px', flex: 1 }}>
                  {(Array.isArray(volunteer.skills) ? volunteer.skills : []).map((sk, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#e2e8f0',
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      {sk}
                    </span>
                  ))}
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {volunteer.verificationStatus !== 'VERIFIED' && (
                    <button
                      onClick={() => handleQuickVerifyVolunteer(volunteer)}
                      title="Verify this volunteer with Police Station"
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.5)',
                        color: '#4ade80',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ShieldCheck size={14} /> Police Verify
                    </button>
                  )}

                  <button
                    onClick={() => openVolunteerModal(volunteer)}
                    title="Edit Volunteer Details"
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#60a5fa',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>

                  <button
                    onClick={() => setDeleteDialog({ isOpen: true, type: 'VOLUNTEER', id: volunteer.id, name: volunteer.name })}
                    title="Delete Volunteer"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: ADD / EDIT SENIOR CITIZEN
      ────────────────────────────────────────────────────────────────────────────── */}
      {seniorModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '560px',
            padding: '28px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(234, 179, 8, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24'
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '800' }}>
                    {editingSenior ? 'Edit Senior Citizen Details' : 'Register Senior Citizen'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {editingSenior ? 'ವಿವರಗಳನ್ನು ನವೀಕರಿಸಿ' : 'ಹಿರಿಯ ನಾಗರಿಕರ ಹೊಸ ನೋಂದಣಿ'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSeniorModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSenior} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Full Name (ಪೂರ್ಣ ಹೆಸರು) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. K. Ramachandra Bhat"
                    value={seniorForm.name}
                    onChange={(e) => setSeniorForm({ ...seniorForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Age (ವಯಸ್ಸು) * (Min 50)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="110"
                    required
                    placeholder="e.g. 71"
                    value={seniorForm.age}
                    onChange={(e) => setSeniorForm({ ...seniorForm, age: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Phone Number (ದೂರವಾಣಿ ಸಂಖ್ಯೆ) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 99455 94198"
                    value={seniorForm.phone}
                    onChange={(e) => setSeniorForm({ ...seniorForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Preferred Language (ಭಾಷೆ)
                  </label>
                  <select
                    value={seniorForm.preferredLanguage}
                    onChange={(e) => setSeniorForm({ ...seniorForm, preferredLanguage: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Tulu">Tulu (ತುಳು)</option>
                    <option value="English">English</option>
                    <option value="Konkani">Konkani (ಕೊಂಕಣಿ)</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Location / Area (ಸ್ಥಳ / ಗ್ರಾಮ)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shirva Main, Manchakal, Mattu"
                    value={seniorForm.location}
                    onChange={(e) => setSeniorForm({ ...seniorForm, location: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Emergency Contact (ತುರ್ತು ಸಂಪರ್ಕ)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Bhat (+91 98451 12345)"
                    value={seniorForm.emergencyContact}
                    onChange={(e) => setSeniorForm({ ...seniorForm, emergencyContact: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                  Medical Conditions / Health Notes (ಆರೋಗ್ಯದ ವಿವರಗಳು)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Heart patient, takes blood pressure medicine, mobility support needed"
                  value={seniorForm.medicalNotes}
                  onChange={(e) => setSeniorForm({ ...seniorForm, medicalNotes: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSeniorModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} /> {editingSenior ? 'Save Changes' : 'Register Senior'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: ADD / EDIT VOLUNTEER
      ────────────────────────────────────────────────────────────────────────────── */}
      {volunteerModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '560px',
            padding: '28px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4ade80'
                }}>
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '800' }}>
                    {editingVolunteer ? 'Edit Volunteer Profile' : 'Enroll New Volunteer'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {editingVolunteer ? 'ಸ್ವಯಂಸೇವಕರ ವಿವರಗಳ ನವೀಕರಣ' : 'ಹೊಸ ಸ್ವಯಂಸೇವಕರ ಸೇರ್ಪಡೆ'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setVolunteerModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveVolunteer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Full Name (ಹೆಸರು) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Acharya"
                    value={volunteerForm.name}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Phone Number (ದೂರವಾಣಿ ಸಂಖ್ಯೆ) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98451 98765"
                    value={volunteerForm.phone}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Organization / Association (ಸಂಸ್ಥೆ)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rotary Club, Youth Red Cross, Local Resident"
                    value={volunteerForm.organization}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, organization: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Location / Area (ವಲಯ / ಸ್ಥಳ)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shirva Market, Katapadi, Manchakal"
                    value={volunteerForm.location}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, location: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                  Skills (ಕೌಶಲ್ಯಗಳು - ಕಾಮಾದಿಂದ ಬೇರ್ಪಡಿಸಿ)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Transport, Medicine Delivery, Grocery Supply, First Aid"
                  value={volunteerForm.skills}
                  onChange={(e) => setVolunteerForm({ ...volunteerForm, skills: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Status & Availability Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                    Police Verification Status
                  </label>
                  <select
                    value={volunteerForm.verificationStatus}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, verificationStatus: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="VERIFIED">VERIFIED (ಪೊಲೀಸ್ ಪರಿಶೀಲಿತ)</option>
                    <option value="PENDING">PENDING (ಪರಿಶೀಲನೆ ಬಾಕಿ)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
                  <input
                    type="checkbox"
                    id="isAvailableCheck"
                    checked={volunteerForm.isAvailable}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, isAvailable: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isAvailableCheck" style={{ fontSize: '0.88rem', color: '#cbd5e1', cursor: 'pointer', fontWeight: '600' }}>
                    Available for Dispatch (ಲಭ್ಯವಿದ್ದಾರೆ)
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setVolunteerModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={16} /> {editingVolunteer ? 'Save Profile' : 'Enroll Volunteer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 3: DELETE CONFIRMATION DIALOG
      ────────────────────────────────────────────────────────────────────────────── */}
      {deleteDialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '800' }}>
                  Confirm Deletion (ದಾಖಲೆಯನ್ನು ತೆಗೆದುಹಾಕಿ)
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#f87171' }}>
                  This action will remove the record from Shirva Police records.
                </div>
              </div>
            </div>

            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.5' }}>
              Are you sure you want to remove <strong>{deleteDialog.name}</strong> from the {deleteDialog.type === 'SENIOR' ? 'Senior Citizens' : 'Volunteers'} database?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteDialog({ isOpen: false, type: null, id: null, name: '' })}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={deleteDialog.type === 'SENIOR' ? handleDeleteSenior : handleDeleteVolunteer}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                }}
              >
                <Trash2 size={16} /> Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
