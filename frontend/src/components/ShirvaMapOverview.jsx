import React, { useState } from 'react';
import { MapPin, Shield, Siren, UserCheck, HeartPulse, Navigation, ExternalLink, Radio } from 'lucide-react';

const MAP_POINTS = [
  { id: 'p-1', name: 'Shirva Police Station (HQ)', type: 'POLICE', x: 50, y: 45, desc: 'Central Command & Volunteer Verification Authority' },
  { id: 'p-2', name: 'Manchakal Junction', type: 'HUB', x: 42, y: 38, desc: 'Auto stand & commercial junction (Active senior calls)' },
  { id: 'p-3', name: 'Our Lady of Health Church', type: 'LANDMARK', x: 58, y: 32, desc: 'Prominent community landmark & resident cluster' },
  { id: 'p-4', name: 'Mattar Cross Road', type: 'VILLAGE', x: 68, y: 58, desc: 'Residential senior citizen zone' },
  { id: 'p-5', name: 'Bantakal & SMVITM Campus', type: 'COLLEGE', x: 28, y: 72, desc: 'SMVITM Student Volunteer Node & Leo Club' },
  { id: 'p-6', name: 'Shirva PHC Hospital', type: 'HOSPITAL', x: 54, y: 62, desc: 'Primary Health Centre & 112 Emergency Route' }
];

export default function ShirvaMapOverview({ stats, requests = [] }) {
  const [selectedPoint, setSelectedPoint] = useState(MAP_POINTS[0]);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge-verified" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
              <Radio size={12} className="animate-pulse" /> Live Geo-Coverage Radar
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Shirva & Surrounding Villages (Udupi Dist.)</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>
            Shirva Police Community Assistance Radar
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} /> Police HQ
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} /> Verified Volunteer
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} /> 112 Intercept
          </div>
        </div>
      </div>

      {/* Radar Canvas Simulation */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '380px',
        background: 'radial-gradient(circle at 50% 50%, #0d214f 0%, #060e22 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)'
      }}>
        {/* Radar Rings Grid */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.08)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.05)',
          pointerEvents: 'none'
        }} />

        {/* Crosshair lines */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Render Map Points */}
        {MAP_POINTS.map(point => {
          const isSelected = selectedPoint?.id === point.id;
          let pinColor = '#38bdf8';
          if (point.type === 'POLICE') pinColor = '#eab308';
          if (point.type === 'HOSPITAL') pinColor = '#ef4444';
          if (point.type === 'COLLEGE') pinColor = '#10b981';

          return (
            <div
              key={point.id}
              onClick={() => setSelectedPoint(point)}
              style={{
                position: 'absolute',
                top: `${point.y}%`,
                left: `${point.x}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: isSelected ? 20 : 10,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: isSelected ? '34px' : '26px',
                height: isSelected ? '34px' : '26px',
                borderRadius: '50%',
                background: pinColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#070d1e',
                boxShadow: `0 0 15px ${pinColor}`,
                border: isSelected ? '2px solid #fff' : 'none'
              }}>
                {point.type === 'POLICE' && <Shield size={14} />}
                {point.type === 'HOSPITAL' && <HeartPulse size={14} />}
                {point.type !== 'POLICE' && point.type !== 'HOSPITAL' && <MapPin size={14} />}
              </div>

              <span style={{
                marginTop: '4px',
                fontSize: '0.72rem',
                fontWeight: '700',
                color: isSelected ? '#fff' : '#cbd5e1',
                background: 'rgba(7, 13, 30, 0.85)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)',
                whiteSpace: 'nowrap'
              }}>
                {point.name}
              </span>
            </div>
          );
        })}

        {/* Selected Point Tooltip Box */}
        {selectedPoint && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(13, 27, 62, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            padding: '12px 16px',
            borderRadius: '10px',
            maxWidth: '320px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: '700', marginBottom: '2px' }}>
              <MapPin size={14} /> {selectedPoint.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{selectedPoint.desc}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
              Coordinates: 13.238° N, 74.834° E • Shirva Police Beat #2
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
