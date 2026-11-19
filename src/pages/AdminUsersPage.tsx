import { AlertCircle, Loader2, Plus, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../lib/api';
import { ROLE_LABELS, type User, type UserRole } from '../types/inventory';

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>('RESPONSIBLE');
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ users: User[] }>('/api/admin/users');
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foydalanuvchilarni yuklashda xatolik.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/api/admin/users', {
        fullName,
        email,
        password,
        department,
        role,
      });
      setModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setDepartment('');
      setRole('RESPONSIBLE');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foydalanuvchi yaratishda xatolik.');
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (id: string, patch: Partial<Pick<User, 'role' | 'active'>>) => {
    setError(null);
    try {
      const res = await api.patch<{ user: User }>(`/api/admin/users/${id}`, patch);
      setUsers((prev) => prev.map((u) => (u.id === id ? res.user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'O‘zgarishni saqlashda xatolik.');
    }
  };

  return (
    <Layout
      title="Foydalanuvchilar boshqaruvi"
      action={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi foydalanuvchi</span>
        </button>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-white border border-red-200 rounded-lg p-4 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg h-64 animate-pulse" />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">F.I.Sh.</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Bo‘lim</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4 text-right">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {u.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{u.email}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{u.department}</td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          aria-label={`${u.fullName} roli`}
                          onChange={(e) =>
                            void updateUser(u.id, { role: e.target.value as UserRole })
                          }
                          className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void updateUser(u.id, { active: !u.active })}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                            u.active
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                              : 'text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {u.active ? 'Faol' : 'Bloklangan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Yangi foydalanuvchi</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">To‘liq ism *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Parol *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Bo‘lim</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Masalan: Marketing"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Rol *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-md"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Yaratish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
