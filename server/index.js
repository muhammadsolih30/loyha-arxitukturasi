import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dns from 'node:dns';
import net from 'node:net';

try {
  dns.setDefaultResultOrder('ipv4first');
  if (typeof net.setDefaultAutoSelectFamily === 'function') {
    net.setDefaultAutoSelectFamily(false);
  }
} catch (e) {}

import { query } from './db.js';

dotenv.config();

const app = express();
// Katta hajmdagi rasmlar uchun body hajmini oshiramiz (base64 uchun)
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Ro'yxatdan o'tmagansiz" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Yaroqsiz token" });
  }
};

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'muhammadsolih0809';

// Middleware for Admin authentication
const authenticateAdmin = (req, res, next) => {
  const adminSecret = req.headers['x-admin-key'];
  if (adminSecret === ADMIN_PASSWORD) {
    return next();
  }
  return res.status(403).json({ error: "Ruxsat berilmadi: Admin paroli noto'g'ri" });
};

// ======================= AUTHENTICATION =======================

// Nodemailer transport (Agar .env da yo'q bo'lsa test account ochamiz)
const getMailer = async () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  // Test account (Ethereal)
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
};

// Real email tekshiruvi (faqat haqiqiy provayderlar va to'g'ri email formati)
const isValidRealEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  
  // Standart email formati tekshiruvi
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return false;

  const domain = trimmed.split('@')[1];
  if (!domain) return false;

  // Ruxsat berilgan haqiqiy email domenlari
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

// 1. Emailga tasdiqlash kodini yuborish
app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Emailni kiriting" });

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidRealEmail(cleanEmail)) {
    return res.status(400).json({ 
      error: "Noto'g'ri email! Iltimos, haqiqiy email manzil kiriting (masalan: @gmail.com, @mail.ru, @yandex.ru, @yahoo.com, @outlook.com, @icloud.com)." 
    });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60000); // 15 daqiqa

    // Avvalgi eski kodlarni o'chirib, yangisini saqlaymiz
    await query('DELETE FROM email_verifications WHERE email = $1', [email]);
    await query(
      'INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, $3)',
      [email, verificationCode, verificationExpires]
    );

    const transporter = await getMailer();
    const info = await transporter.sendMail({
      from: '"Loyiha Arxitektor" <noreply@loyiha.uz>',
      to: email,
      subject: "Ro'yxatdan o'tish tasdiqlash kodi",
      text: `Hurmatli foydalanuvchi!\nRo'yxatdan o'tish uchun tasdiqlash kodingiz: ${verificationCode}\nUshbu kod 15 daqiqa davomida amal qiladi.`,
    });

    console.log("Tasdiqlash xati yuborildi:", nodemailer.getTestMessageUrl(info) || info.messageId);

    res.json({ 
      success: true, 
      message: "Tasdiqlash kodi emailingizga yuborildi",
      testUrl: nodemailer.getTestMessageUrl(info) 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Ro'yxatdan o'tish (Eng oddiy va qulay sxema: Email, Username, Parol)
app.post('/api/auth/register', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: "Iltimos, barcha maydonlarni to'ldiring" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();

  if (!isValidRealEmail(cleanEmail)) {
    return res.status(400).json({ 
      error: "Noto'g'ri email! Iltimos, haqiqiy email kiriting (masalan: @gmail.com, @mail.ru, @yandex.ru, @yahoo.com)." 
    });
  }

  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: "Username kamida 3 ta belgidan iborat bo'lishi kerak" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
  }

  try {
    // 1. Email mavjudligini tekshirish
    const existingEmail = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
    }

    // 2. Username band emasligini tekshirish
    const existingUsername = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: "Bu username allaqachon band. Boshqa username tanlang" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 3. Foydalanuvchini bazaga saqlaymiz
    const userRes = await query(
      `INSERT INTO users (email, username, password, plain_password, is_verified, last_login) 
       VALUES ($1, $2, $3, $4, true, NOW()) RETURNING id, email, username`,
      [cleanEmail, cleanUsername, hashedPassword, password]
    );
    const user = userRes.rows[0];

    // 4. Kirish jurnaliga yozish
    await query(
      'INSERT INTO login_logs (user_id, email, username, password_used, ip, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, cleanEmail, cleanUsername, password, ip, userAgent]
    );

    // 5. Admin panelga to'liq xabarnoma tushirish
    await query(
      'INSERT INTO admin_notifications (type, title, email, username, password, ip) VALUES ($1, $2, $3, $4, $5, $6)',
      ['register', 'Yangi foydalanuvchi ro\'yxatdan o\'tdi', cleanEmail, cleanUsername, password, ip]
    );

    // 6. Foydalanuvchining emailiga tabrik xati yuborish
    try {
      const transporter = await getMailer();
      const info = await transporter.sendMail({
        from: '"Loyiha Arxitektor" <noreply@loyiha.uz>',
        to: cleanEmail,
        subject: "🎉 Ro‘yxatdan o‘tganingiz uchun rahmat!",
        text: `Hurmatli ${cleanUsername}!\n\n🎉 Ro‘yxatdan o‘tganingiz uchun rahmat!\nAkkauntingiz muvaffaqiyatli yaratildi.\n\nSizning login ma'lumotlaringiz:\nUsername: ${cleanUsername}\nEmail: ${cleanEmail}\n\nSaytga marhamat qilib loyihalaringizni yaratishingiz mumkin!`,
      });
      console.log("Xush kelibsiz xati yuborildi:", nodemailer.getTestMessageUrl(info) || info.messageId);
    } catch (mailErr) {
      console.error("Email yuborishda xatolik (login davom etadi):", mailErr.message);
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      success: true, 
      user, 
      token,
      message: "Akkauntingiz muvaffaqiyatli yaratildi!"
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message || "Server xatosi" });
  }
});

