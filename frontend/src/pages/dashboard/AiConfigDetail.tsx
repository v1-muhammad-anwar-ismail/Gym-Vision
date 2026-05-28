import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { ArrowLeft, Cpu, Edit3, Trash2, Loader2, X, Key, Globe, Zap } from 'lucide-react';
import './AiSettings.css';

interface AiConfig {
  id: number;
  provider: string;
  model: string;
  api_key: string | null;
  base_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001');

const maskKey = (key: string | null): string => {
  if (!key) return '—';
  if (key.length <= 8) return '••••••••';
  return key.substring(0, 4) + '••••' + key.substring(key.length - 4);
};

const AiConfigDetail: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');

  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Edit form
  const [editProvider, setEditProvider] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/ai-configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: AiConfig[] = await res.json();
        const found = data.find(c => c.id === Number(id));
        if (found) {
          setConfig(found);
          setEditProvider(found.provider);
          setEditModel(found.model);
          setEditApiKey('');
          setEditBaseUrl(found.base_url || '');
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [id]);

  const handleToggleActive = async () => {
    if (!config) return;
    try {
      const res = await fetch(`${backendUrl}/api/ai-configs/${config.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !config.is_active }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.data);
      }
    } catch {
      // silently fail
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: any = {
        provider: editProvider,
        model: editModel,
        base_url: editBaseUrl || null,
      };
      // Only send api_key if user typed a new one
      if (editApiKey) payload.api_key = editApiKey;

      const res = await fetch(`${backendUrl}/api/ai-configs/${config.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed');

      setConfig(data.data);
      setShowEditModal(false);
      setMessage({ type: 'success', text: 'Configuration updated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch(`${backendUrl}/api/ai-configs/${config.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        navigate('/dashboard/ai-configs');
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(navigator.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 className="spin" size={32} color="var(--primary-neon)" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="ai-detail-page">
        <button className="btn-back-ai" onClick={() => navigate('/dashboard/ai-configs')}>
          <ArrowLeft size={16} /> {t('ai_back')}
        </button>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
          Configuration not found.
        </p>
      </div>
    );
  }

  return (
    <div className="ai-detail-page">
      {/* Header */}
      <div className="ai-detail-header">
        <button className="btn-back-ai" onClick={() => navigate('/dashboard/ai-configs')}>
          <ArrowLeft size={16} /> {t('ai_back')}
        </button>
        <h2>
          <Cpu size={22} color="var(--primary-neon)" />
          {config.provider}
        </h2>
      </div>

      {/* Message */}
      {message && (
        <div className={`ai-alert ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Detail Card */}
      <div className="ai-detail-card">
        <div className="ai-detail-row">
          <span className="ai-detail-label">{t('ai_provider')}</span>
          <span className="ai-detail-value">{config.provider}</span>
        </div>

        <div className="ai-detail-row">
          <span className="ai-detail-label">{t('ai_model')}</span>
          <span className="ai-detail-value mono">{config.model}</span>
        </div>

        <div className="ai-detail-row">
          <span className="ai-detail-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} /> {t('ai_api_key')}
            </span>
          </span>
          <span className="ai-detail-value mono">{maskKey(config.api_key)}</span>
        </div>

        <div className="ai-detail-row">
          <span className="ai-detail-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} /> {t('ai_base_url')}
            </span>
          </span>
          <span className="ai-detail-value mono">{config.base_url || '— (Default)'}</span>
        </div>

        <div className="ai-detail-row">
          <span className="ai-detail-label">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} /> Status
            </span>
          </span>
          <span className="ai-detail-value">
            <div className="ai-toggle-row">
              <button
                className={`ai-toggle ${config.is_active ? 'active' : ''}`}
                onClick={handleToggleActive}
                title={t('ai_toggle_active')}
              />
              <span className={`ai-status-badge ${config.is_active ? 'active' : 'inactive'}`}>
                <span className="ai-status-dot" />
                {config.is_active ? t('ai_active') : t('ai_inactive')}
              </span>
            </div>
          </span>
        </div>

        <div className="ai-detail-row">
          <span className="ai-detail-label">{t('ai_created')}</span>
          <span className="ai-detail-value">{formatDate(config.created_at)}</span>
        </div>

        <div className="ai-detail-row">
          <span className="ai-detail-label">{t('ai_updated')}</span>
          <span className="ai-detail-value">{formatDate(config.updated_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="ai-detail-actions">
        <button className="btn-ai-edit" onClick={() => {
          setEditProvider(config.provider);
          setEditModel(config.model);
          setEditApiKey('');
          setEditBaseUrl(config.base_url || '');
          setShowEditModal(true);
        }}>
          <Edit3 size={16} /> {t('ai_edit')}
        </button>
        <button className="btn-ai-delete" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 size={16} /> {t('ai_delete')}
        </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="ai-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <button className="ai-modal-close" onClick={() => setShowEditModal(false)}>
              <X size={24} />
            </button>

            <h2>
              <Edit3 size={20} />
              {t('ai_edit')}
            </h2>

            <form onSubmit={handleEdit}>
              <div className="ai-form-group">
                <label>{t('ai_provider')} *</label>
                <input
                  className="ai-form-input"
                  value={editProvider}
                  onChange={e => setEditProvider(e.target.value)}
                  placeholder={t('ai_provider_placeholder')}
                  required
                />
              </div>

              <div className="ai-form-group">
                <label>{t('ai_model')} *</label>
                <input
                  className="ai-form-input"
                  value={editModel}
                  onChange={e => setEditModel(e.target.value)}
                  placeholder={t('ai_model_placeholder')}
                  required
                />
              </div>

              <div className="ai-form-group">
                <label>{t('ai_api_key')} ({t('ai_key_hidden')})</label>
                <input
                  className="ai-form-input"
                  type="password"
                  value={editApiKey}
                  onChange={e => setEditApiKey(e.target.value)}
                  placeholder={t('ai_key_placeholder')}
                />
              </div>

              <div className="ai-form-group">
                <label>{t('ai_base_url')}</label>
                <input
                  className="ai-form-input"
                  value={editBaseUrl}
                  onChange={e => setEditBaseUrl(e.target.value)}
                  placeholder={t('ai_url_placeholder')}
                />
              </div>

              <div className="ai-modal-actions">
                <button type="button" className="btn-ai-cancel" onClick={() => setShowEditModal(false)}>
                  {t('ai_cancel')}
                </button>
                <button type="submit" className="btn-ai-save" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={16} /> : t('ai_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="ai-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 style={{ color: '#ff3b30' }}>
              <Trash2 size={20} />
              {t('ai_delete')}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              {t('ai_delete_confirm')}
            </p>
            <div className="ai-modal-actions">
              <button className="btn-ai-cancel" onClick={() => setShowDeleteConfirm(false)}>
                {t('ai_cancel')}
              </button>
              <button
                className="btn-ai-delete"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? <Loader2 className="spin" size={16} /> : t('ai_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiConfigDetail;
