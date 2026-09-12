import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Folder, Share2, Trash2, X, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, signOut } = useAuthStore();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Yangi loyiha qo'shish uchun
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const data = await api.projects.getAll();
      setProjects(data || []);
    } catch (error) {
      toast.error("Loyihalarni yuklashda xatolik: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createProject(e) {
    if (e) e.preventDefault();
    if (!newName.trim()) {
      toast.error("Loyiha nomini kiriting");
      return;
    }
    
    try {
      const data = await api.projects.create(newName.trim());
      toast.success("Loyiha yaratildi!");
      navigate(`/project/${data.id}`);
    } catch (error) {
      toast.error("Loyiha yaratishda xatolik: " + error.message);
    }
  }

  async function deleteProject(e, id) {
    e.stopPropagation(); // Karta ustiga bosilishini to'xtatadi
    if (!window.confirm("Bu loyihani va uning ichidagi barcha rollarni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi!")) {
      return;
    }
    
    try {
      await api.projects.delete(id);
      toast.success("Loyiha o'chirildi");
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      toast.error("O'chirishda xatolik yuz berdi");
    }
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="lm-root lm-grid-bg" style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 className="lm-heading" style={{ fontSize: 26, margin: 0 }}>Mening loyihalarim</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 0 0' }}>{user.email}</p>
        </div>
        <button className="lm-btn lm-btn-outline" onClick={handleSignOut}>
          <LogOut size={16} /> Chiqish
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        
        {!showNewForm ? (
          <div 
            onClick={() => setShowNewForm(true)}
            className="lm-panel" 
            style={{ 
              width: 250, height: 180, display: 'flex', flexDirection: 'column', 
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              borderStyle: 'dashed', backgroundColor: 'transparent', transition: 'all 0.2s'
            }}
          >
            <Plus size={32} color="var(--accent)" style={{ marginBottom: 12 }} />
            <span style={{ fontWeight: 500 }}>Yangi loyiha qo'shish</span>
          </div>
        ) : (
          <div className="lm-panel" style={{ width: 250, height: 180, display: 'flex', flexDirection: 'column', borderStyle: 'dashed', borderColor: 'var(--accent)' }}>
            <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 16 }}>Loyiha nomi</h3>
            <form onSubmit={createProject} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <input 
                autoFocus
                className="lm-input" 
                placeholder="Loyiha nomi..." 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ marginBottom: 'auto' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="lm-btn lm-btn-outline" style={{ flex: 1, padding: 0 }} onClick={() => { setShowNewForm(false); setNewName(''); }}>
                  <X size={16} />
                </button>
                <button type="submit" className="lm-btn lm-btn-accent" style={{ flex: 2, padding: 0 }}>
                  <Check size={16} style={{ marginRight: 4 }}/> Yaratish
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, color: 'var(--text-muted)' }}>Yuklanmoqda...</div>
        ) : (
          projects.map(p => (
            <div 
              key={p.id} 
              className="lm-panel" 
              style={{ width: 250, height: 180, display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/project/${p.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Folder size={28} color="var(--accent-warm)" style={{ marginBottom: 16 }} />
                
                {/* O'chirish tugmasi */}
                <button 
                  className="lm-btn lm-btn-danger" 
                  style={{ padding: '6px', background: 'transparent' }}
                  title="Loyihani o'chirish"
                  onClick={(e) => deleteProject(e, p.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>{p.name}</h3>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 12 }}>
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
                {p.share_token && <Share2 size={14} color="var(--accent)" title="Ulashilgan" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