// 3. Tizimga kirish (Username yoki Email + Parol orqali har doim har joydan)
app.post('/api/auth/login', async (req, res) => {
  const { loginIdentifier, password } = req.body;
  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: "Username/Email va parolni kiriting" });
  }

  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Username yoki email orqali qidiramiz
    const result = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)',
      [loginIdentifier.trim()]
    );

    if (result.rows.length === 0) {
      // Login xatolik jurnaliga yozamiz
      await query(
        'INSERT INTO login_logs (email, username, password_used, ip, user_agent) VALUES ($1, $2, $3, $4, $5)',
        [loginIdentifier, loginIdentifier, password, ip, userAgent]
      );
      return res.status(400).json({ error: "Foydalanuvchi topilmadi" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    // Har bir kirish urinishini jurnalga yozamiz
    await query(
      'INSERT INTO login_logs (user_id, email, username, password_used, ip, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, user.email, user.username || '—', password, ip, userAgent]
    );

    if (!valid) return res.status(400).json({ error: "Parol noto'g'ri" });

    // Oxirgi parol va kirgan vaqtini bazada yangilab qo'yamiz
    await query('UPDATE users SET plain_password = $1, last_login = NOW() WHERE id = $2', [password, user.id]);

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      user: { id: user.id, email: user.email, username: user.username }, 
      token 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Foydalanuvchi topilmadi" });

    // Generate 6 digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60000); // 15 mins

    await query('UPDATE users SET reset_code = $1, reset_expires_at = $2 WHERE email = $3', [resetCode, expiresAt, email]);

    const transporter = await getMailer();
    const info = await transporter.sendMail({
      from: '"Loyiha Arxitektor" <noreply@loyiha.uz>',
      to: email,
      subject: "Parolni tiklash kodi",
      text: `Sizning parolni tiklash kodingiz: ${resetCode}\nBu kod 15 daqiqa davomida amal qiladi.`,
    });

    console.log("Xat yuborildi:", nodemailer.getTestMessageUrl(info) || info.messageId);
    res.json({ success: true, testUrl: nodemailer.getTestMessageUrl(info) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const result = await query('SELECT id, reset_code, reset_expires_at FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Foydalanuvchi topilmadi" });
    
    const user = result.rows[0];
    if (user.reset_code !== code) return res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri" });
    if (new Date() > new Date(user.reset_expires_at)) return res.status(400).json({ error: "Kodning muddati tugagan" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password = $1, plain_password = $2, reset_code = NULL, reset_expires_at = NULL WHERE id = $3', [hashedPassword, newPassword, user.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ======================= ADMIN API =======================

// Admin parolini tekshirish (kirish uchun)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, adminKey: ADMIN_PASSWORD });
  }
  return res.status(401).json({ error: "Noto'g'ri admin paroli" });
});

// Statistika
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const usersCount = await query('SELECT count(*) FROM users');
    const logsCount = await query('SELECT count(*) FROM login_logs');
    const projectsCount = await query('SELECT count(*) FROM projects');
    const todayLogsCount = await query('SELECT count(*) FROM login_logs WHERE created_at >= CURRENT_DATE');

    res.json({
      totalUsers: parseInt(usersCount.rows[0]?.count || 0, 10),
      totalLogins: parseInt(logsCount.rows[0]?.count || 0, 10),
      todayLogins: parseInt(todayLogsCount.rows[0]?.count || 0, 10),
      totalProjects: parseInt(projectsCount.rows[0]?.count || 0, 10)
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Barcha foydalanuvchilar (emaillari, usernamelari, parollari, oxirgi kirgan vaqtlari)
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await query(`
      SELECT 
        u.id, 
        u.email, 
        u.username,
        COALESCE(u.plain_password, 'Hash: ' || SUBSTRING(u.password, 1, 15) || '...') as plain_password, 
        u.created_at, 
        u.last_login,
        (SELECT count(*) FROM login_logs WHERE email = u.email OR username = u.username) as login_count,
        (SELECT count(*) FROM projects WHERE owner_id = u.id) as project_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json(users.rows);
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Kirishlar jurnali (qanaqa email, username va parol bilan urinish bo'lgani, vaqti)
app.get('/api/admin/logs', authenticateAdmin, async (req, res) => {
  try {
    const logs = await query(`
      SELECT id, email, username, password_used, ip, user_agent, created_at
      FROM login_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(logs.rows);
  } catch (error) {
    console.error("Admin logs error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Yangi ro'yxatdan o'tganlar xabarnomasi (Notifications)
app.get('/api/admin/notifications', authenticateAdmin, async (req, res) => {
  try {
    const notifs = await query(`
      SELECT id, type, title, email, username, password, ip, is_read, created_at
      FROM admin_notifications
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(notifs.rows);
  } catch (error) {
    console.error("Admin notifs error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Xabarnomalarni o'qilgan deb belgilash
app.post('/api/admin/notifications/read', authenticateAdmin, async (req, res) => {
  try {
    await query('UPDATE admin_notifications SET is_read = true WHERE is_read = false');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Xabarnomani o'chirish
app.delete('/api/admin/notifications/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM admin_notifications WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Bitta foydalanuvchini o'chirish (Admin huquqi)
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Foydalanuvchini o'chirishda xatolik" });
  }
});

// ======================= PROJECTS =======================

app.get('/api/projects', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC', 
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

app.post('/api/projects', authenticate, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await query(
      'INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Loyalty/Share check - if we have the token in query or just standard fetch
    // Real app needs better check, but this is simple:
    const result = await query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

app.put('/api/projects/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, share_token } = req.body;
  try {
    if (name) {
      await query('UPDATE projects SET name = $1 WHERE id = $2 AND owner_id = $3', [name, id, req.user.id]);
    }
    if (share_token) {
      await query('UPDATE projects SET share_token = $1 WHERE id = $2 AND owner_id = $3', [share_token, id, req.user.id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM projects WHERE id = $1 AND owner_id = $2', [id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

app.get('/api/projects/share/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await query('SELECT * FROM projects WHERE share_token = $1', [token]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

// ======================= ROLES =======================

app.get('/api/projects/:projectId/roles', async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await query('SELECT * FROM roles WHERE project_id = $1', [projectId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

app.post('/api/roles', authenticate, async (req, res) => {
  const { id, project_id, parent_id, name, description, permissions, image_url } = req.body;
  try {
    await query(
      `INSERT INTO roles (id, project_id, parent_id, name, description, permissions, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, project_id, parent_id, name, description, JSON.stringify(permissions || []), image_url]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

app.put('/api/roles/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // { name, permissions, image_url, ... }
  
  try {
    const fields = [];
    const values = [];
    let count = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${count}`);
      values.push(key === 'permissions' ? JSON.stringify(value) : value);
      count++;
    }
    
    if (fields.length === 0) return res.json({ success: true });
    
    values.push(id);
    await query(`UPDATE roles SET ${fields.join(', ')} WHERE id = $${count}`, values);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Xatolik" });
  }
});

app.delete('/api/roles', authenticate, async (req, res) => {
  const { ids } = req.body; // Array of IDs to delete
  if (!ids || ids.length === 0) return res.json({ success: true });
  
  try {
    // Array in SQL
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    await query(`DELETE FROM roles WHERE id IN (${placeholders})`, ids);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Xatolik" });
  }
});

// START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
