import db from '../src/db.js';

(async () => {
  try {
    console.log('Applying CNIC columns to users table...');
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cnic TEXT UNIQUE;");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cnic_name TEXT;");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cnic_last3 TEXT UNIQUE;");
    console.log('Done.');
  } catch (err) {
    console.error('Failed to apply CNIC columns:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
