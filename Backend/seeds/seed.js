import dotenv from 'dotenv';
import db from '../src/db.js';
import bcrypt from 'bcrypt';

dotenv.config();

async function run() {
  const client = await db.getClient();
  try {

    // Only creates the admin user needed to log in.
    // All products, suppliers, and stock are entered manually through the app.
    const username = process.env.ADMIN_USER || 'admin';
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);

    const existing = await client.query(`SELECT id FROM users WHERE username = $1`, [username]);
    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)`,
        [username, password, 'admin']
      );
      console.log(`Admin user '${username}' created.`);
    } else {
      console.log(`Admin user '${username}' already exists, skipping.`);
    }

    console.log('Seed completed.');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    if (client && typeof client.release === 'function') client.release();
  }
}

run();
