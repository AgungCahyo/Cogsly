'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SelectOption = {
  label: string;
  value: string;
};

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  name?: string; // For form compatibility
  required?: boolean;
  className?: string;
  searchable?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  label,
  name,
  required,
  className,
  searchable = true,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => 
    options.find(opt => opt.value === value), 
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative space-y-2", className)} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {label} {required && <span className="text-zinc-950">*</span>}
        </label>
      )}

      {/* Hidden input for form compatibility */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-zinc-50 border transition-all duration-300 rounded-2xl px-5 py-3.5 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/15 focus-visible:ring-offset-2",
          isOpen ? "border-zinc-950 ring-2 ring-zinc-950/5" : "border-zinc-200 hover:border-zinc-950"
        )}
      >
        <span className={cn(
          "text-sm font-medium truncate",
          selectedOption ? "text-zinc-950" : "text-zinc-300"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 text-zinc-400 transition-transform duration-300",
          isOpen && "rotate-180 text-zinc-950"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white border border-zinc-200 rounded-[1.5rem] shadow-2xl shadow-zinc-950/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {searchable && (
            <div className="p-3 border-b border-zinc-50">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-50 border border-transparent rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-zinc-950 placeholder:text-zinc-200 focus:outline-none focus:border-zinc-100"
                />
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center bg-zinc-50/50 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Data tidak ditemukan</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-medium transition-all group",
                      value === option.value
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"
                    )}
                  >
                    <span>{option.label}</span>
                    {value === option.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
