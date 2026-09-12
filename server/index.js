import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
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

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Maydonlarni to'ldiring" });

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: "Bu email band" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Foydalanuvchi topilmadi" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Parol noto'g'ri" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (error) {
    console.error(error);
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
    await query('UPDATE users SET password = $1, reset_code = NULL, reset_expires_at = NULL WHERE id = $2', [hashedPassword, user.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
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
