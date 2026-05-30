import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { 
  KeyRound, 
  MonitorSmartphone, 
  MapPin, 
  Clock, 
  ArrowLeft,
  Mail,
  X,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import './AccountSettings.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  google_id: string | null;
  password?: string;
}

interface LoginHistory {
  id: number;
  device: string;
  ip_address: string;
  city: string | null;
  country: string | null;
  logged_in_at: string;
}

const AccountSettings: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useOutletContext<{ user: User }>();
  
  const [histories, setHistories] = useState<LoginHistory[]>([]);
  
  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passMessage, setPassMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // OTP Reset State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [resetStep, setResetStep] = useState<'otp' | 'new_password'>('otp');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Google Link State
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [googleMessage, setGoogleMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const token = localStorage.getItem('auth_token');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetchLoginHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLoginHistory = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/account/login-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistories(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);
    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'error', text: t('password_mismatch') || 'Passwords do not match' });
      return;
    }
    
    setIsUpdatingPassword(true);
    try {
      const res = await fetch(`${backendUrl}/api/account/change-password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword, new_password_confirmation: confirmPassword })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      
      setPassMessage({ type: 'success', text: data.message });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMessage({ type: 'error', text: err.message });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleGoogleAction = async () => {
    setGoogleMessage(null);
    if (user.google_id) {
      // Unlink
      setIsUnlinking(true);
      try {
        const res = await fetch(`${backendUrl}/api/account/unlink-google`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to unlink Google account');
        
        setGoogleMessage({ type: 'success', text: data.message });
        // Force refresh user state by reloading or navigating
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        setGoogleMessage({ type: 'error', text: err.message });
      } finally {
        setIsUnlinking(false);
      }
    } else {
      // Link (Redirect to Google OAuth)
      window.location.href = `${backendUrl}/auth/google/redirect`;
    }
  };

  // --- OTP Reset Logic ---
  const handleRequestOtp = async () => {
    setIsSendingOtp(true);
    setOtpMessage(null);
    try {
      const res = await fetch(`${backendUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      
      setShowOtpModal(true);
      setResetStep('otp');
      setOtpMessage({ type: 'success', text: t('acc_otp_sent') });
    } catch (err: any) {
      setPassMessage({ type: 'error', text: err.message });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetStep === 'otp') {
      const otpCode = otp.join('');
      if (otpCode.length < 6) {
        setOtpMessage({ type: 'error', text: 'OTP incomplete' });
        return;
      }
      setResetStep('new_password');
      setOtpMessage(null);
    } else {
      if (newPassword !== confirmPassword) {
        setOtpMessage({ type: 'error', text: t('password_mismatch') || 'Passwords do not match' });
        return;
      }
      setIsVerifyingOtp(true);
      try {
        const otpCode = otp.join('');
        const res = await fetch(`${backendUrl}/api/account/reset-password`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ otp: otpCode, new_password: newPassword, new_password_confirmation: confirmPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');
        
        setShowOtpModal(false);
        setPassMessage({ type: 'success', text: t('acc_reset_success') });
        setNewPassword('');
        setConfirmPassword('');
        setOtp(Array(6).fill(''));
      } catch (err: any) {
        setOtpMessage({ type: 'error', text: err.message });
      } finally {
        setIsVerifyingOtp(false);
      }
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat(navigator.language, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d);
  };

  return (
    <div className="account-settings-container">
      <button className="back-button" onClick={() => navigate('/dashboard')} style={{marginBottom: '24px'}}>
        <ArrowLeft size={20} />
      </button>

      <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px'}}>
        <KeyRound size={32} color="var(--primary-neon)" />
        <h2 className="text-gradient" style={{margin: 0}}>{t('dash_account_settings')}</h2>
      </div>

      <div className="account-sections-grid">
        
        {/* Google Link Section */}
        <div className="glass-panel account-card full-width-section">
          <div className="account-card-header">
            <Mail size={24} color="var(--primary-neon)" />
            <h3>Google Account</h3>
          </div>
          
          <div className="google-status">
            <div className="status-text">
              <h4>{user.google_id ? t('acc_google_connected') : 'Google Account Not Linked'}</h4>
              <p>{user.email}</p>
            </div>
            {googleMessage && (
              <span className={`text-${googleMessage.type}`} style={{fontSize: '14px', marginRight: '16px'}}>
                {googleMessage.text}
              </span>
            )}
            <button 
              className="btn-google-action" 
              onClick={handleGoogleAction}
              disabled={isUnlinking}
            >
              {isUnlinking ? <Loader2 className="spin" size={18} /> : (user.google_id ? t('acc_google_unlink') : t('acc_google_link'))}
            </button>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="glass-panel account-card">
          <div className="account-card-header">
            <KeyRound size={24} color="var(--primary-neon)" />
            <h3>{t('acc_change_pass_btn')}</h3>
          </div>
          
          {passMessage && (
            <div className={`alert ${passMessage.type}`} style={{marginBottom: '16px'}}>
              {passMessage.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div className="form-group-account password-input-wrapper">
              <label>{t('acc_old_pass')}</label>
              <div className="password-input-container">
                <input 
                  type={showOldPassword ? "text" : "password"} 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="form-input" 
                  placeholder={t('acc_old_pass') || 'Old Password'}
                  required 
                />
                <button 
                  type="button" 
                  className="password-toggle-btn" 
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group-account password-input-wrapper">
              <label>{t('acc_new_pass')}</label>
              <div className="password-input-container">
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input" 
                  placeholder={t('acc_new_pass') || 'New Password'}
                  required 
                  minLength={8}
                />
                <button 
                  type="button" 
                  className="password-toggle-btn" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group-account password-input-wrapper">
              <label>{t('acc_confirm_pass')}</label>
              <div className="password-input-container">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input" 
                  placeholder={t('acc_confirm_pass') || 'Confirm Password'}
                  required 
                  minLength={8}
                />
                <button 
                  type="button" 
                  className="password-toggle-btn" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div className="reset-password-section">
              <div className="reset-password-info">
                <p>{t('acc_reset_pass_desc')}</p>
              </div>
              <button 
                type="button" 
                className="btn-reset-action" 
                onClick={handleRequestOtp}
                disabled={isSendingOtp}
              >
                {isSendingOtp ? <Loader2 className="spin" size={16} /> : t('acc_reset_pass')}
              </button>
            </div>

            <div className="account-form-actions">
              <button type="submit" className="btn-primary" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? <Loader2 className="spin" /> : t('prof_save')}
              </button>
            </div>
          </form>
        </div>

        {/* Login History Section */}
        <div className="glass-panel account-card">
          <div className="account-card-header">
            <Clock size={24} color="var(--primary-neon)" />
            <h3>{t('acc_login_history')}</h3>
          </div>
          
          <div style={{overflowX: 'auto'}}>
            {histories.length > 0 ? (
              <table className="login-history-table">
                <thead>
                  <tr>
                    <th>{t('acc_device')}</th>
                    <th>{t('acc_loc')}</th>
                    <th>{t('acc_time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {histories.map(h => (
                    <tr key={h.id}>
                      <td data-label={t('acc_device')}>
                        <div className="history-device">
                          <MonitorSmartphone size={16} color="var(--text-muted)" />
                          <span title={h.device}>{h.device.split(' ').slice(0,2).join(' ')}</span>
                        </div>
                      </td>
                      <td data-label={t('acc_loc')}>
                        <div className="history-device">
                          <MapPin size={16} color="var(--text-muted)" />
                          <span>{h.city ? `${h.city}, ${h.country}` : (h.ip_address === '127.0.0.1' ? 'Localhost' : h.ip_address)}</span>
                        </div>
                      </td>
                      <td data-label={t('acc_time')}>{formatDate(h.logged_in_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0'}}>No login history found.</p>
            )}
          </div>
        </div>
      </div>

      {/* OTP Reset Modal */}
      {showOtpModal && (
        <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-dark)', padding: '24px', borderRadius: '16px', position: 'relative', border: '1px solid var(--glass-border)', boxSizing: 'border-box' }}>
            <button 
              className="close-btn" 
              onClick={() => { setShowOtpModal(false); setResetStep('otp'); }}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{marginTop: 0, marginBottom: '24px'}}>{t('acc_reset_pass')}</h2>
            
            {otpMessage && (
              <div className={`alert ${otpMessage.type}`} style={{marginBottom: '24px'}}>
                {otpMessage.text}
              </div>
            )}

            <form onSubmit={handleVerifyAndReset}>
              {resetStep === 'otp' ? (
                <>
                  <p style={{color: 'var(--text-muted)', marginBottom: '16px'}}>
                    {t('acc_enter_otp')}
                  </p>
                  <div className="otp-inputs" style={{marginBottom: '24px'}}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={digit}
                        ref={(el) => { otpRefs.current[index] = el; }}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="otp-box"
                      />
                    ))}
                  </div>
                  <button type="submit" className="btn-primary full-width">
                    Verify OTP
                  </button>
                </>
              ) : (
                <>
                  <div className="form-group-account password-input-wrapper">
                    <label>{t('acc_new_pass')}</label>
                    <div className="password-input-container">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="form-input" 
                        placeholder={t('acc_new_pass') || 'New Password'}
                        required 
                        minLength={8}
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group-account password-input-wrapper">
                    <label>{t('acc_confirm_pass')}</label>
                    <div className="password-input-container">
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="form-input" 
                        placeholder={t('acc_confirm_pass') || 'Confirm Password'}
                        required 
                        minLength={8}
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary full-width" disabled={isVerifyingOtp}>
                    {isVerifyingOtp ? <Loader2 className="spin" /> : t('prof_save')}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
