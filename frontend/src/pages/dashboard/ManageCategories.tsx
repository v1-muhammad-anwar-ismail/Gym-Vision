import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Plus, Trash2, Tag, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import './ManageCategories.css';

interface Category {
  id: number;
  name: string;
  type: string;
  description: string | null;
  python_script: string | null;
  created_at: string;
}

const ManageCategories: React.FC = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'rep_counter',
    description: '',
    python_script: '',
    python_code: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/exercise-categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/exercise-categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(t('admin_cat_save') + ' Success');
        setFormData({ name: '', type: 'rep_counter', description: '', python_script: '', python_code: '' });
        setShowForm(false);
        fetchCategories(); // Refresh list
      } else {
        toast.error(data.message || 'Validation error');
      }
    } catch (err) {
      console.error('Failed to save category:', err);
      toast.error('Network error while saving');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: t('admin_cat_delete_confirm') as string,
      text: `Category: ${name}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: t('admin_users_delete_btn') as string,
      cancelButtonText: t('admin_cat_cancel') as string,
      background: '#1a1a2e',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/exercise-categories/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (res.ok) {
          toast.success('Category deleted successfully');
          setCategories(categories.filter(c => c.id !== id));
        } else {
          toast.error('Failed to delete category');
        }
      } catch (err) {
        console.error('Failed to delete:', err);
        toast.error('Network error');
      }
    }
  };

  return (
    <div className="manage-categories-container fade-in">
      <div className="admin-header">
        <Link to="/dashboard" className="back-button" title="Back">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-gradient" style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Tag size={28} />
          {t('admin_cat_title')}
        </h2>
      </div>

      {!showForm && (
        <div className="admin-actions" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn-primary" 
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={20} /> {t('admin_cat_add')}
          </button>
        </div>
      )}

      {showForm && (
        <div className="card form-card mb-4">
          <h3 style={{ marginBottom: '16px' }}>{t('admin_cat_add')}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('admin_cat_name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. Squat"
                required
              />
            </div>
            
            <div className="form-group">
              <label>{t('admin_cat_desc')}</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-control"
                rows={3}
                placeholder="Optional description"
              ></textarea>
            </div>
            
            <div className="form-group">
              <label>Python Script Filename</label>
              <input
                type="text"
                name="python_script"
                value={formData.python_script}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. bicep_curl.py"
              />
            </div>

            <div className="form-group">
              <label>Python Code Content</label>
              <textarea
                name="python_code"
                value={formData.python_code}
                onChange={handleChange}
                className="form-control"
                rows={10}
                placeholder="# Paste your python code here..."
                style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.3)' }}
              ></textarea>
            </div>
            
            <div className="form-actions-stack">
              <button 
                type="button" 
                className="btn-secondary full-width" 
                onClick={() => setShowForm(false)}
              >
                {t('admin_cat_cancel')}
              </button>
              <button type="submit" className="btn-primary full-width" disabled={submitting}>
                {submitting ? 'Saving...' : t('admin_cat_save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card table-card">
        {loading ? (
          <div className="text-center" style={{ padding: '40px' }}>Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            {t('admin_cat_no_data')}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('admin_cat_name')}</th>
                  <th>{t('admin_cat_desc')}</th>
                  <th>Python Script</th>
                  <th>{t('admin_cat_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td data-label="ID">{cat.id}</td>
                    <td data-label={t('admin_cat_name') as string} style={{ fontWeight: 'bold' }}>{cat.name}</td>
                    <td data-label={t('admin_cat_desc') as string} style={{ color: 'var(--text-muted)' }}>{cat.description || '-'}</td>
                    <td data-label="Python Script" style={{ color: 'var(--primary-neon)' }}>{cat.python_script || '-'}</td>
                    <td data-label={t('admin_cat_actions') as string}>
                      <button 
                        className="btn-icon danger" 
                        title="Delete"
                        onClick={() => handleDelete(cat.id, cat.name)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCategories;
