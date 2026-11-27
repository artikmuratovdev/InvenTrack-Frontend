import { Loader2, Lock, Mail } from 'lucide-react';
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  {
    label: 'Administrator',
    sublabel: 'G‘olibjon Karimov · To‘liq huquq',
    email: 'admin@inventrack.uz',
    password: 'password123',
  },
  {
    label: 'Mas’ul shaxs',
    sublabel: 'Nurmuhammad Tursunov · O‘z jihozlari va ta’mir',
    email: 'masul@inventrack.uz',
    password: 'password123',
  },
  {
    label: 'Xodim',
    sublabel: 'Dilshod Rahimov · Faqat ko‘rish',
    email: 'xodim@inventrack.uz',
    password: 'password123',
  },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const performLogin = async (targetEmail: string, targetPassword: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(targetEmail, targetPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishda xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <p className="text-lg font-bold tracking-tight text-slate-900">InvenTrack</p>
          <h1 className="text-xl font-semibold text-slate-900">Tizimga kirish</h1>
          <p className="text-sm text-slate-500">
            Jihozlar va ta’mir jarayonlarini boshqarish uchun hisobingizga kiring.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Elektron pochta
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inventrack.uz"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Parol
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Kirish</span>
          </button>
        </form>

        <div className="pt-5 border-t border-slate-200 space-y-2.5">
          <p className="text-xs font-medium text-slate-500">
            Rollar bo‘yicha tezkor sinov kirishi
          </p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={submitting}
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(acc.password);
                  void performLogin(acc.email, acc.password);
                }}
                className="w-full text-left px-3.5 py-2.5 border border-slate-200 hover:border-blue-300 hover:bg-slate-50 rounded-md transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{acc.label}</p>
                  <p className="text-xs text-slate-500 truncate">{acc.sublabel}</p>
                </div>
                <span className="text-xs font-medium text-blue-700 shrink-0">Kirish</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
