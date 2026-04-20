'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-16 text-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-zinc-100 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-zinc-400" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-zinc-950">Terjadi kesalahan</h3>
            <p className="text-sm text-zinc-500 max-w-sm">
              {this.state.error?.message ?? 'Komponen gagal dimuat. Coba muat ulang halaman.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-950 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Loading Skeletons ────────────────────────────────────────────────────────

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-zinc-100 rounded-xl animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-8" aria-label="Memuat data..." aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-6">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBlock
              key={j}
              className={`h-10 ${j === 0 ? 'flex-[2]' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-7 space-y-6 animate-pulse">
      <SkeletonBlock className="w-12 h-12 rounded-2xl" />
      <div className="space-y-2">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10" aria-busy="true">
      <div className="border-b border-zinc-200 pb-8 space-y-3">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-10 w-64" />
        <SkeletonBlock className="h-4 w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden">
        <TableSkeleton rows={6} cols={5} />
      </div>
    </div>
  );
}