import { useLanguage } from '../i18n/LanguageContext';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import './Landing.css';

const TermsOfService = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="landing-page animated-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ flex: 1, paddingTop: '100px', paddingBottom: '40px' }}>
        <button className="btn-back" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="about-content" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', padding: '20px', background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--primary-neon)' }}>{t('footer_terms')}</h1>
          
          <div style={{ color: '#c9d1d9', lineHeight: '1.8' }}>
            <p style={{ textAlign: 'center', marginBottom: '30px' }}>{t('terms_updated')}: {new Date().toLocaleDateString()}</p>
            
            <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#fff' }}>{t('terms_s1_title')}</h3>
            <p>{t('terms_s1_desc')}</p>
            
            <h3 style={{ marginTop: '30px', marginBottom: '10px', color: '#fff' }}>{t('terms_s2_title')}</h3>
            <p>{t('terms_s2_desc')}</p>
            
            <h3 style={{ marginTop: '30px', marginBottom: '10px', color: '#fff' }}>{t('terms_s3_title')}</h3>
            <p style={{ marginBottom: '15px' }}>{t('terms_s3_desc1')}</p>
            <p><strong>{t('terms_s3_desc2').split(':')[0]}:</strong> {t('terms_s3_desc2').split(':')[1]}</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfService;
