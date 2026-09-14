import { Pool } from 'pg';
import dotenv from 'dotenv';
import dns from 'node:dns';
import net from 'node:net';

try {
  dns.setDefaultResultOrder('ipv4first');
  if (typeof net.setDefaultAutoSelectFamily === 'function') {
    net.setDefaultAutoSelectFamily(false);
  }
} catch (e) {}

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

export const query = async (text, params) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      attempts++;
      if (err.code === 'ETIMEDOUT' && attempts < 3) {
        await new Promise(res => setTimeout(res, 500));
        continue;
      }
      throw err;
    }
  }
};
