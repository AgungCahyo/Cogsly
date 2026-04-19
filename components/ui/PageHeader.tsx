'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  backHref?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, backHref, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-6 border-b border-zinc-200 pb-8 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-start gap-5 min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className={cn(
              'shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center bg-white border border-zinc-200',
              'text-zinc-400 hover:text-zinc-950 hover:border-zinc-950 transition-all shadow-sm hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 focus-visible:ring-offset-2'
            )}
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        ) : null}
        <div className="flex min-w-0 items-start gap-4">
          {icon ? (
            <div className="shrink-0 p-2.5 bg-zinc-950 rounded-xl text-white shadow-lg shadow-zinc-950/20">{icon}</div>
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1 font-mono">{eyebrow}</p>
            <h1 className="text-3xl font-bold text-zinc-950 font-serif leading-tight tracking-tight">{title}</h1>
            {description ? <p className="text-sm text-zinc-500 mt-1.5 font-medium tracking-tight">{description}</p> : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
