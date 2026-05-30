import React, { createContext, useContext, useState, ReactNode } from 'react';
import translations from './translations';

interface LanguageContextType {
  lang: string;
  setLang: React.Dispatch<React.SetStateAction<string>>;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState('en');

  const t = (key: string): string => {
    // @ts-ignore
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'id' : 'en'));
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
