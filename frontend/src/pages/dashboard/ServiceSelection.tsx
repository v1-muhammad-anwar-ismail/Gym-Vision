import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { Activity, Target } from 'lucide-react';
import './ServiceSelection.css';

const ServiceSelection: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="service-selection-container">
      <div className="service-selection-header">
        <h1>{t('svc_title')}</h1>
        <p>{t('svc_subtitle')}</p>
      </div>

      <div className="service-grid">
        {/* Option 1: Movement Analysis */}
        <div className="service-card" onClick={() => navigate('/analysis')}>
          <div className="service-icon-wrapper blue">
            <Activity size={48} />
          </div>
          <h2>{t('svc_movement_title')}</h2>
          <p>{t('svc_movement_desc')}</p>
          <button className="service-btn btn-blue">{t('svc_movement_btn')}</button>
        </div>

        {/* Option 2: Repetition Counter */}
        <div className="service-card" onClick={() => navigate('/dashboard/rep-counter')}>
          <div className="service-icon-wrapper neon">
            <Target size={48} />
          </div>
          <h2>{t('svc_rep_title')}</h2>
          <p>{t('svc_rep_desc')}</p>
          <button className="service-btn btn-neon">{t('svc_rep_btn')}</button>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelection;
