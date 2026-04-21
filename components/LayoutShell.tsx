'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  UtensilsCrossed,
  LayoutDashboard,
  ShoppingBag,
  Menu,
  X,
  LogOut,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { logout } from '@/app/login/actions';
import { Profile, UserRole } from '@/types';

const navigation = [
  { name: 'Dasbor', href: '/', icon: LayoutDashboard, description: 'Ringkasan bisnis', roles: ['admin', 'warehouse', 'cashier'] },
  { name: 'Bahan Baku', href: '/ingredients', icon: Package, description: 'Stok & material', roles: ['admin', 'warehouse'] },
  { name: 'Pembelian', href: '/procurement', icon: ShoppingCart, description: 'Log pengadaan', roles: ['admin', 'warehouse'] },
  { name: 'Resep & HPP', href: '/recipes', icon: UtensilsCrossed, description: 'Harga pokok', roles: ['admin'] },
  { name: 'Reservasi', href: '/reservations', icon: Calendar, description: 'Booking meja', roles: ['admin', 'cashier', 'waiter'] },
  { name: 'Kasir', href: '/pos', icon: ShoppingBag, description: 'Proses transaksi', roles: ['admin', 'cashier', 'waiter'] },
];

export function LayoutShell({ children, profile }: { children: React.ReactNode; profile: Profile | null }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === '/login' || pathname === '/access-denied') {
    return <>{children}</>;
  }

  const role = profile?.role || 'waiter';
  const filteredNav = navigation.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen h-screen w-full flex bg-zinc-50 font-sans">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-zinc-950/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          'bg-white border-r border-zinc-200 shadow-sm print:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 shrink-0 border-b border-zinc-100">
          <span className="text-lg font-bold font-serif text-zinc-950">F&B MANAJER</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-zinc-50 text-zinc-400"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Menu utama">
          <p className="px-2 pb-2 pt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Menu Utama</p>
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-zinc-950 text-white shadow-md shadow-zinc-950/20'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                )}
              >
                <div className={cn(
                  'p-1.5 rounded-lg transition-colors shrink-0',
                  isActive ? 'bg-white/10' : 'bg-transparent group-hover:bg-zinc-100'
                )}>
                  <item.icon className="w-3.5 h-3.5" aria-hidden />
                </div>
                <span className="text-xs font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile & Logout */}
        <div className="p-2.5 border-t border-zinc-100 bg-zinc-50/50 space-y-1.5">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white border border-zinc-200">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold bg-zinc-100 text-zinc-950 shadow-inner shrink-0">
              {profile?.full_name?.charAt(0) || role.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-950 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-[9px] uppercase tracking-widest"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between h-12 px-4 bg-white border-b border-zinc-200 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-950 text-white">
              <span className="font-serif font-bold text-sm">C</span>
            </div>
            <span className="text-sm font-bold font-serif tracking-widest text-zinc-950">COGSLY</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500"
            aria-label="Buka menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.02),transparent_40%)] pointer-events-none print:hidden" />
          {children}
        </main>
      </div>
    </div>
  );
}