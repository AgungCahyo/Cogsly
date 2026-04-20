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
  BarChart3,
  LogOut,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { logout } from '@/app/login/actions';
import { Profile, UserRole } from '@/types';

/** Sidebar visibility — server enforcement lives in `lib/auth/access-policy.ts` (middleware + actions). */
const navigation = [
  { name: 'Dasbor', href: '/', icon: LayoutDashboard, description: 'Ringkasan bisnis', roles: ['admin', 'warehouse', 'cashier'] },
  { name: 'Reservasi', href: '/reservations', icon: Calendar, description: 'Booking meja', roles: ['admin', 'cashier', 'waiter'] },
  { name: 'Bahan Baku', href: '/ingredients', icon: Package, description: 'Stok & material', roles: ['admin', 'warehouse'] },
  { name: 'Pembelian', href: '/procurement', icon: ShoppingCart, description: 'Log pengadaan', roles: ['admin', 'warehouse'] },
  { name: 'Resep & HPP', href: '/recipes', icon: UtensilsCrossed, description: 'Harga pokok', roles: ['admin'] },
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
    <div className="min-h-screen h-screen  w-full flex bg-zinc-50 font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-zinc-950/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          'bg-white border-r border-zinc-200 shadow-sm print:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-20 px-6 shrink-0 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            
            <div>
              <span className="text-2xl font-bold font-serif text-zinc-950">F&B MANAJER</span>
             
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-zinc-50 text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Menu utama">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Menu Utama</p>
          {filteredNav.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 px-1 py-1 rounded-xl transition-all duration-200 relative',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-zinc-950 text-white shadow-md shadow-zinc-950/20'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950'
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isActive ? 'bg-white/10' : 'bg-transparent group-hover:bg-zinc-100'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" aria-hidden />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{item.name}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-zinc-100 bg-zinc-50/50 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white border border-zinc-200">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold bg-zinc-100 text-zinc-950 shadow-inner">
              {profile?.full_name?.charAt(0) || role.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-950 truncate">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{role}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-[10px] uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-2"
          >
            <LogOut className="w-4 h-4" aria-hidden />
            Keluar Sistem
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between h-16 px-6 bg-white border-b border-zinc-200 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-950 text-white">
              <span className="font-serif font-bold text-base">C</span>
            </div>
            <span className="text-sm font-bold font-serif tracking-widest text-zinc-950">COGSLY</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
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
