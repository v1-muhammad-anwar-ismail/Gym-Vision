import React, { useState, useEffect } from 'react';
import { History, Calendar, Info, Activity, Plus, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import './AnalysisHistory.css';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001');

interface AnalysisHistoryItem {
  id: number;
  exercise_type: string;
  ai_feedback: string;
  score: number;
  created_at: string;
}

const AnalysisHistory: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [histories, setHistories] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${backendUrl}/api/analysis/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch history');
      
      const data = await res.json();
      setHistories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-average';
    return 'score-poor';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="history-page">
      <button className="back-button" onClick={() => navigate(-1)} style={{ marginBottom: '24px' }}>
        <ArrowLeft size={20} />
      </button>

      <div className="history-header">
        <h2><History size={28} color="var(--primary-neon)" /> {t('hist_title')}</h2>
        <p>{t('hist_subtitle')}</p>
      </div>

      <div className="storage-note">
        <Info size={20} className="note-icon" />
        <div>{t('hist_storage_note')}</div>
      </div>

      {loading ? (
        <div className="history-loading">
          <Activity size={32} className="spinner" />
          <p>Memuat riwayat...</p>
        </div>
      ) : error ? (
        <div className="history-empty" style={{ borderColor: '#FF4757' }}>
          <p style={{ color: '#FF4757' }}>{error}</p>
        </div>
      ) : histories.length === 0 ? (
        <div className="history-empty">
          <History size={48} className="empty-icon" />
          <h3>{t('hist_empty')}</h3>
          <p>{t('hist_empty_desc')}</p>
          <Link to="/dashboard/analysis" className="btn-primary">
            <Plus size={20} /> {t('hist_go_analyze')}
          </Link>
        </div>
      ) : (
        <div className="history-grid">
          {histories.map((item) => (
            <div className="history-card" key={item.id}>
              <div className="history-card-header">
                <div>
                  <div className="exercise-type">{item.exercise_type}</div>
                  <div className="history-date">
                    <Calendar size={14} /> {formatDate(item.created_at)}
                  </div>
                </div>
                <div className={`history-score-badge ${getScoreColorClass(item.score)}`}>
                  {item.score}
                </div>
              </div>
              <pre className="history-feedback">
                {item.ai_feedback}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;
