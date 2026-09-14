import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../api';
import toast from 'react-hot-toast';

export default function Login() {
  // view: 'login' | 'register' | 'forgot' | 'reset'
  const [view, setView] = useState('login');
  
  // Login uchun: Username yoki Email
  const [loginIdentifier, setLoginIdentifier] = useState('');
  
  // Register uchun:
  const [registerEmail, setRegisterEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  // Haqiqiy email ekanligini tekshirish
  const validateRealEmail = (email) => {
    if (!email) return false;
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) return false;

    const domain = trimmed.split('@')[1];
    const allowedDomains = [
      'gmail.com',
      'mail.ru',
      'bk.ru',
      'inbox.ru',
      'list.ru',
      'yandex.ru',
      'yandex.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'icloud.com',
      'proton.me',
      'protonmail.com'
    ];

    return allowedDomains.includes(domain);
  };

  // Ro'yxatdan o'tish (Eng oddiy va qulay sxema)
  const handleRegister = async (e) => {
    e.preventDefault();
    const cleanEmail = registerEmail.trim();
    const cleanUser = username.trim();

    if (!cleanEmail || !cleanUser || !password) {
      return toast.error("Iltimos, barcha maydonlarni to'ldiring");
    }

    if (!validateRealEmail(cleanEmail)) {
      return toast.error(
        "Noto'g'ri email! Faqat @gmail.com, @mail.ru, @yandex.ru, @yahoo.com kabi real email manzillarni kiriting.",
        { duration: 5000 }
      );
    }

    if (cleanUser.length < 3) {
      return toast.error("Username kamida 3 ta belgidan iborat bo'lsin");
    }

    if (password.length < 6) {
      return toast.error("Parol kamida 6 ta belgidan iborat bo'lsin");
    }

    setLoading(true);
    try {
      await signUp({
        email: cleanEmail,
        username: cleanUser,
        password: password
      });
      toast.success("🎉 Ro‘yxatdan o‘tganingiz uchun rahmat! Akkauntingiz muvaffaqiyatli yaratildi.", { duration: 6000 });
      navigate('/');
    } catch (err) {
      toast.error(err.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // Kirish (Username yoki Email orqali)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !password) {
      return toast.error("Username/Email va parolni kiriting");
    }

    setLoading(true);
    try {
      await signIn(loginIdentifier.trim(), password);
      toast.success("Tizimga kirdingiz!");
      navigate('/');
    } catch (err) {
      toast.error(err.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // Parolni tiklash (Forgot)
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!registerEmail) return toast.error("Emailni kiriting");
    
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(registerEmail);
      toast.success("Kodni pochtangizga yubordik!");
      if (res.testUrl) {
        toast((t) => (
          <span>
            <b>Test Link:</b> <a href={res.testUrl} target="_blank" rel="noreferrer">Xatni ko'rish</a>
          </span>
        ), { duration: 10000 });
      }
      setView('reset');
      setCode('');
    } catch (error) {
      toast.error(error.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // Yangi parol o'rnatish (Reset)
  const handleReset = async (e) => {
    e.preventDefault();
    if (!code || !password) return toast.error("Barcha maydonlarni to'ldiring");
    
    setLoading(true);
    try {
      await api.auth.resetPassword(registerEmail, code, password);
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
    <div className="lm-root lm-grid-bg lm-auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="lm-auth-box" style={{ maxWidth: 440, width: '100%' }}>
        <h1 className="lm-heading" style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>
          Loyiha Arxitektor
        </h1>
        
        {(view === 'login' || view === 'register') && (
          <div style={{ display: 'flex', background: 'var(--panel2)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            <button 
              type="button"
              onClick={() => {
                setView('login');
                setPassword('');
              }}
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
              onClick={() => {
                setView('register');
                setPassword('');
              }}
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

        {/* 1. LOGIN FORMASI */}
        {view === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Username yoki Email
              </label>
              <input 
                type="text" 
                className="lm-input" 
                value={loginIdentifier} 
                onChange={(e) => setLoginIdentifier(e.target.value)} 
                placeholder="username yoki email@example.com"
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Parol
              </label>
              <input 
                type="password" 
                className="lm-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="lm-btn lm-btn-accent" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "Kirilmoqda..." : "Tizimga kirish"}
            </button>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span 
                style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                onClick={() => setView('forgot')}
              >
                Parolni unutdingizmi?
              </span>
            </div>
          </form>
        )}

        {/* 2. RO'YXATDAN O'TISH FORMASI (Eng oddiy sxema: Email, Username, Parol) */}
        {view === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Email Manzilingiz
              </label>
              <input 
                type="email" 
                className="lm-input" 
                value={registerEmail} 
                onChange={(e) => setRegisterEmail(e.target.value)} 
                placeholder="user@gmail.com"
                autoFocus
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                Faqat @gmail.com yoki boshqa real email manzili
              </span>
            </div>

            {/* Username */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Username (saytga kirish uchun)
              </label>
              <input 
                type="text" 
                className="lm-input" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="masalan: user_dev"
              />
            </div>

            {/* Parol */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Parol
              </label>
              <input 
                type="password" 
                className="lm-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              className="lm-btn lm-btn-accent" 
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? "Ro'yxatdan o'tkazilmoqda..." : "Ro'yxatdan o'tish"}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ marginBottom: 6 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Parolni tiklash</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Email manzilingizni kiriting, biz kod yuboramiz.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Email</label>
              <input 
                type="email" 
                className="lm-input" 
                value={registerEmail} 
                onChange={(e) => setRegisterEmail(e.target.value)} 
                placeholder="admin@example.com"
              />
            </div>
            <button type="submit" className="lm-btn lm-btn-accent" disabled={loading}>
              {loading ? "Kutilmoqda..." : "Kodni yuborish"}
            </button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span 
                style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
                onClick={() => setView('login')}
              >
                Ortga qaytish
              </span>
            </div>
          </form>
        )}

        {/* 4. RESET PASSWORD */}
        {view === 'reset' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ marginBottom: 6 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Kodni kiritish</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                <b>{registerEmail}</b> manziliga yuborilgan 6 xonali kod va yangi parolni kiriting.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Kod</label>
              <input 
                type="text" 
                className="lm-input lm-mono" 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                placeholder="123456"
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Yangi parol</label>
              <input 
                type="password" 
                className="lm-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="lm-btn lm-btn-accent" disabled={loading}>
              {loading ? "Kutilmoqda..." : "Parolni yangilash"}
            </button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <span 
                style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
                onClick={() => setView('login')}
              >
                Ortga qaytish
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
