import db from '../src/db.js';

(async () => {
  try {
    console.log('Adding emp_id column to users table (if missing)...');
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS emp_id TEXT UNIQUE;");
    console.log('Done.');
  } catch (err) {
    console.error('Failed to add emp_id column:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
