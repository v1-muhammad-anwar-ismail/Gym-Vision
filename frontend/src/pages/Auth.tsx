import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { ArrowLeft, Loader2, Eye, EyeOff, RotateCcw, Clock, X } from 'lucide-react';
import './Auth.css';

const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001') + '/api';
const OTP_DURATION_SECONDS = 300; // 5 minutes

// Helper to log login history after successful authentication
const logLoginHistory = async (authToken: string) => {
  try {
    // Try to get location data
    let locationData: any = {};
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipInfo = await ipRes.json();
        locationData = {
          city: ipInfo.city,
          country: ipInfo.country_name,
          latitude: ipInfo.latitude,
          longitude: ipInfo.longitude,
        };
      }
    } catch (e) {
      console.warn('Could not fetch IP location', e);
    }

    await fetch(`${API_BASE}/account/login-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(locationData),
    });
  } catch (err) {
    console.error('Failed to log login history:', err);
  }
};

const Auth = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Map backend error messages to translation keys
  const translateError = (msg: string): string => {
    const errorMap: Record<string, string> = {
      'Incorrect password': t('err_incorrect_password'),
      'Invalid OTP code': t('err_invalid_otp'),
      'OTP has expired': t('err_otp_expired'),
      'Your account has been banned. Please contact support.': t('err_account_banned'),
      'Authentication failed': t('err_auth_failed'),
      'Failed to send OTP': t('err_send_otp_failed'),
    };
    return errorMap[msg] || msg;
  };

  // Multi-step state: 'email' | 'otp' | 'password'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'otp' | 'password'>('otp');
  const [resetOtp, setResetOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const resetOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Timer
  const [countdown, setCountdown] = useState(OTP_DURATION_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start countdown timer
  const startTimer = useCallback(() => {
    setCountdown(OTP_DURATION_SECONDS);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format countdown as mm:ss
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handle Google OAuth callback (query params from redirect)
  const processedGoogleRef = useRef(false);
  
  useEffect(() => {
    if (processedGoogleRef.current) return;

    const googleToken = searchParams.get('google_token');
    const googleRegistered = searchParams.get('is_registered');
    const googleEmail = searchParams.get('email');
    const googleError = searchParams.get('error');

    if (googleError) {
      setError(googleError);
      return;
    }

    if (googleToken && googleEmail) {
      processedGoogleRef.current = true;
      if (googleRegistered === 'true') {
        localStorage.setItem('auth_token', googleToken);
        logLoginHistory(googleToken);
        const redirectTo = localStorage.getItem('redirect_after_login') || '/';
        localStorage.removeItem('redirect_after_login');
        navigate(redirectTo);
        return;
      } else {
        localStorage.setItem('temp_google_token', googleToken);
        setEmail(googleEmail);
        setIsRegistered(false);
        setStep('password');
      }
    }
  }, [searchParams, navigate]);

  // ---- STEP 1: Send OTP ----
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setIsRegistered(data.is_registered);
      setStep('otp');
      startTimer();
    } catch (err: unknown) {
      if (err instanceof Error) setError(translateError(err.message));
      else setError(translateError(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // ---- Resend OTP ----
  const handleResendOtp = async () => {
    setError('');
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');
      startTimer();
    } catch (err: unknown) {
      if (err instanceof Error) setError(translateError(err.message));
      else setError(translateError(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // ---- STEP 2: Verify OTP ----
  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError(t('otp_incomplete'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');
      setIsRegistered(data.is_registered);
      if (timerRef.current) clearInterval(timerRef.current);
      setStep('password');
    } catch (err: unknown) {
      if (err instanceof Error) setError(translateError(err.message));
      else setError(translateError(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // ---- STEP 3: Submit Password ----
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!isRegistered && password !== confirmPassword) {
      setError(t('password_mismatch'));
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { email, password };
      if (!isRegistered) {
        body.password_confirmation = confirmPassword;
      }

      const res = await fetch(`${API_BASE}/auth/submit-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('auth_token', data.token);
      localStorage.removeItem('temp_google_token');
      logLoginHistory(data.token);
      const redirectTo = localStorage.getItem('redirect_after_login') || '/';
      localStorage.removeItem('redirect_after_login');
      navigate(redirectTo);
    } catch (err: unknown) {
      if (err instanceof Error) setError(translateError(err.message));
      else setError(translateError(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = () => {
    const backendBase = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001');
    window.location.href = `${backendBase}/auth/google/redirect`;
  };

  // ---- RESET PASSWORD HANDLERS ----
  const handleRequestResetPassword = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      
      setResetOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmNewPassword('');
      setResetMessage(null);
      setResetStep('otp');
      setShowResetModal(true);
    } catch (err: unknown) {
      if (err instanceof Error) setError(translateError(err.message));
      else setError(translateError(String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleResetOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...resetOtp];
    newOtp[index] = value;
    setResetOtp(newOtp);

    if (value !== '' && index < 5) {
      resetOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleResetOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && resetOtp[index] === '' && index > 0) {
      resetOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleResetOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...resetOtp];
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) newOtp[i] = pastedData[i];
    }
    setResetOtp(newOtp);
    if (pastedData.length < 6) {
      resetOtpRefs.current[pastedData.length]?.focus();
    } else {
      resetOtpRefs.current[5]?.focus();
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (resetStep === 'otp') {
      const code = resetOtp.join('');
      if (code.length < 6) {
        setResetMessage({ type: 'error', text: t('otp_incomplete') || 'Incomplete OTP' });
        return;
      }
      setResetMessage(null);
      setResetStep('password');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setResetMessage({ type: 'error', text: t('password_mismatch') || 'Passwords do not match' });
      return;
    }

    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: resetOtp.join(''),
          new_password: newPassword,
          new_password_confirmation: confirmNewPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      // Success
      setResetMessage({ type: 'success', text: data.message });
      setTimeout(() => {
        setShowResetModal(false);
      }, 2000);

    } catch (err: unknown) {
      if (err instanceof Error) setResetMessage({ type: 'error', text: translateError(err.message) });
      else setResetMessage({ type: 'error', text: translateError(String(err)) });
      // If OTP expired or invalid, go back to OTP step
      if (err instanceof Error && (err.message.includes('OTP') || err.message.includes('expired') || err.message.includes('Invalid'))) {
        setResetStep('otp');
      }
    } finally {
      setIsResetting(false);
    }
  };

  // OTP input handlers
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

  return (
    <div className="auth-page">
      <div className="auth-container">

        {/* Left Side: Form */}
        <div className="auth-left">
          <div className="auth-header">
            <h1 className="auth-title">{t('auth_title_1')}</h1>
          </div>

          <div className="auth-box">

            {/* ===== STEP: EMAIL ===== */}
            {step === 'email' && (
              <>
                <button className="btn-google" onClick={handleGoogleLogin}>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="google-icon" />
                  {t('auth_google_btn')}
                </button>

                <div className="auth-divider"><span>{t('auth_or')}</span></div>

                <form onSubmit={handleEmailSubmit} className="auth-form">
                  <input
                    type="email"
                    className="auth-input"
                    placeholder={t('auth_email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-email" disabled={loading}>
                    {loading ? <Loader2 className="spin-icon" size={20} /> : t('auth_email_btn')}
                  </button>
                </form>

                <p className="auth-terms">{t('auth_terms')}</p>
              </>
            )}

            {/* ===== STEP: OTP ===== */}
            {step === 'otp' && (
              <>
                <button className="btn-back" onClick={() => { setStep('email'); setError(''); setOtp(['','','','','','']); if (timerRef.current) clearInterval(timerRef.current); }}>
                  <ArrowLeft size={16} /> {t('otp_back')}
                </button>
                <h2 className="step-title">{t('otp_title')}</h2>
                <p className="step-subtitle">{t('otp_subtitle')} <strong>{email}</strong></p>

                {/* Countdown Timer */}
                <div className={`otp-timer ${canResend ? 'expired' : ''}`}>
                  <Clock size={14} />
                  <span>
                    {canResend
                      ? t('otp_expired')
                      : `${t('otp_expires_in')} ${formatTime(countdown)}`
                    }
                  </span>
                </div>

                <form onSubmit={handleOtpSubmit} className="auth-form">
                  <div className="otp-inputs">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-box"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  <button type="submit" className="btn-email" disabled={loading || canResend}>
                    {loading ? <Loader2 className="spin-icon" size={20} /> : t('otp_verify_btn')}
                  </button>
                </form>

                {/* Resend OTP */}
                <button
                  className={`btn-resend ${canResend ? 'active' : ''}`}
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                >
                  <RotateCcw size={14} />
                  {t('otp_resend')}
                </button>
              </>
            )}

            {/* ===== STEP: PASSWORD ===== */}
            {step === 'password' && (
              <>
                <button className="btn-back" onClick={() => { setStep('otp'); setError(''); setPassword(''); setConfirmPassword(''); }}>
                  <ArrowLeft size={16} /> {t('otp_back')}
                </button>
                <h2 className="step-title">
                  {isRegistered ? t('password_title_login') : t('password_title_register')}
                </h2>
                <p className="step-subtitle">{email}</p>

                <form onSubmit={handlePasswordSubmit} className="auth-form">
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder={t('password_placeholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button type="button" className="toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {!isRegistered && (
                    <div className="password-field">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="auth-input"
                        placeholder={t('password_confirm_placeholder')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <button type="button" className="toggle-pw" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  )}

                  {isRegistered && (
                    <div style={{ textAlign: 'center', marginTop: '4px', marginBottom: '16px' }}>
                      <button
                        type="button"
                        onClick={handleRequestResetPassword}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-neon)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        disabled={loading}
                      >
                        {t('auth_forgot_pass')}
                      </button>
                    </div>
                  )}

                  <button type="submit" className="btn-email" disabled={loading}>
                    {loading ? <Loader2 className="spin-icon" size={20} /> : t('auth_continue_btn')}
                  </button>
                </form>
              </>
            )}

            {/* Error Message */}
            {error && <p className="auth-error">{error}</p>}
          </div>
        </div>

        {/* Right Side: Image */}
        <div className="auth-right">
          <div className="auth-image-desktop" style={{ backgroundImage: 'url(/Gym-BackGround.webp)' }}></div>
        </div>

      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modal-overlay" style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-dark)', padding: '24px', borderRadius: '16px', position: 'relative', border: '1px solid var(--glass-border)', boxSizing: 'border-box' }}>
            <button 
              className="close-btn" 
              onClick={() => setShowResetModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{marginTop: 0, marginBottom: '24px'}}>{t('auth_forgot_pass')?.split('?')[1]?.trim() || 'Reset Password'}</h2>
            
            {resetMessage && (
              <div className={`alert ${resetMessage.type}`} style={{marginBottom: '24px', padding: '12px', borderRadius: '8px', background: resetMessage.type === 'error' ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)', color: resetMessage.type === 'error' ? '#ff3b30' : '#34c759', border: `1px solid ${resetMessage.type === 'error' ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.2)'}` }}>
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleVerifyAndReset}>
              {resetStep === 'otp' ? (
                <>
                  <p style={{color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px'}}>
                    {t('otp_instruction') || 'Enter the 6-digit code sent to your email.'}
                  </p>
                  <div className="otp-inputs" style={{marginBottom: '24px'}}>
                    {resetOtp.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        value={digit}
                        ref={(el) => { resetOtpRefs.current[index] = el; }}
                        onChange={(e) => handleResetOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleResetOtpKeyDown(index, e)}
                        onPaste={handleResetOtpPaste}
                        className="otp-box"
                      />
                    ))}
                  </div>
                  <button type="submit" className="btn-primary full-width" style={{width: '100%'}}>
                    {t('otp_verify_btn') || 'Verify OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div className="form-group password-input-wrapper" style={{marginBottom: '16px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)'}}>New Password</label>
                    <div className="password-input-container" style={{position: 'relative', display: 'flex', alignItems: 'center', width: '100%'}}>
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="form-input" 
                        placeholder="New Password"
                        required 
                        minLength={8}
                        style={{width: '100%', padding: '12px 40px 12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white'}}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex'}}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group password-input-wrapper" style={{marginBottom: '24px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)'}}>Confirm New Password</label>
                    <div className="password-input-container" style={{position: 'relative', display: 'flex', alignItems: 'center', width: '100%'}}>
                      <input 
                        type={showConfirmNewPassword ? "text" : "password"} 
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="form-input" 
                        placeholder="Confirm New Password"
                        required 
                        minLength={8}
                        style={{width: '100%', padding: '12px 40px 12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white'}}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        style={{position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex'}}
                      >
                        {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary full-width" disabled={isResetting} style={{width: '100%'}}>
                    {isResetting ? <Loader2 className="spin" /> : "Save Password"}
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

export default Auth;
