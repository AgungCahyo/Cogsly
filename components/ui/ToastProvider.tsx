'use client';

import { createContext, useCallback, useContext, useId, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastVariant = 'info' | 'success' | 'error';

type ToastItem = { id: string; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DISMISS_MS = 4500;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const variantStyles: Record<ToastVariant, string> = {
  info: 'bg-zinc-950 text-white border-zinc-800',
  success: 'bg-emerald-950 text-white border-emerald-800',
  error: 'bg-red-950 text-white border-red-900',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const regionId = useId();

  const remove = useCallback((id: string) => {
    const t = timeouts.current.get(id);
    if (t) clearTimeout(t);
    timeouts.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
      const tid = setTimeout(() => remove(id), DISMISS_MS);
      timeouts.current.set(id, tid);
    },
    [remove]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        id={regionId}
        className="fixed top-4 right-4 z-100 flex max-w-sm flex-col gap-2 p-0 pointer-events-none print:hidden"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl shadow-zinc-950/20',
              'animate-in slide-in-from-right-4 fade-in duration-300',
              variantStyles[t.variant]
            )}
          >
            <p className="flex-1 text-xs font-semibold leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="shrink-0 rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
