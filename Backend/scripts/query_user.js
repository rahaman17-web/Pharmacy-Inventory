import db from '../src/db.js';

(async () => {
  try {
    const name = process.argv[2] || 'Ali Khan';
    const { rows } = await db.query('SELECT id, username, cnic, cnic_name, cnic_last3 FROM users WHERE cnic_name = $1 OR username = $1 OR cnic = $1', [name]);
    if (!rows || rows.length === 0) {
      console.log('No user found matching:', name);
      process.exit(0);
    }
    console.log('Matched users:');
    for (const r of rows) {
      console.log(JSON.stringify(r, null, 2));
    }
  } catch (err) {
    console.error('Query failed:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
