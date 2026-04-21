'use client';

import { useState } from 'react';
import { login } from './actions';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans p-4 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-zinc-950/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-zinc-950/[0.03] blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-sm space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-zinc-950 text-white rounded-[1.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-zinc-950/20">
            <span className="font-serif font-bold text-2xl">C</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight font-serif italic">Selamat Datang</h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-400 font-bold">Masuk ke Dashboard Cogsly</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-zinc-950/5 border border-zinc-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Email Kantor</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-300" />
                  <input name="email" type="email" required placeholder="admin@cogsly.com"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-10 py-3.5 text-xs font-semibold text-zinc-950 focus:outline-none focus:border-zinc-950 transition-all placeholder:text-zinc-300" />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-300" />
                  <input name="password" type="password" required placeholder="••••••••"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-10 py-3.5 text-xs font-semibold text-zinc-950 focus:outline-none focus:border-zinc-950 transition-all placeholder:text-zinc-300" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl animate-in shake duration-300">
                <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest text-center">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full group bg-zinc-950 text-white rounded-xl py-4 font-bold text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-2.5 transition-all hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98]">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Butuh bantuan? Konsultasi ke IT Support</p>
        </div>
      </div>
    </div>
  );
}