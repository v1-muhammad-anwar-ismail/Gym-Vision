import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './LanguageToggle.css';

interface LanguageToggleProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ isMobile = false, onClose }) => {
  const { lang, setLang } = useLanguage();

  const handleToggle = (newLang: string) => {
    setLang(newLang);
    if (onClose) {
      onClose();
    }
  };

  if (isMobile) {
    return (
      <div className="lang-toggle-mobile">
        <button
          className={`lang-btn-mobile ${lang === 'en' ? 'active' : ''}`}
          onClick={() => handleToggle('en')}
        >
          <img src="https://flagcdn.com/w40/gb.png" width="24" alt="UK Flag" className="flag-icon" /> English
        </button>
        <button
          className={`lang-btn-mobile ${lang === 'id' ? 'active' : ''}`}
          onClick={() => handleToggle('id')}
        >
          <img src="https://flagcdn.com/w40/id.png" width="24" alt="ID Flag" className="flag-icon" /> Indonesia
        </button>
      </div>
    );
  }

  return (
    <div className="lang-toggle">
      <button
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <button
        className={`lang-btn ${lang === 'id' ? 'active' : ''}`}
        onClick={() => setLang('id')}
      >
        ID
      </button>
    </div>
  );
};

export default LanguageToggle;
