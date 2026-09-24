/**
 * LanguageSwitcher.jsx — Floating language selector dropdown
 * Shows flag + native label, supports 6 languages
 */
import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext';

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, currentLangMeta, SUPPORTED_LANGUAGES, autoDetected, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 200 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={t('footerSelectLanguage')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '6px 10px' : '8px 14px',
          borderRadius: '12px',
          background: open
            ? 'rgba(234,179,8,0.18)'
            : 'rgba(255,255,255,0.07)',
          border: `1px solid ${open ? 'rgba(234,179,8,0.5)' : 'rgba(255,255,255,0.15)'}`,
          color: open ? '#fbbf24' : '#94a3b8',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: '600',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        <Globe size={15} />
        <span style={{ fontSize: '1rem' }}>{currentLangMeta.flag}</span>
        {!compact && (
          <span style={{ color: '#e2e8f0' }}>{currentLangMeta.nativeLabel}</span>
        )}
        <span style={{
          fontSize: '0.65rem',
          opacity: 0.6,
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▾</span>
      </button>

      {/* Auto-detect toast */}
      {autoDetected && (
        <div style={{
          position: 'absolute',
          top: '110%',
          right: 0,
          background: 'rgba(16,185,129,0.18)',
          border: '1px solid rgba(16,185,129,0.5)',
          borderRadius: '10px',
          padding: '6px 12px',
          fontSize: '0.75rem',
          color: '#34d399',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          animation: 'fadeInDown 0.3s ease',
        }}>
          ✓ {t('autoDetected')}: {currentLangMeta.nativeLabel}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: '180px',
          background: 'rgba(13,27,62,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          padding: '8px',
          animation: 'fadeInDown 0.2s ease',
        }}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: lang === l.code ? 'rgba(234,179,8,0.15)' : 'transparent',
                border: lang === l.code ? '1px solid rgba(234,179,8,0.4)' : '1px solid transparent',
                color: lang === l.code ? '#fbbf24' : '#cbd5e1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                fontWeight: lang === l.code ? '700' : '500',
                fontSize: '0.88rem',
              }}
              onMouseEnter={e => {
                if (lang !== l.code) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={e => {
                if (lang !== l.code) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{l.flag}</span>
              <div>
                <div style={{ fontWeight: '600' }}>{l.nativeLabel}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>{l.label}</div>
              </div>
              {lang === l.code && (
                <span style={{ marginLeft: 'auto', color: '#fbbf24', fontSize: '0.8rem' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
