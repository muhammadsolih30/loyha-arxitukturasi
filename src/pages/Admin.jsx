import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  LogIn, 
  Clock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Search, 
  ArrowLeft,
  Lock,
  Layers,
  Check,
  Bell,
  UserPlus,
  CheckCheck,
  AtSign
} from 'lucide-react';
import { api } from '../api';
import toast from 'react-hot-toast';

export default function Admin() {
  const [adminKey, setAdminKey] = useState(sessionStorage.getItem('adminKey') || '');
  const [inputPassword, setInputPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'users' | 'logs'
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (adminKey) {
      loadAdminData(adminKey);

      // Har 10 soniyada yangi ro'yxatdan o'tganlar bor-yo'qligini tekshirib turadi
      const interval = setInterval(() => {
        pollNotifications(adminKey);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [adminKey]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!inputPassword.trim()) {
      toast.error("Admin parolini kiriting");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await api.admin.login(inputPassword.trim());
      if (res.adminKey) {
        sessionStorage.setItem('adminKey', res.adminKey);
        setAdminKey(res.adminKey);
        toast.success("Admin panelga xush kelibsiz!");
      }
    } catch (err) {
      toast.error(err.message || "Parol noto'g'ri!");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('adminKey');
    setAdminKey('');
    toast("Admin panelidan chiqildi");
  };

  const loadAdminData = async (key) => {
    setLoadingData(true);
    try {
      const [statsData, usersData, logsData, notifsData] = await Promise.all([
        api.admin.getStats(key),
        api.admin.getUsers(key),
        api.admin.getLogs(key),
        api.admin.getNotifications(key)
      ]);
      setStats(statsData);
      setUsers(usersData || []);
      setLogs(logsData || []);
      setNotifications(notifsData || []);
    } catch (err) {
      toast.error("Ma'lumotlarni yuklashda xatolik: " + err.message);
      if (err.message && err.message.includes('Ruxsat')) {
        handleAdminLogout();
      }
    } finally {
      setLoadingData(false);
    }
  };

  const pollNotifications = async (key) => {
    try {
      const notifsData = await api.admin.getNotifications(key);
      setNotifications(notifsData || []);
    } catch (e) {
      // Polling silence
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.admin.markNotificationsRead(adminKey);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("Barcha xabarnomalar o'qildi deb belgilandi");
    } catch (e) {
      toast.error("Xatolik: " + e.message);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.admin.deleteNotification(adminKey, id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Xabarnoma o'chirildi");
    } catch (e) {
      toast.error("Xatolik: " + e.message);
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Nusxalandi!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`Haqiqatan ham "${email}" foydalanuvchisini o'chirmoqchimisiz?`)) {
      return;
    }

    try {
      await api.admin.deleteUser(adminKey, id);
      toast.success("Foydalanuvchi o'chirildi");
      setUsers(prev => prev.filter(u => u.id !== id));
      if (stats) {
        setStats(prev => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }));
      }
    } catch (err) {
      toast.error("O'chirishda xatolik: " + err.message);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Filtered lists (Email, Username, Parol bo'yicha qidiruv)
  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(q) ||
    (u.username && u.username.toLowerCase().includes(q)) ||
    (u.plain_password && u.plain_password.toLowerCase().includes(q))
  );

  const filteredLogs = logs.filter(l => 
    l.email.toLowerCase().includes(q) ||
    (l.username && l.username.toLowerCase().includes(q)) ||
    (l.password_used && l.password_used.toLowerCase().includes(q))
  );

  const filteredNotifs = notifications.filter(n => 
    n.email.toLowerCase().includes(q) ||
    (n.username && n.username.toLowerCase().includes(q)) ||
    (n.password && n.password.toLowerCase().includes(q))
  );

  // Agar admin paroli kiritilmagan bo'lsa - Parol so'rash ekrani
  if (!adminKey) {
    return (
      <div className="lm-root lm-grid-bg lm-auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="lm-auth-box" style={{ maxWidth: 420, width: '100%', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '36px 28px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(111, 208, 236, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent)' }}>
              <Lock size={28} color="var(--accent)" />
            </div>
          </div>
          <h2 className="lm-heading" style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: 22, color: 'var(--text)' }}>
            Admin Panelga Kirish
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, margin: '0 0 24px 0' }}>
            Ushbu bo'lim faqat boshqaruvchi (admin) uchun maxfiy hisoblanadi.
          </p>

          <form onSubmit={handleAdminLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Maxfiy Admin Paroli
              </label>
              <input 
                type="password"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="Admin parolini kiriting..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'var(--panel2)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                cursor: isVerifying ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {isVerifying ? <span>Tekshirilmoqda...</span> : <>
                <ShieldCheck size={18} />
                <span>Panelni Ochish</span>
              </>}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} /> Asosiy bosh sahifaga qaytish
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard ekrani
  return (
    <div className="lm-root" style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Bosh sahifaga">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="lm-heading" style={{ margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={26} color="var(--accent)" />
              Admin Boshqaruv Paneli
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 30px', color: 'var(--text-muted)', fontSize: 14 }}>
            Foydalanuvchilarning Email, Username va Parollari xavfsizlik monitoringi
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={() => loadAdminData(adminKey)}
            disabled={loadingData}
            style={{
              padding: '9px 14px',
              background: 'var(--panel2)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500
            }}
          >
            <RefreshCw size={15} style={{ animation: loadingData ? 'spin 1s linear infinite' : 'none' }} />
            Yangilash
          </button>

          <button 
            onClick={handleAdminLogout}
            style={{
              padding: '9px 14px',
              background: 'rgba(226, 115, 90, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: 8,
              color: 'var(--danger)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 500
            }}
          >
            Chiqish
          </button>
        </div>
      </div>

      {/* Yangi ro'yxatdan o'tganlar haqida yuqori ogohlantiruvchi Banner */}
      {unreadCount > 0 && (
        <div style={{ 
          background: 'linear-gradient(90deg, rgba(231, 168, 85, 0.18), rgba(111, 208, 236, 0.12))', 
          border: '1px solid var(--accent-warm)', 
          borderRadius: 12, 
          padding: '14px 20px', 
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
              <Bell size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 15 }}>
                {unreadCount} ta yangi foydalanuvchi ro'yxatdan o'tdi!
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Ularning Email, Username va Parollari to'g'ridan-to'g'ri kelib tushdi.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveTab('notifications')}
              style={{
                background: 'var(--accent-warm)',
                color: '#000',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Ko'rish
            </button>
            <button
              onClick={handleMarkAllRead}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--text)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <CheckCheck size={14} /> O'qildi deb belgilash
            </button>
          </div>
        </div>
      )}

      {/* Statistika Kartochkalari */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Jami Foydalanuvchilar</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(111, 208, 236, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="var(--accent)" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
            {stats ? stats.totalUsers : '...'}
          </div>
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>Barcha akkauntlar</span>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Yangi Xabarlar (Alerts)</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(231, 168, 85, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} color="var(--accent-warm)" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
            {unreadCount}
          </div>
          <span style={{ fontSize: 12, color: 'var(--accent-warm)' }}>O'qilmagan bildirishnomalar</span>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Jami Kirishlar (Logins)</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(74, 222, 128, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogIn size={18} color="#4ade80" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
            {stats ? stats.totalLogins : '...'}
          </div>
          <span style={{ fontSize: 12, color: '#4ade80' }}>Barcha login harakatlari</span>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Yaratilgan Loyihalar</span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(192, 132, 252, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} color="#c084fc" />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
            {stats ? stats.totalProjects : '...'}
          </div>
          <span style={{ fontSize: 12, color: '#c084fc' }}>Foydalanuvchilar arxitekturalari</span>
        </div>
      </div>

      {/* Asosiy Jadval Qismi */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* Tab tugmalari */}
          <div style={{ display: 'flex', gap: 8, background: 'var(--panel2)', padding: 4, borderRadius: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('notifications')}
              style={{
                padding: '7px 16px',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'notifications' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'notifications' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Bell size={15} />
              Xabarnomalar (Yangi foydalanuvchilar)
              {unreadCount > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '7px 16px',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'users' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'users' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Users size={15} />
              Barcha Foydalanuvchilar ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                padding: '7px 16px',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'logs' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'logs' ? '#000' : 'var(--text-muted)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Clock size={15} />
              Jonli Kirishlar Jurnali ({logs.length})
            </button>
          </div>

          {/* Qidiruv */}
          <div style={{ position: 'relative', minWidth: 260 }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Email, Username yoki Parol izlash..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'var(--panel2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* TAB 1: XABARNOMALAR (Yangi ro'yxatdan o'tganlar: Email, Username, Parol) */}
        {activeTab === 'notifications' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--line)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Holat</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Email Manzili</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Username</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Qo'ygan Paroli</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>IP Manzil</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Vaqti</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Hozircha yangi ro'yxatdan o'tganlar xabarnomasi yo'q
                    </td>
                  </tr>
                ) : (
                  filteredNotifs.map((n) => {
                    const isShown = showPasswords[n.id];
                    return (
                      <tr 
                        key={n.id} 
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: n.is_read ? 'transparent' : 'rgba(231, 168, 85, 0.08)'
                        }}
                      >
                        <td style={{ padding: '14px 18px' }}>
                          {!n.is_read ? (
                            <span style={{ background: 'var(--accent-warm)', color: '#000', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                              YANGI
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>O'qilgan</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text)', fontWeight: 600 }}>
                          <span style={{ userSelect: 'all' }}>{n.email}</span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ background: 'rgba(111, 208, 236, 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                            @{n.username || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--panel2)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
                            <KeyRound size={13} color="var(--accent-warm)" />
                            <span className="lm-mono" style={{ fontSize: 13, letterSpacing: isShown ? 'normal' : 2, color: 'var(--accent-warm)' }}>
                              {isShown ? n.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(n.id)}
                              title={isShown ? "Yashirish" : "Ko'rish"}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-muted)' }}
                            >
                              {isShown ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(n.password, n.id)}
                              title="Paroldan nusxa olish"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-muted)' }}
                            >
                              {copiedId === n.id ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {n.ip || 'Localhost'}
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(n.created_at).toLocaleString('uz-UZ')}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteNotification(n.id)}
                            title="Xabarni o'chirish"
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(226, 115, 90, 0.3)',
                              borderRadius: 6,
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: 'var(--danger)',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Barcha Foydalanuvchilar (Email, Username, Parol) */}
        {activeTab === 'users' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--line)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Email Manzili</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Username</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Qo'ygan Paroli</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Kirishlar soni</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Loyihalari</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Oxirgi kirgan vaqti</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Ro'yxatdan o'tgan</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Foydalanuvchilar topilmadi
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, index) => {
                    const isShown = showPasswords[u.id];
                    const displayPassword = u.plain_password || '—';

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{index + 1}</td>
                        <td style={{ padding: '14px 18px', fontWeight: 500, color: 'var(--text)' }}>
                          <span style={{ userSelect: 'all' }}>{u.email}</span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ background: 'rgba(111, 208, 236, 0.1)', color: 'var(--accent)', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                            @{u.username || 'mavjud emas'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--panel2)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)' }}>
                            <KeyRound size={13} color="var(--accent)" />
                            <span className="lm-mono" style={{ fontSize: 13, letterSpacing: isShown ? 'normal' : 2 }}>
                              {isShown ? displayPassword : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(u.id)}
                              title={isShown ? "Yashirish" : "Ko'rish"}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-muted)' }}
                            >
                              {isShown ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(displayPassword, u.id)}
                              title="Paroldan nusxa olish"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-muted)' }}
                            >
                              {copiedId === u.id ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ background: 'rgba(111, 208, 236, 0.1)', color: 'var(--accent)', padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                            {u.login_count || 0} marta
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                          {u.project_count || 0} ta
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {u.last_login ? new Date(u.last_login).toLocaleString('uz-UZ') : '—'}
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(u.created_at).toLocaleDateString('uz-UZ')}
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title="Foydalanuvchini o'chirish"
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(226, 115, 90, 0.3)',
                              borderRadius: 6,
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: 'var(--danger)',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Kirishlar jurnali (Logs: Email, Username, Parol) */}
        {activeTab === 'logs' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--line)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Username</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Kiritilgan Parol</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>IP Manzili</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600 }}>Vaqti</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Hozircha kirishlar tarixi mavjud emas
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>{index + 1}</td>
                      <td style={{ padding: '12px 18px', fontWeight: 500, color: 'var(--text)' }}>{log.email}</td>
                      <td style={{ padding: '12px 18px', color: 'var(--accent)' }}>@{log.username || '—'}</td>
                      <td style={{ padding: '12px 18px' }}>
                        <span className="lm-mono" style={{ background: 'var(--panel2)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--line)', color: 'var(--accent-warm)' }}>
                          {log.password_used || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {log.ip || 'Localhost'}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(log.created_at).toLocaleString('uz-UZ')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
