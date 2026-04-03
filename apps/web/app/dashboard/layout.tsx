'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { UserRole, APP_NAME } from '@esta-feito/shared';
import {
  LayoutDashboard, Briefcase, Users, Star,
  Bell, Settings, LogOut, Plus, ChevronRight,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/auth');
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) return null;

  const isProvider  = user.role === UserRole.PROVIDER;
  const isCustomer  = user.role === UserRole.CUSTOMER;

  const navLinks = [
    { href: '/dashboard',          icon: LayoutDashboard, label: 'Início',        show: true },
    { href: '/dashboard/jobs',     icon: Briefcase,       label: 'Trabalhos',     show: true },
    { href: '/dashboard/providers',icon: Users,           label: 'Prestadores',   show: isCustomer },
    { href: '/dashboard/earnings', icon: Star,            label: 'Ganhos',        show: isProvider },
    { href: '/dashboard/reviews',  icon: Star,            label: 'Avaliações',    show: true },
    { href: '/dashboard/settings', icon: Settings,        label: 'Definições',    show: true },
  ].filter((l) => l.show);

  function handleLogout() {
    clearAuth();
    router.push('/');
  }

  return (
    <div className="min-h-screen flex bg-surface">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-earth-900 text-white min-h-screen sticky top-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <span className="font-display text-2xl font-bold text-brand-400">{APP_NAME}</span>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center
                            font-bold text-white text-sm flex-shrink-0">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">{user.fullName}</p>
              <p className="text-xs text-earth-100/50 capitalize">
                {user.role === UserRole.PROVIDER ? 'Prestador' : user.role === UserRole.ADMIN ? 'Admin' : 'Cliente'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-500 text-white'
                    : 'text-earth-100/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        {isCustomer && (
          <div className="px-4 py-3 border-t border-white/10">
            <Link href="/dashboard/jobs/new" className="btn-primary w-full justify-center gap-2">
              <Plus size={16} /> Publicar Trabalho
            </Link>
          </div>
        )}

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
                       text-sm text-earth-100/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-earth-100 px-4 py-3 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-brand-600">{APP_NAME}</span>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/notifications">
              <Bell size={20} className="text-muted" />
            </Link>
            {isCustomer && (
              <Link href="/dashboard/jobs/new" className="btn-primary py-1.5 px-3 text-xs">
                <Plus size={14} /> Trabalho
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-earth-100 z-40">
          <div className="flex">
            {navLinks.slice(0, 4).map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href} href={href}
                  className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                    active ? 'text-brand-600' : 'text-muted'
                  }`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
