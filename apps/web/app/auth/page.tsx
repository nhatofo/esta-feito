'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { normalizeMozPhone, isValidMozPhone, APP_NAME } from '@esta-feito/shared';
import { UserRole } from '@esta-feito/shared';

type Step = 'phone' | 'otp' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep]     = useState<Step>('phone');
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole]     = useState<UserRole>(
    (params.get('role') as UserRole) ?? UserRole.CUSTOMER
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [isNew, setIsNew]   = useState(params.get('register') === '1');

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const normalized = normalizeMozPhone(phone);
    if (!isValidMozPhone(normalized)) {
      setError('Número de telefone inválido. Use o formato: 84XXXXXXX');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/request-otp', { phone: normalized });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao enviar OTP.');
    } finally { setLoading(false); }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('O código OTP tem 6 dígitos.'); return; }
    setLoading(true);
    try {
      const normalized = normalizeMozPhone(phone);
      // Try verify — if user doesn't exist yet, server returns 400 asking for name+role
      const res = await api.post('/auth/verify-otp', {
        phone: normalized, otp,
        ...(isNew ? { fullName, role } : {}),
      });
      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.tokens);
        router.replace('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error ?? '';
      if (msg.includes('Nome completo')) { setStep('register'); }
      else setError(msg || 'OTP inválido.');
    } finally { setLoading(false); }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Insira o seu nome completo.'); return; }
    setLoading(true);
    try {
      const normalized = normalizeMozPhone(phone);
      const res = await api.post('/auth/verify-otp', { phone: normalized, otp, fullName, role });
      setAuth(res.data.data.user, res.data.data.tokens);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao registar.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-earth-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.15) 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-4xl font-bold text-brand-400 hover:text-brand-300 transition-colors">
            {APP_NAME}
          </Link>
          <p className="text-earth-100/60 text-sm mt-1">Serviços ao seu alcance</p>
        </div>

        <div className="card bg-white p-8">
          {/* ── Step: Phone ── */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              <div>
                <h2 className="font-display text-2xl text-ink mb-1">
                  {isNew ? 'Criar conta' : 'Entrar'}
                </h2>
                <p className="text-muted text-sm">Enviaremos um código SMS para o seu número</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  Número de telefone
                </label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-earth-50 border border-r-0 border-earth-100
                                   rounded-l-[var(--radius-btn)] text-sm text-muted font-mono">
                    🇲🇿 +258
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="84 000 0000"
                    className="input rounded-l-none flex-1"
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>

              {isNew && (
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Sou um</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: UserRole.CUSTOMER, label: '🏠 Cliente', desc: 'Contratar serviços' },
                      { value: UserRole.PROVIDER, label: '🔧 Prestador', desc: 'Oferecer serviços' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={`p-3 rounded-[var(--radius-btn)] border-2 text-left transition-all ${
                          role === opt.value
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-earth-100 hover:border-earth-200'
                        }`}
                      >
                        <div className="font-semibold text-sm text-ink">{opt.label}</div>
                        <div className="text-xs text-muted">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'A enviar…' : 'Continuar'}
              </button>

              <p className="text-center text-sm text-muted">
                {isNew ? 'Já tem conta?' : 'Não tem conta?'}{' '}
                <button
                  type="button"
                  onClick={() => setIsNew(!isNew)}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  {isNew ? 'Entrar' : 'Registar'}
                </button>
              </p>
            </form>
          )}

          {/* ── Step: OTP ── */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <h2 className="font-display text-2xl text-ink mb-1">Verificar código</h2>
                <p className="text-muted text-sm">
                  Enviámos um código de 6 dígitos para{' '}
                  <span className="font-semibold text-ink">+258 {phone}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Código OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="input text-center text-3xl font-mono tracking-[0.5em] py-4"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full py-3">
                {loading ? 'A verificar…' : 'Verificar'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full text-sm text-muted hover:text-ink text-center"
              >
                ← Alterar número
              </button>
            </form>
          )}

          {/* ── Step: Register name ── */}
          {step === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div>
                <h2 className="font-display text-2xl text-ink mb-1">Bem-vindo!</h2>
                <p className="text-muted text-sm">Complete o seu registo</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="João Machava"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Função</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: UserRole.CUSTOMER, label: '🏠 Cliente' },
                    { value: UserRole.PROVIDER, label: '🔧 Prestador' },
                  ].map((opt) => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setRole(opt.value)}
                      className={`p-3 rounded-[var(--radius-btn)] border-2 text-sm font-semibold transition-all ${
                        role === opt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-earth-100 text-ink'
                      }`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'A registar…' : 'Criar conta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
