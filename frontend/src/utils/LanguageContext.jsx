/**
 * LanguageContext.jsx — Global language state provider
 * Wraps the app so every component can use useLanguage()
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { detectBrowserLanguage, SUPPORTED_LANGUAGES, t } from './i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('sahayak_lang');
      if (saved && SUPPORTED_LANGUAGES.find(l => l.code === saved)) return saved;
    } catch {}
    return detectBrowserLanguage();
  });

  const [autoDetected, setAutoDetected] = useState(false);

  // On first mount, show auto-detect notice for 3s
  useEffect(() => {
    const saved = localStorage.getItem('sahayak_lang');
    if (!saved) {
      setAutoDetected(true);
      const timer = setTimeout(() => setAutoDetected(false), 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  const setLang = useCallback((code) => {
    setLangState(code);
    try { localStorage.setItem('sahayak_lang', code); } catch {}
  }, []);

  const translate = useCallback((key, vars) => t(key, lang, vars), [lang]);

  const currentLangMeta = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translate, autoDetected, currentLangMeta, SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Hook to access language context */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

export default LanguageContext;
