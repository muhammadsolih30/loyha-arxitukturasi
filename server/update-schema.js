import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    console.log('Ustunlar qo`shilmoqda...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_code TEXT,
      ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('Baza yangilandi!');
  } catch (error) {
    console.error('Xatolik:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
