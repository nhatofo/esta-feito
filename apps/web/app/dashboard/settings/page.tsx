'use client';

import { useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../lib/api';
import { SERVICE_CATEGORIES, UserRole } from '@esta-feito/shared';
import { Save, Camera, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const isProvider = user?.role === UserRole.PROVIDER;

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsappNumber ?? '');
  const [bio, setBio]           = useState((user as any)?.bio ?? '');
  const [categories, setCategories] = useState<string[]>((user as any)?.categories ?? []);
  const [mpesa, setMpesa]       = useState((user as any)?.bankDetails?.mpesaNumber ?? '');
  const [emola, setEmola]       = useState((user as any)?.bankDetails?.emolaNumber ?? '');
  const [radius, setRadius]     = useState<number>((user as any)?.availabilityRadius ?? 10);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  function toggleCategory(cat: string) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSaved(false); setSaving(true);
    try {
      const payload: Record<string, unknown> = { fullName, whatsappNumber: whatsapp };
      if (isProvider) {
        payload.bio = bio;
        payload.categories = categories;
        payload.availabilityRadius = radius;
        payload.bankDetails = { mpesaNumber: mpesa, emolaNumber: emola };
      }
      const res = await api.patch('/providers/me', payload);
      updateUser(res.data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao guardar.');
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl space-y-6 pb-12">
      <h1 className="font-display text-3xl text-ink">Definições</h1>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar */}
        <div className="card p-6">
          <h2 className="font-semibold text-ink mb-4">Perfil</h2>
          <div className="flex items-center gap-5 mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center
                              text-3xl font-bold text-brand-700 shadow-sm overflow-hidden">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : user?.fullName.charAt(0).toUpperCase()
                }
              </div>
              <button type="button"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow
                           border border-earth-100 flex items-center justify-center hover:bg-earth-50">
                <Camera size={13} className="text-muted" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-ink">{user?.fullName}</p>
              <p className="text-sm text-muted capitalize">
                {user?.role === UserRole.PROVIDER ? 'Prestador' : user?.role === UserRole.ADMIN ? 'Admin' : 'Cliente'}
              </p>
              <p className="text-xs text-muted mt-0.5">{user?.phone}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Nome completo</label>
              <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Número WhatsApp</label>
              <div className="flex">
                <span className="flex items-center px-3 bg-earth-50 border border-r-0 border-earth-100
                                 rounded-l-[var(--radius-btn)] text-sm text-muted">+258</span>
                <input className="input rounded-l-none flex-1" value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="84 000 0000 (pode ser diferente do telefone)" />
              </div>
              <p className="text-xs text-muted mt-1">
                Usado para os clientes o contactarem directamente via WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Provider-only settings */}
        {isProvider && (
          <>
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-ink">Perfil de prestador</h2>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Apresentação</label>
                <textarea
                  className="input min-h-[100px] resize-none"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Descreva a sua experiência e especialização…"
                  maxLength={500}
                />
                <p className="text-xs text-muted mt-1 text-right">{bio.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Categorias de serviço</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleCategory(cat.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] border text-sm transition-all ${
                        categories.includes(cat.value)
                          ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                          : 'border-earth-100 text-muted hover:border-earth-200'
                      }`}
                    >
                      {cat.icon} {cat.labelPt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  Raio de disponibilidade: <span className="text-brand-600">{radius} km</span>
                </label>
                <input
                  type="range" min={1} max={50} value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>1 km</span><span>50 km</span>
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-ink">Dados bancários</h2>
              <p className="text-sm text-muted">
                Números para receber pagamentos dos clientes via M-Pesa e eMola.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">📱 M-Pesa</label>
                  <div className="flex">
                    <span className="flex items-center px-3 bg-earth-50 border border-r-0 border-earth-100
                                     rounded-l-[var(--radius-btn)] text-sm text-muted">+258</span>
                    <input className="input rounded-l-none flex-1" value={mpesa}
                      onChange={e => setMpesa(e.target.value)} placeholder="84/85 XXXXXXX" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">📲 eMola</label>
                  <div className="flex">
                    <span className="flex items-center px-3 bg-earth-50 border border-r-0 border-earth-100
                                     rounded-l-[var(--radius-btn)] text-sm text-muted">+258</span>
                    <input className="input rounded-l-none flex-1" value={emola}
                      onChange={e => setEmola(e.target.value)} placeholder="86 XXXXXXX" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg text-sm">
            ✓ Definições guardadas com sucesso.
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          <Save size={16} /> {saving ? 'A guardar…' : 'Guardar definições'}
        </button>
      </form>
    </div>
  );
}
