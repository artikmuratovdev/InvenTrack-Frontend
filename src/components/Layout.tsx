import {
  BarChart3,
  BookOpen,
  Box,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types/inventory';
import { AiChatDrawer } from './AiChatDrawer';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Boshqaruv paneli', icon: LayoutDashboard },
  { to: '/equipment', label: 'Jihozlar', icon: Box },
  { to: '/repairs', label: 'Ta’mirlar', icon: Wrench },
  { to: '/reports', label: 'Hisobotlar', icon: BarChart3 },
  { to: '/admin/users', label: 'Foydalanuvchilar', icon: Users, adminOnly: true },
  { to: '/admin/references', label: 'Ma’lumotnomalar', icon: BookOpen, adminOnly: true },
];

export function Layout({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const location = useLocation();

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN');

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Asosiy menyu">
      {visibleNav.map((item) => {
        const Icon = item.icon;
        const isRoot = item.to === '/';
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={isRoot}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 no-print">
        <div className="h-16 px-5 flex items-center border-b border-slate-200">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            InvenTrack
          </Link>
        </div>

        {renderNavLinks()}

        {user && (
          <div className="p-4 border-t border-slate-200 space-y-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.fullName}</p>
              <p className="text-xs text-slate-500 truncate">
                {ROLE_LABELS[user.role]} · {user.department}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tizimdan chiqish</span>
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/30"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col h-full">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
              >
                InvenTrack
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-md"
                aria-label="Menyuni yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderNavLinks(() => setMobileMenuOpen(false))}
            {user && (
              <div className="p-4 border-t border-slate-200 space-y-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{ROLE_LABELS[user.role]}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Chiqish</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              aria-label="Menyuni ochish"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-4 h-4 text-blue-700" aria-hidden="true" />
              <span className="hidden sm:inline">AI Yordamchi</span>
              <span className="sm:hidden">AI</span>
            </button>
            {action}
          </div>
        </header>

        <main key={location.pathname} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <AiChatDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
