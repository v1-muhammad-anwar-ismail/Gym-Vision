import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Upload, Cpu, Award, ChevronDown, Users, Zap, CheckCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import './Landing.css';

const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001') + '/api';

interface LandingStats {
  total_users: number;
  active_ai: number;
  total_analyses: number;
}

const Landing = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [stats, setStats] = useState<LandingStats>({ total_users: 0, active_ai: 0, total_analyses: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  // References for scroll animations
  const observerRefs = useRef<(HTMLElement | null)[]>([]);

  // Fetch dynamic stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setStatsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to fetch public stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Handle hash scrolling on mount
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  // Setup Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            // Optional: remove class when not intersecting if you want it to trigger on scroll up too
            entry.target.classList.remove('visible');
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of element is visible
        rootMargin: '0px 0px -50px 0px'
      }
    );

    observerRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observerRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  const handleStart = () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      navigate('/analysis');
    } else {
      localStorage.setItem('redirect_after_login', '/analysis');
      navigate('/login');
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !observerRefs.current.includes(el)) {
      observerRefs.current.push(el);
    }
  };

  return (
    <div className="landing-page animated-bg">
      {/* HERO SECTION */}
      <section className="hero-section" id="hero">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        
        <div className="container hero-content">
          <div className="hero-badge">{t('hero_badge')}</div>
          
          <h1 className="hero-title">
            {t('hero_title_1')} <br />
            <span className="text-gradient">{t('hero_title_2')}</span>
          </h1>
          
          <p className="hero-description">
            {t('hero_description')}
          </p>

          <div className="hero-actions hero-actions-bottom">
            <button className="btn-primary btn-pulse" onClick={handleStart}>
              {t('hero_cta')} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section" id="features">
        <div className="container features-container">
          <div className="section-header scroll-zoom" ref={addToRefs}>
            <h2>{t('landing_features_title')}</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card scroll-zoom" ref={addToRefs}>
              <div className="feature-icon-wrapper">
                <Upload size={32} />
              </div>
              <h3>{t('landing_feature1_title')}</h3>
              <p>{t('landing_feature1_desc')}</p>
            </div>
            <div className="feature-card scroll-zoom delay-1" ref={addToRefs}>
              <div className="feature-icon-wrapper">
                <Cpu size={32} />
              </div>
              <h3>{t('landing_feature2_title')}</h3>
              <p>{t('landing_feature2_desc')}</p>
            </div>
            <div className="feature-card scroll-zoom delay-2" ref={addToRefs}>
              <div className="feature-icon-wrapper">
                <Award size={32} />
              </div>
              <h3>{t('landing_feature3_title')}</h3>
              <p>{t('landing_feature3_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION WITH DYNAMIC STATS */}
      <section className="about-section" id="about">
        <div className="container about-container">
          <div className="about-content scroll-zoom" ref={addToRefs}>
            <h2>{t('landing_about_title')}</h2>
            <p>{t('landing_about_desc')}</p>
            
            <div className="stats-grid">
              <div className="stat-card">
                <Users size={32} className="stat-icon text-cyan" />
                <h3 className="stat-value">{statsLoaded ? stats.total_users : '...'}</h3>
                <p className="stat-label">{t('landing_stats_users')}</p>
              </div>
              <div className="stat-card">
                <Zap size={32} className="stat-icon text-neon" />
                <h3 className="stat-value">{statsLoaded ? stats.active_ai : '...'}</h3>
                <p className="stat-label">{t('landing_stats_ai')}</p>
              </div>
              <div className="stat-card">
                <CheckCircle size={32} className="stat-icon text-purple" />
                <h3 className="stat-value">{statsLoaded ? stats.total_analyses : '...'}</h3>
                <p className="stat-label">{t('landing_stats_analysis')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="faq-section" id="faq">
        <div className="container faq-container">
          <div className="section-header scroll-zoom" ref={addToRefs}>
            <h2>{t('landing_faq_title')}</h2>
          </div>
          <div className="faq-list">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div 
                key={num} 
                className={`scroll-reveal delay-${(num%3)}`}
                ref={addToRefs}
              >
                <div className={`faq-item ${activeFaq === num ? 'active' : ''}`}>
                  <button 
                    className="faq-question" 
                    onClick={() => toggleFaq(num)}
                  >
                    {/* @ts-ignore */}
                    <span>{t(`landing_faq_q${num}`)}</span>
                    <ChevronDown className="faq-icon" size={24} />
                  </button>
                  <div className="faq-answer">
                    {/* @ts-ignore */}
                    <p>{t(`landing_faq_a${num}`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
