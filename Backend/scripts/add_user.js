import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import db from '../src/db.js';

dotenv.config();

const [, , username, cnic, cnic_name, emp_id, role = 'user'] = process.argv;
if (!username || !cnic || !cnic_name || !emp_id) {
  console.error('Usage: node add_user.js <username> <cnic> <cnic_name> <emp_id> [role]');
  process.exit(1);
}

(async () => {
  const client = await db.getClient();
  try {
    // derive last 3 digits from CNIC (digits only)
    const digits = (cnic || '').toString().replace(/\D/g, '');
    if (digits.length < 3) {
      console.error('CNIC must contain at least 3 digits');
      process.exit(1);
    }
    const last3 = digits.slice(-3);

    const { rows: sameUser } = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (sameUser.length > 0) {
      console.log('User already exists:', username);
      process.exit(0);
    }
    const { rows: sameCnic } = await client.query('SELECT id FROM users WHERE cnic = $1', [cnic]);
    if (sameCnic.length > 0) {
      console.log('CNIC already registered:', cnic);
      process.exit(0);
    }
    const { rows: sameLast } = await client.query('SELECT id FROM users WHERE cnic_last3 = $1', [last3]);
    if (sameLast.length > 0) {
      console.log('Another user already has the same CNIC last 3 digits:', last3);
      process.exit(0);
    }

    // ensure emp_id unique
    const { rows: sameEmpId } = await client.query('SELECT id FROM users WHERE emp_id = $1', [emp_id]);
    if (sameEmpId.length > 0) {
      console.log('Employee ID already registered:', emp_id);
      process.exit(0);
    }

    const hash = await bcrypt.hash(last3, 10);
    await client.query(
      'INSERT INTO users (username, password, role, cnic, cnic_name, cnic_last3, emp_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [username, hash, role, cnic, cnic_name, last3, emp_id]
    );
    console.log('Created user:', username, 'role:', role, 'emp_id:', emp_id, 'default password: last 3 digits of CNIC');
  } catch (err) {
    console.error('Error creating user:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try { if (client && typeof client.release === 'function') client.release(); } catch (e) {}
    process.exit(0);
  }
})();
