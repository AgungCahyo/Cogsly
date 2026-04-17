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
  ChevronRight,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Business overview' },
  { name: 'Ingredients', href: '/ingredients', icon: Package, description: 'Stock & materials' },
  { name: 'Procurement', href: '/procurement', icon: ShoppingCart, description: 'Purchase logs' },
  { name: 'Recipes & HPP', href: '/recipes', icon: UtensilsCrossed, description: 'Cost of goods' },
  { name: 'Point of Sale', href: '/pos', icon: ShoppingBag, description: 'Process orders' },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#0f0f0f] border-r border-white/[0.06] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="font-bold text-sm text-white leading-none">C</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">Cogsly</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 pt-2 pb-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
            Navigation
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
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 relative',
                  isActive
                    ? 'bg-violet-500/10 text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 rounded-r-full" />
                )}

                <item.icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  )}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium leading-none',
                      isActive ? 'text-white' : ''
                    )}
                  >
                    {item.name}
                  </p>
                  <p className="text-[11px] text-zinc-600 mt-0.5 leading-none truncate">
                    {item.description}
                  </p>
                </div>

                {isActive && (
                  <ChevronRight className="w-3 h-3 text-violet-500 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <span className="text-[10px] font-bold text-zinc-400">F</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-300 leading-none truncate">F&amp;B Manager</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">Free plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-[#0f0f0f] border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-violet-500 flex items-center justify-center shadow shadow-violet-500/30">
              <span className="font-bold text-xs text-white">C</span>
            </div>
            <span className="text-sm font-semibold text-white">Cogsly</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}