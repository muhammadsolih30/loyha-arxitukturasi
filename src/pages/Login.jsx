import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api';
import toast from 'react-hot-toast';

export default function Login() {
  // view: 'login' | 'register' | 'forgot' | 'reset'
  const [view, setView] = useState('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Iltimos, barcha maydonlarni to'ldiring");
      return;
    }
    
    setLoading(true);
    try {
      if (view === 'login') {
        await signIn(email, password);
        toast.success("Tizimga kirdingiz!");
      } else {
        await signUp(email, password);
        toast.success("Ro'yxatdan o'tdingiz!");
      }
      navigate('/');
    } catch (error) {
      toast.error(error.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Emailni kiriting");
    
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email);
      toast.success("Kodni pochtangizga yubordik!");
      if (res.testUrl) {
        console.log("TEST EMAIL URL:", res.testUrl);
        // Faqat test (development) vaqti ko'rsatish uchun:
        toast((t) => (
          <span>
            <b>Test Link:</b> <a href={res.testUrl} target="_blank" rel="noreferrer">Xatni ko'rish</a>
          </span>
        ), { duration: 10000 });
      }
      setView('reset');
    } catch (error) {
      toast.error(error.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!code || !password) return toast.error("Barcha maydonlarni to'ldiring");
    
    setLoading(true);
    try {
      await api.auth.resetPassword(email, code, password);
      toast.success("Parol muvaffaqiyatli yangilandi!");
      setView('login');
      setPassword('');
      setCode('');
    } catch (error) {
      toast.error(error.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lm-root lm-grid-bg lm-auth-container">
      <div className="lm-auth-box">
        <h1 className="lm-heading" style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>
          Loyiha Arxitektor
        </h1>
        
        {(view === 'login' || view === 'register') && (
          <div style={{ display: 'flex', background: 'var(--panel2)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            <button 
              type="button"
              onClick={() => setView('login')}
              style={{ 
                flex: 1, padding: '8px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500,
                background: view === 'login' ? 'var(--accent)' : 'transparent',
                color: view === 'login' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              Kirish
            </button>
            <button 
              type="button"
              onClick={() => setView('register')}
              style={{ 
                flex: 1, padding: '8px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500,
                background: view === 'register' ? 'var(--accent)' : 'transparent',
                color: view === 'register' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              Ro'yxatdan o'tish
            </button>
          </div>
        )}

        {view === 'forgot' && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Parolni tiklash</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Pochtangizni kiriting, biz tasdiqlash kodini yuboramiz.
            </p>
          </div>
        )}

        {view === 'reset' && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Kodni kiritish</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              <b>{email}</b> manziliga 6 xonali kod yubordik.
            </p>
          </div>
        )}

        <form 
          onSubmit={view === 'forgot' ? handleForgot : (view === 'reset' ? handleReset : handleAuth)} 
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {view !== 'reset' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Email</label>
              <input 
                type="email" 
                className="lm-input" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@example.com"
                disabled={view === 'reset'}
              />
            </div>
          )}

          {view === 'reset' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Tasdiqlash kodi</label>
              <input 
                type="text" 
                className="lm-input" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                placeholder="123456"
                maxLength={6}
              />
            </div>
          )}

          {view !== 'forgot' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                {view === 'reset' ? 'Yangi parol' : 'Parol'}
              </label>
              <input 
                type="password" 
                className="lm-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
          )}
          
          <button type="submit" className="lm-btn lm-btn-accent" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Kutilmoqda..." : (
              view === 'login' ? "Tizimga kirish" : 
              view === 'register' ? "Yangi hisob ochish" : 
              view === 'forgot' ? "Kodni yuborish" : "Parolni yangilash"
            )}
          </button>
        </form>

        {view === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span 
              style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              onClick={() => setView('forgot')}
            >
              Parolni unutdingizmi?
            </span>
          </div>
        )}

        {(view === 'forgot' || view === 'reset') && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span 
              style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
              onClick={() => setView('login')}
            >
              Ortga qaytish
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
