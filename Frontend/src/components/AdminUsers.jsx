import { useState, useEffect } from 'react';
import api from '../api';

export default function AdminUsers({ onBack }) {
  const [step, setStep] = useState('verify'); // verify -> form -> done
  const [adminPass, setAdminPass] = useState('');
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({ username: '', cnic: '', cnic_name: '', emp_id: '', role: 'user' });
  const [message, setMessage] = useState('');

  const verify = async () => {
    setChecking(true);
    try {
      await api.post('/admin/verify-password', { password: adminPass });
      setStep('form');
      setMessage('');
    } catch (e) {
      setMessage(e.response?.data?.error || 'Verify failed');
    } finally { setChecking(false); }
  };

  const submit = async () => {
    try {
      const payload = { ...form };
      const { data } = await api.post('/admin/users', payload);
      setMessage('User created: ' + (data.username || ''));
      setStep('done');
    } catch (e) {
      setMessage(e.response?.data?.error || 'Create failed');
    }
  };

  if (step === 'verify') {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Admin verification</h2>
        <p className="mb-4">Enter admin password to open user creation form.</p>
        <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Admin password" className="w-full p-3 rounded border mb-3" />
        <div className="flex gap-3">
          <button onClick={verify} disabled={checking} className="px-4 py-2 bg-blue-600 text-white rounded">Verify</button>
          <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
        </div>
        {message && <div className="mt-3 text-red-600">{message}</div>}
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Create new user</h2>
        <div className="space-y-3">
          <input placeholder="Employee ID" value={form.emp_id} onChange={e=>setForm({...form, emp_id: e.target.value})} className="w-full p-3 rounded border" />
          <input placeholder="Username" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} className="w-full p-3 rounded border" />
          <input placeholder="Full name (CNIC name)" value={form.cnic_name} onChange={e=>setForm({...form, cnic_name: e.target.value})} className="w-full p-3 rounded border" />
          <input placeholder="CNIC (e.g. 16202-8981165-653)" value={form.cnic} onChange={e=>setForm({...form, cnic: e.target.value})} className="w-full p-3 rounded border" />
          <select value={form.role} onChange={e=>setForm({...form, role: e.target.value})} className="w-full p-3 rounded border">
            <option value="user">User</option>
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
          </select>
          <div className="flex gap-3">
            <button onClick={submit} className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
            <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded">Close</button>
          </div>
          {message && <div className="mt-3 text-red-600">{message}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Done</h2>
      <p>{message}</p>
      <div className="mt-4">
        <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded">Back</button>
      </div>
    </div>
  );
}
