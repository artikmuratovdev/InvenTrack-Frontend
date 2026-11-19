import { Loader2, ShieldAlert } from 'lucide-react';
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/inventory';
import { Layout } from './Layout';

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
          <span>Tizim yuklanmoqda...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Layout title="Ruxsat cheklangan">
        <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-lg mx-auto text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            Ushbu sahifaga kirish huquqingiz yo‘q
          </h2>
          <p className="text-sm text-slate-600">
            Bu bo‘lim faqat Administrator roli uchun ochiq. Boshqaruv paneliga qaytishingiz mumkin.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
          >
            Bosh sahifaga qaytish
          </Link>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
}
