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

	const renderStep = () => {
		if (step === 'verify') {
			return (
				<div className="p-6 sm:p-8">
					<h3 className="text-xl font-bold text-gray-800 mb-2">Admin Verification</h3>
					<p className="text-gray-600 mb-6">Enter your admin password to access the user creation form.</p>
					<div className="relative">
						<input
							type="password"
							value={adminPass}
							onChange={(e) => setAdminPass(e.target.value)}
							placeholder="Admin password"
							className="w-full p-4 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
						/>
						<svg className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
					</div>
					{message && <div className="mt-4 text-red-600 text-sm">{message}</div>}
					<div className="flex gap-4 mt-6">
						<button onClick={verify} disabled={checking} className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50">
							{checking ? "Verifying..." : "Verify"}
						</button>
						<button onClick={onBack} className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition">
							Cancel
						</button>
					</div>
				</div>
			);
		}

		if (step === 'form') {
			return (
				<div className="p-6 sm:p-8">
					<h3 className="text-xl font-bold text-gray-800 mb-6">Create New User</h3>
					<div className="space-y-4">
						<InputField placeholder="Employee ID" value={form.emp_id} onChange={e => setForm({ ...form, emp_id: e.target.value })} />
						<InputField placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
						<InputField placeholder="Full Name (as on CNIC)" value={form.cnic_name} onChange={e => setForm({ ...form, cnic_name: e.target.value })} />
						<InputField placeholder="CNIC (e.g. 12345-1234567-1)" value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} />
						<select
							value={form.role}
							onChange={e => setForm({ ...form, role: e.target.value })}
							className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
						>
							<option value="user">User</option>
							<option value="cashier">Cashier</option>
							<option value="manager">Manager</option>
						</select>
					</div>
					{message && <div className="mt-4 text-red-600 text-sm">{message}</div>}
					<div className="flex gap-4 mt-6">
						<button onClick={submit} className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">
							Create User
						</button>
						<button onClick={onBack} className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition">
							Close
						</button>
					</div>
				</div>
			);
		}

		return (
			<div className="p-6 sm:p-8 text-center">
				<div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
				</div>
				<h3 className="text-xl font-bold text-gray-800 mb-2">Success!</h3>
				<p className="text-gray-600 mb-6">{message}</p>
				<button onClick={onBack} className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition">
					Back to Dashboard
				</button>
			</div>
		);
	};

	return (
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen flex items-center justify-center">
			<div className="w-full max-w-2xl">
				<div className="bg-white rounded-lg shadow-lg overflow-hidden">
					{/* Header */}
					<div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white">
						<div className="flex items-center gap-4">
							<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
							<div>
								<h1 className="text-2xl font-black tracking-tight">USER MANAGEMENT</h1>
								<p className="text-pink-100 text-sm">Create and manage system users</p>
							</div>
						</div>
					</div>
					{renderStep()}
				</div>
			</div>
		</div>
	);
}

function InputField({ placeholder, value, onChange }) {
	return (
		<input
			type="text"
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
		/>
	)
}

