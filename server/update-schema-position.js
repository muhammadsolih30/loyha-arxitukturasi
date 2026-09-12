import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Koordinata ustunlari qo`shilmoqda...');
    await pool.query(`
      ALTER TABLE roles 
      ADD COLUMN IF NOT EXISTS position_x REAL,
      ADD COLUMN IF NOT EXISTS position_y REAL;
    `);
    console.log('Baza yangilandi!');
  } catch (error) {
    console.error('Xatolik:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
