import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'node:dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    console.log("Bazaga o'zgarishlar kiritilmoqda...");
    
    // users jadvaliga plain_password va last_login ustunlarini qo'shamiz
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS plain_password TEXT,
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);

    // login_logs jadvalini yaratamiz
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        password_used TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    console.log("Muvaffaqiyatli yakunlandi! Users va login_logs jadvallari tayyor.");
  } catch (error) {
    console.error("Xatolik:", error);
  } finally {
    await pool.end();
  }
}

runMigration();
