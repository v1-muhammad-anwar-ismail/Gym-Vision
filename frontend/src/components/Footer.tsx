import { Activity } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Link } from 'react-router-dom';
import '../pages/Landing.css';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-top">
          <div className="footer-left">
            <Link to="/" className="footer-logo" style={{ textDecoration: 'none' }}>
              <Activity className="logo-icon" size={24} color="#00e5ff" />
              <span>GymVision</span>
            </Link>
          </div>
          <div className="footer-links">
            <Link to="/terms">{t('footer_terms')}</Link>
            <Link to="/privacy">{t('footer_privacy')}</Link>
            <Link to="/contact">{t('footer_contact')}</Link>
          </div>
        </div>
        <p className="footer-copyright">© {new Date().getFullYear()} GymVision. {t('landing_footer_rights')}</p>
      </div>
    </footer>
  );
};

export default Footer;
