import { useState, useEffect } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { adminApi } from '../../api/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'admin' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.registerUser({ ...form, password_confirmation: form.password });
      setShowForm(false);
      setForm({ full_name: '', email: '', password: '', role: 'admin' });
      fetchUsers();
    } catch (err) { alert(err.data?.message || 'Failed to create user'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await adminApi.deleteUser(id);
      fetchUsers();
    } catch (err) { alert(err.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-slate-400 mt-1">Manage admin accounts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20"
        >
          + Add User
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white text-lg font-semibold">Create User</h2>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Full Name</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none" required />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none" required />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none" required minLength={8} />
            </div>
            <div>
              <label className="text-slate-400 text-sm block mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 focus:outline-none">
                <option value="admin">Admin</option>
                <option value="community">Community</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-violet-500 disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left text-slate-400 font-medium px-5 py-4">Name</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Email</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Role</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Created</th>
                <th className="text-left text-slate-400 font-medium px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-xs font-bold text-white">{u.full_name?.charAt(0)}</div>
                      <span className="text-white font-medium">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{u.email}</td>
                  <td className="px-5 py-4"><StatusBadge status={u.role === 'admin' ? 'online' : 'offline'} /></td>
                  <td className="px-5 py-4 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString('en-PH')}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
