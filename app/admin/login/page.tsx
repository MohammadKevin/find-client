'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Lock, ArrowRight, XCircle, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);

    // Admin PIN: 1992
    if (pin.trim() === '1992') {
      sessionStorage.setItem('kos_admin_auth', '1992');
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 400);
    } else {
      setIsLoading(false);
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Portal Admin Kos Graha Surabaya
          </h1>
          <p className="text-xs text-slate-500">
            Monitoring 35 Kamar, Verifikasi KTP Penghuni, & Laporan Pemasukan
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>PIN Akses Admin salah. Masukkan PIN keamanan yang benar.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>PIN / Password Keamanan Admin:</span>
              <span className="text-[11px] text-slate-400 font-mono">PIN: 1992</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="Masukkan 4 angka PIN (1992)..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !pin.trim()}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isLoading ? 'Membuka Dashboard...' : 'Masuk ke Dashboard Admin'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/kos" className="hover:text-slate-900 transition flex items-center gap-1">
            <span>&larr; Kembali ke Web Kos</span>
          </Link>
          <div className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Sesi Terenkripsi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
