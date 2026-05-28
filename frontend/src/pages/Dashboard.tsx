import React, { useEffect, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { 
  UserCircle, 
  Settings, 
  History, 
  BarChart3, 
  Cpu, 
  Users, 
  LogOut,
  Activity
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import Footer from '../components/Footer';
import './Dashboard.css';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
}

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user`, {
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
          navigate('/login');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/');
  };

  const getInitials = (email: string) => {
    return email ? email.charAt(0).toUpperCase() : '?';
  };

  if (!user) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  // If we are on a sub-route (e.g. /dashboard/profile), render the Outlet instead of the grid
  if (location.pathname !== '/dashboard' && location.pathname !== '/dashboard/') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="dashboard-container" style={{ flex: 1, minHeight: 'auto' }}>
          <div className="container">
            <Outlet context={{ user }} />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Render Grid Cards for main /dashboard route
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="dashboard-container" style={{ flex: 1, minHeight: 'auto' }}>
        <div className="container">
        <div className="dashboard-header text-center">
          {user.avatar ? (
            <img src={user.avatar} alt="Avatar" className="dashboard-avatar-large" />
          ) : (
            <div className="dashboard-avatar-placeholder-large">
              {getInitials(user.email)}
            </div>
          )}
          <h1 className="text-gradient" style={{marginTop: '16px'}}>{t('dash_welcome')}, {user.name}</h1>
          <p style={{color: 'var(--text-muted)'}}>{user.email} • {user.role.toUpperCase()}</p>
        </div>

        <div className="dashboard-grid">
          <Link to="/dashboard/profile" className="dash-card">
            <div className="dash-card-icon"><UserCircle size={32} /></div>
            <h3>{t('dash_edit_profile')}</h3>
          </Link>

          <Link to="/analysis" className="dash-card" style={{ border: '1px solid var(--primary-neon)' }}>
            <div className="dash-card-icon"><Activity size={32} /></div>
            <h3 style={{ color: 'var(--primary-neon)' }}>{t('dash_analyze') || 'Analyze Video'}</h3>
          </Link>
          
          <Link to="/dashboard/account" className="dash-card">
            <div className="dash-card-icon"><Settings size={32} /></div>
            <h3>{t('dash_account_settings')}</h3>
          </Link>
          
          <Link to="/dashboard/history" className="dash-card">
            <div className="dash-card-icon"><History size={32} /></div>
            <h3>{t('dash_analysis_history')}</h3>
          </Link>
          
          <Link to="/dashboard/stats" className="dash-card">
            <div className="dash-card-icon"><BarChart3 size={32} /></div>
            <h3>{t('dash_stats_progress')}</h3>
          </Link>
          
          {user.role === 'admin' && (
            <>
              <Link to="/dashboard/ai-configs" className="dash-card admin-card">
                <div className="dash-card-icon"><Cpu size={32} /></div>
                <h3>{t('dash_ai_settings')}</h3>
              </Link>
              
              <Link to="/dashboard/users" className="dash-card admin-card">
                <div className="dash-card-icon"><Users size={32} /></div>
                <h3>{t('dash_manage_users')}</h3>
              </Link>
            </>
          )}

          <button onClick={handleLogout} className="dash-card danger-card">
            <div className="dash-card-icon"><LogOut size={32} /></div>
            <h3>{t('dash_logout')}</h3>
          </button>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
