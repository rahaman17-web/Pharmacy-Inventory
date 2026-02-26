import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const MIGRATIONS_DIR = path.resolve('./migrations');

async function runMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error('Migrations directory not found:', MIGRATIONS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.toLowerCase().endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found in', MIGRATIONS_DIR);
    process.exit(0);
  }

  const client = await db.getClient();
  try {
    for (const file of files) {
      const full = path.join(MIGRATIONS_DIR, file);
      console.log('Applying migration:', file);
      const sql = fs.readFileSync(full, 'utf8');

      // split into statements and run inside a transaction per file
      const stmts = sql
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(Boolean);

      await client.query('BEGIN');
      try {
        for (const stmt of stmts) {
          await client.query(stmt);
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Failed migration ${file}: ${err.message}`);
      }
    }

    if (client.release) client.release();
    console.log('All migrations applied successfully.');
    process.exit(0);
  } catch (err) {
    if (client.release) client.release();
    console.error('Migration error:', err);
    process.exit(1);
  }
}

runMigrations();
