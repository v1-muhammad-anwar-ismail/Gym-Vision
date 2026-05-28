import React, { useState, useEffect } from 'react';
import { BarChart3, Activity, Target, Calendar, TrendingUp, ArrowLeft, Plus, Dumbbell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, Legend } from 'recharts';
import './StatsProgress.css';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:7001');

interface StatsData {
  total_analyses: number;
  average_score: number;
  last_workout: {
    exercise_type: string;
    score: number;
    date: string;
  } | null;
  score_trend: { date: string; score: number; count: number }[];
  exercise_breakdown: { name: string; count: number; avg_score: number }[];
}

const StatsProgress: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  useEffect(() => {
    fetchStats();
    
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${backendUrl}/api/analysis/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const formatChartDate = (dateString: any) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--primary-neon)';
    if (score >= 60) return '#FFC107';
    return '#FF4757';
  };

  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-loading">
          <Activity size={32} className="spinner" />
          <p>Memuat statistik...</p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_analyses === 0) {
    return (
      <div className="stats-page">
        <button className="back-button" onClick={() => navigate(-1)} style={{ marginBottom: '24px' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="stats-header">
          <h2><BarChart3 size={28} color="var(--primary-neon)" /> {t('stats_title')}</h2>
          <p>{t('stats_subtitle')}</p>
        </div>
        <div className="stats-empty">
          <BarChart3 size={48} className="empty-icon" />
          <h3>{t('stats_empty')}</h3>
          <p>{t('stats_empty_desc')}</p>
          <Link to="/dashboard/analysis" className="btn-primary">
            <Plus size={20} /> {t('stats_go_analyze')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <button className="back-button" onClick={() => navigate(-1)} style={{ marginBottom: '24px' }}>
        <ArrowLeft size={20} />
      </button>

      <div className="stats-header">
        <h2><BarChart3 size={28} color="var(--primary-neon)" /> {t('stats_title')}</h2>
        <p>{t('stats_subtitle')}</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-summary">
        <div className="stat-card card-total">
          <div className="stat-card-icon">
            <Target size={24} />
          </div>
          <div className="stat-card-label">{t('stats_total')}</div>
          <div className="stat-card-value">{stats.total_analyses}</div>
        </div>

        <div className="stat-card card-avg">
          <div className="stat-card-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-card-label">{t('stats_avg_score')}</div>
          <div className="stat-card-value" style={{ color: getScoreColor(stats.average_score) }}>
            {stats.average_score}
          </div>
        </div>

        <div className="stat-card card-last">
          <div className="stat-card-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-card-label">{t('stats_last_workout')}</div>
          {stats.last_workout ? (
            <>
              <div className="stat-card-value" style={{ fontSize: '22px' }}>
                {stats.last_workout.exercise_type}
              </div>
              <div className="stat-card-sub">
                {formatDate(stats.last_workout.date)} • {t('hist_score')}: {stats.last_workout.score}
              </div>
            </>
          ) : (
            <div className="stat-card-value" style={{ fontSize: '18px', color: '#8B949E' }}>
              {t('stats_no_data')}
            </div>
          )}
        </div>
      </div>

      {/* Score Trend Chart */}
      {stats.score_trend.length >= 1 && (
        <div className="stats-chart-section">
          <div className="stats-chart-header">
            <h3><TrendingUp size={20} color="var(--primary-neon)" /> {t('stats_score_trend')}</h3>
            <p>{t('stats_score_trend_desc')}</p>
          </div>
          <ResponsiveContainer width="99%" height={isMobile ? 250 : 300}>
            {isMobile ? (
              <PieChart>
                <Pie 
                  data={stats.score_trend} 
                  dataKey="score" 
                  nameKey="date" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80} 
                  innerRadius={50}
                  paddingAngle={5}
                >
                  {stats.score_trend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#161B22', 
                    border: '1px solid #30363D', 
                    borderRadius: '8px',
                    color: '#C9D1D9'
                  }}
                  labelFormatter={() => ''}
                  formatter={(value: any, name: any) => [`${value}`, formatChartDate(name)]}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '13px', color: '#fff' }} 
                  formatter={(value, entry: any) => `${formatChartDate(value)} (Skor: ${entry.payload.score})`} 
                />
              </PieChart>
            ) : (
              <AreaChart data={stats.score_trend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-neon)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary-neon)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatChartDate} 
                  stroke="#8B949E" 
                  fontSize={12}
                  tick={{ fill: '#8B949E' }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#8B949E" 
                  fontSize={12}
                  tick={{ fill: '#8B949E' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#161B22', 
                    border: '1px solid #30363D', 
                    borderRadius: '8px',
                    color: '#C9D1D9',
                    fontFamily: "'Poppins', sans-serif"
                  }}
                  labelFormatter={(label: any) => formatChartDate(label)}
                  formatter={(value: any) => [`${value}`, t('hist_score')]}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="var(--primary-neon)" 
                  strokeWidth={2.5}
                  fill="url(#scoreGradient)" 
                  dot={{ r: 5, fill: 'var(--primary-neon)', stroke: '#161B22', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: 'var(--primary-neon)', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Exercise Breakdown */}
      {stats.exercise_breakdown.length > 0 && (
        <div className="stats-chart-section">
          <div className="stats-chart-header">
            <h3><Dumbbell size={20} color="var(--primary-neon)" /> {t('stats_exercise_breakdown')}</h3>
            <p>{t('stats_exercise_breakdown_desc')}</p>
          </div>
          <div className="exercise-grid">
            {stats.exercise_breakdown.map((item) => (
              <div className="exercise-item" key={item.name}>
                <div className="exercise-item-name">{item.name}</div>
                <div className="exercise-item-stats">
                  <div className="exercise-item-stat">
                    <span>{item.count}</span> {t('stats_times')}
                  </div>
                  <div className="exercise-item-stat">
                    {t('stats_avg')}: <span style={{ color: getScoreColor(item.avg_score) }}>{item.avg_score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsProgress;
