import React, { createContext, useContext, useState, useEffect } from 'react';
import ar from '../locales/ar';
import en from '../locales/en';

const LanguageContext = createContext(null);

const dictionaries = { ar, en };

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('finova-lang') || 'en';
  });

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('finova-lang', lang);
  }, [lang]);

  const t = (key, defaultTextOrVariables, variables) => {
    let vars = variables;
    let defText = defaultTextOrVariables;
    if (typeof defaultTextOrVariables === 'object' && defaultTextOrVariables !== null) {
      vars = defaultTextOrVariables;
      defText = undefined;
    }

    const keys = key.split('.');
    let value = dictionaries[lang];
    for (const k of keys) {
      if (value === undefined) break;
      value = value[k];
    }
    
    let result = (value !== undefined) ? value : (defText || key);

    if (typeof result === 'string' && vars) {
      Object.keys(vars).forEach(v => {
        result = result.replace(new RegExp(`{{${v}}}`, 'g'), vars[v]);
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
