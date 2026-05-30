import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { Plus, Cpu, Key, Loader2, X, Zap, ArrowLeft } from 'lucide-react';
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

const PRESET_PROVIDERS = [
  { name: 'Google Gemini', model: 'gemini-1.5-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
  { name: 'OpenAI', model: 'gpt-4o', baseUrl: 'https://api.openai.com/v1' },
  { name: 'DeepSeek', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
  { name: 'Groq', model: 'llama3-8b-8192', baseUrl: 'https://api.groq.com/openai/v1' },
  { name: 'Together AI', model: 'meta-llama/Llama-3-70b-chat-hf', baseUrl: 'https://api.together.xyz/v1' },
  { name: 'Anthropic', model: 'claude-3-5-sonnet-20240620', baseUrl: 'https://api.anthropic.com' },
  { name: 'OpenRouter', model: 'deepseek/deepseek-chat', baseUrl: 'https://openrouter.ai/api/v1' },
];

// Helper to get provider initials/icon letter
const getProviderIcon = (provider: string): string => {
  const lower = provider.toLowerCase();
  if (lower.includes('google') || lower.includes('gemini')) return 'G';
  if (lower.includes('openai') || lower.includes('gpt')) return 'Ai';
  if (lower.includes('deepseek')) return 'DS';
  if (lower.includes('groq')) return 'GQ';
  if (lower.includes('together')) return 'TG';
  if (lower.includes('anthropic') || lower.includes('claude')) return 'An';
  if (lower.includes('openrouter')) return 'OR';
  return provider.substring(0, 2).toUpperCase();
};

// Helper to mask API key
const maskKey = (key: string | null): string => {
  if (!key) return '—';
  if (key.length <= 8) return '••••••••';
  return key.substring(0, 4) + '••••' + key.substring(key.length - 4);
};

const AiSettings: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');

  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Form state
  const [formProvider, setFormProvider] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');

  const fetchConfigs = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/ai-configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${backendUrl}/api/ai-configs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: formProvider,
          model: formModel,
          api_key: formApiKey || null,
          base_url: formBaseUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed');

      setConfigs(prev => [...prev, data.data]);
      setShowAddModal(false);
      setFormProvider('');
      setFormModel('');
      setFormApiKey('');
      setFormBaseUrl('');
      setMessage({ type: 'success', text: 'AI Config created!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 className="spin" size={32} color="var(--primary-neon)" />
      </div>
    );
  }

  return (
    <div className="ai-settings-page">
      {/* Header */}
      <div className="ai-header" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '16px' }}>
        <button className="btn-back-ai" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> {t('ai_back') || 'Back'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2>
            <Cpu size={24} color="var(--primary-neon)" />
            {t('ai_title')}
          </h2>
          <button className="btn-add-provider" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            {t('ai_add')}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`ai-alert ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Card Grid */}
      {configs.length > 0 ? (
        <div className="ai-card-grid">
          {configs.map(config => (
            <Link
              key={config.id}
              to={`/dashboard/ai-configs/${config.id}`}
              className="ai-card"
            >
              <div className="ai-card-header">
                <div className="ai-card-provider">
                  <div className="ai-provider-icon">
                    {getProviderIcon(config.provider)}
                  </div>
                  <h3>{config.provider}</h3>
                </div>
                <span className={`ai-status-badge ${config.is_active ? 'active' : 'inactive'}`}>
                  <span className="ai-status-dot" />
                  {config.is_active ? t('ai_active') : t('ai_inactive')}
                </span>
              </div>

              <div className="ai-card-model">
                {config.model}
              </div>

              <div className="ai-card-meta">
                <span className="ai-key-masked">
                  <Key size={12} />
                  {maskKey(config.api_key)}
                </span>
                {config.base_url && (
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>
                    <Zap size={10} /> Custom URL
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="ai-empty-state">
          <Cpu size={64} />
          <p>{t('ai_no_configs')}</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="ai-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <button className="ai-modal-close" onClick={() => setShowAddModal(false)}>
              <X size={24} />
            </button>

            <h2>
              <Plus size={20} />
              {t('ai_add')}
            </h2>

            <div className="ai-preset-label">Pilih dari Preset (Opsional):</div>
            <div className="ai-presets">
              {PRESET_PROVIDERS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ai-preset-btn"
                  onClick={() => {
                    setFormProvider(preset.name);
                    setFormModel(preset.model);
                    setFormBaseUrl(preset.baseUrl);
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <form onSubmit={handleAdd}>
              <div className="ai-form-group">
                <label>{t('ai_provider')} *</label>
                <input
                  className="ai-form-input"
                  value={formProvider}
                  onChange={e => setFormProvider(e.target.value)}
                  placeholder={t('ai_provider_placeholder')}
                  required
                />
              </div>

              <div className="ai-form-group">
                <label>{t('ai_model')} *</label>
                <input
                  className="ai-form-input"
                  value={formModel}
                  onChange={e => setFormModel(e.target.value)}
                  placeholder={t('ai_model_placeholder')}
                  required
                />
              </div>

              <div className="ai-form-group">
                <label>{t('ai_api_key')}</label>
                <input
                  className="ai-form-input"
                  type="password"
                  value={formApiKey}
                  onChange={e => setFormApiKey(e.target.value)}
                  placeholder={t('ai_key_placeholder')}
                />
              </div>

              <div className="ai-form-group">
                <label>{t('ai_base_url')}</label>
                <input
                  className="ai-form-input"
                  value={formBaseUrl}
                  onChange={e => setFormBaseUrl(e.target.value)}
                  placeholder={t('ai_url_placeholder')}
                />
              </div>

              <div className="ai-modal-actions">
                <button type="button" className="btn-ai-cancel" onClick={() => setShowAddModal(false)}>
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
    </div>
  );
};

export default AiSettings;
