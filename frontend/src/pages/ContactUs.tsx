import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Send, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import './Landing.css';

const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001') + '/api';

const ContactUs = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const response = await fetch(`${API_BASE}/public/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
      console.error(err);
    }
  };

  return (
    <div className="landing-page animated-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ flex: 1, paddingTop: '100px', paddingBottom: '60px' }}>
        <button className="btn-back" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="about-content" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'left', padding: '40px 20px' }}>
          <h2 style={{ textAlign: 'center', color: 'var(--primary-neon)' }}>{t('contact_title')}</h2>
          <p style={{ textAlign: 'center', marginBottom: '40px' }}>{t('contact_desc')}</p>

          {status === 'success' && (
            <div style={{ backgroundColor: 'rgba(57, 255, 20, 0.1)', padding: '15px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary-neon)' }}>
              <CheckCircle size={20} />
              {t('contact_success')}
            </div>
          )}

          {status === 'error' && (
            <div style={{ backgroundColor: 'rgba(255, 50, 50, 0.1)', padding: '15px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#ff4444' }}>
              <AlertCircle size={20} />
              {t('contact_error')}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9' }}>{t('contact_name')}</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                placeholder={t('contact_ph_name')}
                style={{ fontFamily: 'Poppins, sans-serif', width: '100%', padding: '12px 16px', borderRadius: '8px', background: '#000', border: '1px solid #30363d', color: '#fff' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9' }}>{t('contact_email')}</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder={t('contact_ph_email')}
                style={{ fontFamily: 'Poppins, sans-serif', width: '100%', padding: '12px 16px', borderRadius: '8px', background: '#000', border: '1px solid #30363d', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9' }}>{t('contact_subject')}</label>
              <input 
                type="text" 
                name="subject" 
                value={formData.subject} 
                onChange={handleChange} 
                required 
                placeholder={t('contact_ph_subject')}
                style={{ fontFamily: 'Poppins, sans-serif', width: '100%', padding: '12px 16px', borderRadius: '8px', background: '#000', border: '1px solid #30363d', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#c9d1d9' }}>{t('contact_message')}</label>
              <textarea 
                name="message" 
                value={formData.message} 
                onChange={handleChange} 
                required 
                rows={5}
                placeholder={t('contact_ph_message')}
                style={{ fontFamily: 'Poppins, sans-serif', width: '100%', padding: '12px 16px', borderRadius: '8px', background: '#000', border: '1px solid #30363d', color: '#fff', resize: 'vertical' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={status === 'sending'}
              style={{ padding: '16px', marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}
            >
              {status === 'sending' ? t('contact_sending') : t('contact_send')}
              {status !== 'sending' && <Send size={20} />}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactUs;
