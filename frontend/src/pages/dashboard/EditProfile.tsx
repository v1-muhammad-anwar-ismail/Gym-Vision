import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { Camera, Check, X, Loader2, ArrowLeft } from 'lucide-react';
import './EditProfile.css';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  username?: string | null;
  age?: number | null;
  location?: string | null;
}

const EditProfile: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useOutletContext<{ user: User }>();
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    username: user.username || '',
    age: user.age?.toString() || '',
    location: user.location || ''
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Debounced username check
  useEffect(() => {
    if (!formData.username || formData.username === user.username) {
      setUsernameAvailable(null);
      return;
    }

    const checkUsername = async () => {
      setIsCheckingUsername(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/profile/check-username/${formData.username}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsernameAvailable(data.available);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const delay = setTimeout(checkUsername, 500);
    return () => clearTimeout(delay);
  }, [formData.username, user.username]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Invalid file type. Only JPG, PNG, GIF are allowed.' });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Ukuran file melebihi batas 2MB (File size exceeds 2MB limit).' });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameAvailable === false) return;

    setIsSaving(true);
    setMessage(null);
    const token = localStorage.getItem('auth_token');

    try {
      // 1. Upload Avatar if changed
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        
        const avatarRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/profile/avatar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
        if (!avatarRes.ok) {
           throw new Error('Failed to upload avatar (Server returned ' + avatarRes.status + ')');
        }
      }

      // 2. Update Profile Data
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username || null,
          age: formData.age ? parseInt(formData.age) : null,
          location: formData.location || null
        })
      });

      if (!res.ok) {
        let errorMsg = 'Failed to update profile';
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      setMessage({ type: 'success', text: t('prof_save') + ' Success!' });
      setTimeout(() => navigate('/dashboard'), 1500); // go back after success

    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message;
      if (errorMsg === 'Failed to fetch') {
        errorMsg = t('err_failed_to_fetch') || 'Gagal terhubung ke server (Failed to fetch). Pastikan server backend menyala dan ukuran file tidak terlalu besar.';
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="edit-profile-container glass-panel">
      <button className="back-button" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={20} />
      </button>

      <h2 className="text-gradient text-center" style={{ marginBottom: '32px' }}>
        {t('dash_edit_profile')}
      </h2>

      {message && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="avatar-section">
          <div className="avatar-wrapper-relative" style={{ position: 'relative' }}>
            <div className="avatar-preview-wrapper" onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="avatar-preview" />
              ) : (
                <div className="avatar-placeholder">{formData.name.charAt(0).toUpperCase()}</div>
              )}
              <div className="avatar-overlay">
                <Camera size={24} />
              </div>
            </div>
            <div className="avatar-badge">
              <Camera size={18} />
            </div>
          </div>
          <p className="avatar-hint">{t('prof_avatar')} (.png, .jpg, .gif)</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".png,.jpg,.jpeg,.gif" 
            hidden 
          />
        </div>

        <div className="form-group">
          <label>{t('prof_name')}</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label>{t('prof_username')}</label>
          <div className="username-input-wrapper">
            <input 
              type="text" 
              name="username" 
              value={formData.username} 
              onChange={handleChange} 
              className={`form-input ${usernameAvailable === false ? 'error' : ''} ${usernameAvailable === true ? 'success' : ''}`}
            />
            <div className="username-status">
              {isCheckingUsername && <Loader2 size={18} className="spin" />}
              {!isCheckingUsername && usernameAvailable === true && <Check size={18} color="#34c759" />}
              {!isCheckingUsername && usernameAvailable === false && <X size={18} color="#ff3b30" />}
            </div>
          </div>
          {!isCheckingUsername && usernameAvailable === false && (
            <span className="error-text">{t('prof_username_taken')}</span>
          )}
          {!isCheckingUsername && usernameAvailable === true && (
            <span className="success-text">{t('prof_username_available')}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>{t('prof_age')}</label>
            <input 
              type="number" 
              name="age" 
              value={formData.age} 
              onChange={handleChange} 
              min="0"
              max="120"
              className="form-input"
            />
          </div>

          <div className="form-group half">
            <label>{t('prof_location')}</label>
            <input 
              type="text" 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              className="form-input"
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="btn-primary submit-btn" 
          disabled={isSaving || usernameAvailable === false}
        >
          {isSaving ? <Loader2 className="spin" /> : t('prof_save')}
        </button>
      </form>
    </div>
  );
};

export default EditProfile;
