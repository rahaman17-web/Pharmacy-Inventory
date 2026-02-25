import dotenv from 'dotenv';
import db from '../src/db.js';

dotenv.config();

async function run() {
  try {
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL`);
    console.log('✅ supplier_id column added to products table (or already exists).');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
