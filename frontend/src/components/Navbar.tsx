import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, LogOut } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageToggle from './LanguageToggle';
import './Navbar.css';

const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001') + '/api';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
}

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();
  }, [location.pathname]); // re-check on navigation

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    navigate('/');
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-container">
          <Link to="/" className="navbar-logo">
            <Activity className="logo-icon" size={28} strokeWidth={2.5} />
            <span className="text-gradient">GymVision</span>
          </Link>
          
          <div className="navbar-links-desktop">
            <Link to="/" className={`nav-link ${path === '/' ? 'active' : ''}`}>{t('nav_home')}</Link>
            {user && (
              <Link to="/analysis" className={`nav-link ${path === '/analysis' ? 'active' : ''}`}>
                {t('nav_analysis') || 'Analisis Gerakan'}
              </Link>
            )}
            <a href="/#about" className="nav-link">{t('nav_about')}</a>
            <a href="/#faq" className="nav-link">{t('nav_faq')}</a>
          </div>

          <div className="navbar-actions-desktop">
            <LanguageToggle />
            
            {user ? (
              <Link to="/dashboard" className="avatar-btn" title={t('nav_dashboard')}>
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {getInitials(user.email)}
                  </div>
                )}
              </Link>
            ) : (
              <Link to="/login" className="btn-secondary">{t('nav_login')}</Link>
            )}
          </div>

          <button className="mobile-menu-btn" onClick={toggleMenu}>
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div className={`mobile-overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <div className={`navbar-menu-mobile ${isMenuOpen ? 'active' : ''}`}>
        <button className="close-menu-btn" onClick={() => setIsMenuOpen(false)}>
          <X size={32} />
        </button>
        

        <div className="navbar-links-mobile">
          <Link to="/" className={`nav-link ${path === '/' ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>{t('nav_home')}</Link>
          {user && (
            <>
              <Link to="/dashboard" className={`nav-link ${path.startsWith('/dashboard') ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                {t('nav_dashboard')}
              </Link>
              <Link to="/analysis" className={`nav-link ${path === '/analysis' ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
                {t('nav_analysis')}
              </Link>
            </>
          )}
          <a href="/#about" className="nav-link" onClick={() => setIsMenuOpen(false)}>{t('nav_about')}</a>
          <a href="/#faq" className="nav-link" onClick={() => setIsMenuOpen(false)}>{t('nav_faq')}</a>
          
          <LanguageToggle isMobile={true} onClose={() => setIsMenuOpen(false)} />
          
          <div className="navbar-actions-mobile-inline">
            {user ? (
              <button className="btn-secondary full-width logout-btn-mobile" onClick={handleLogout}>
                <LogOut size={20} /> <span>{t('nav_logout')}</span>
              </button>
            ) : (
              <Link to="/login" className="btn-secondary" onClick={() => setIsMenuOpen(false)}>{t('nav_login')}</Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
