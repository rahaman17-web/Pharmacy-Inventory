import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const MIGRATIONS_FILE_PG = path.resolve('./src/models/migrations.sql');

async function runMigrations() {
  const file = MIGRATIONS_FILE_PG;
  if (!fs.existsSync(file)) {
    console.error('Migrations file not found:', file);
    process.exit(1);
  }

  const sql = fs.readFileSync(file, { encoding: 'utf8' });

  try {
    console.log('Running migrations from', file);
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(Boolean);

    const client = await db.getClient();
    for (const stmt of statements) {
      await client.query(stmt);
    }

    if (client.release) client.release();
    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

runMigrations();
