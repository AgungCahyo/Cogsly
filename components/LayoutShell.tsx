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
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: 'Dasbor', href: '/', icon: LayoutDashboard, description: 'Ringkasan bisnis' },
  { name: 'Bahan Baku', href: '/ingredients', icon: Package, description: 'Stok & material' },
  { name: 'Pembelian', href: '/procurement', icon: ShoppingCart, description: 'Log pengadaan' },
  { name: 'Resep & HPP', href: '/recipes', icon: UtensilsCrossed, description: 'Harga pokok' },
  { name: 'Kasir', href: '/pos', icon: ShoppingBag, description: 'Proses transaksi' },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(10,9,5,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between h-16 px-5 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--gold)',
                boxShadow: '0 0 20px rgba(212,170,60,0.3)',
              }}
            >
              <span
                className="font-bold text-sm leading-none"
                style={{ color: '#0a0905', fontFamily: 'var(--font-serif)' }}
              >
                C
              </span>
            </div>
            <div>
              <span
                className="text-sm font-bold tracking-wide"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}
              >
                COGSLY
              </span>
              <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '-2px' }}>F&amp;B Manager</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" style={{ paddingTop: '1rem' }}>
          <p
            className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}
          >
            Menu Utama
          </p>
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative',
                )}
                style={{
                  background: isActive ? 'var(--gold-muted)' : 'transparent',
                  color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: 'var(--gold)' }}
                  />
                )}

                <item.icon className="w-4 h-4 shrink-0" style={{ color: isActive ? 'var(--gold)' : 'inherit' }} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{item.name}</p>
                  <p className="text-xs mt-0.5 leading-none truncate" style={{ color: 'var(--text-muted)' }}>
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div
            className="flex items-center gap-2.5 px-2 py-2 rounded-xl"
            style={{ background: 'var(--gold-glow)' }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'var(--gold-muted)', color: 'var(--gold)' }}
            >
              F
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-none truncate" style={{ color: 'var(--text-primary)' }}>
                F&amp;B Manager
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Paket Gratis</p>
            </div>
            <div
              className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 pulse-dot"
              style={{ background: 'var(--success)' }}
            />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center justify-between h-14 px-4 shrink-0"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gold)' }}
            >
              <span className="font-bold text-xs" style={{ color: '#0a0905', fontFamily: 'var(--font-serif)' }}>C</span>
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', letterSpacing: '0.05em' }}>
              COGSLY
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <Menu className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto relative z-10">{children}</main>
      </div>
    </div>
  );
}