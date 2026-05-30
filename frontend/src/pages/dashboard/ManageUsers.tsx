import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ShieldAlert, Trash2, CheckCircle, Ban, ArrowLeft } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import './ManageUsers.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_banned: boolean;
}

const ManageUsers: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const { user: currentUser } = useOutletContext<{ user: User }>();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBan = async (id: number) => {
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${id}/toggle-ban`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <div className="admin-users-container">
      <button className="back-button" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={20} />
      </button>

      <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'}}>
        <ShieldAlert size={32} color="var(--primary-neon)" />
        <h2 className="text-gradient" style={{margin: 0}}>{t('admin_users_title')}</h2>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin_users_name')}</th>
              <th>{t('admin_users_role')}</th>
              <th>{t('admin_users_status')}</th>
              <th style={{textAlign: 'right'}}>{t('admin_users_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label={t('admin_users_name')}>
                  <div>
                    <div style={{fontWeight: 'bold'}}>{u.name}</div>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{u.email}</div>
                  </div>
                </td>
                <td data-label={t('admin_users_role')}>
                  <span style={{
                    background: u.role === 'admin' ? 'rgba(191, 0, 255, 0.2)' : 'rgba(0, 240, 255, 0.1)',
                    color: u.role === 'admin' ? 'var(--secondary-neon)' : 'var(--primary-neon)',
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'
                  }}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td data-label={t('admin_users_status')}>
                  {u.is_banned ? (
                    <span style={{color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem'}}><Ban size={14}/> {t('admin_users_banned')}</span>
                  ) : (
                    <span style={{color: '#34c759', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem'}}><CheckCircle size={14}/> {t('admin_users_active')}</span>
                  )}
                </td>
                <td className="actions-cell">
                  {u.id !== currentUser.id && u.role !== 'admin' && (
                    <div className="admin-actions">
                      <button 
                        onClick={() => toggleBan(u.id)}
                        style={{
                          background: u.is_banned ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                          color: u.is_banned ? '#34c759' : '#ff3b30',
                          border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
                          display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                        {u.is_banned ? t('admin_users_unban_btn') : t('admin_users_ban_btn')}
                      </button>
                      <button 
                        onClick={() => setUserToDelete(u.id)}
                        style={{
                          background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30',
                          border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userToDelete !== null && (
        <div className="user-modal-overlay" onClick={() => setUserToDelete(null)}>
          <div className="user-modal-content" onClick={(e) => e.stopPropagation()}>
            <p className="user-modal-text">{t('admin_users_delete_confirm')}</p>
            <div className="user-modal-actions">
              <button className="btn-secondary" onClick={() => setUserToDelete(null)}>
                {t('admin_users_cancel')}
              </button>
              <button className="btn-primary" style={{background: '#ff3b30', borderColor: '#ff3b30', color: '#fff'}} onClick={confirmDelete}>
                {t('admin_users_delete_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
