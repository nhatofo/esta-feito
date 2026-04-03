'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { SERVICE_CATEGORIES, CITIES_MZ } from '@esta-feito/shared';
import { Upload, MapPin, Calendar, DollarSign, ArrowLeft, CheckCircle } from 'lucide-react';

interface FormData {
  title: string;
  description: string;
  category: string;
  city: string;
  neighbourhood: string;
  budget: string;
  scheduledDate: string;
  photos: File[];
}

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    title: '', description: '', category: '', city: 'Tete',
    neighbourhood: '', budget: '', scheduledDate: '', photos: [],
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [previews, setPreviews] = useState<string[]>([]);
  const [step, setStep]         = useState<1 | 2 | 3>(1);

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5);
    setForm(f => ({ ...f, photos: files }));
    setPreviews(files.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Upload photos first if any
      let uploadedPhotos: Array<{ url: string; publicId: string }> = [];
      if (form.photos.length > 0) {
        const fd = new FormData();
        form.photos.forEach(f => fd.append('files', f));
        const uploadRes = await api.post('/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPhotos = uploadRes.data.data;
      }

      // Get user's geolocation (fallback to Tete centre)
      const coords = await new Promise<{ lat: number; lng: number }>((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: -16.1564, lng: 33.5867 }) // Tete fallback
          );
        } else {
          resolve({ lat: -16.1564, lng: 33.5867 });
        }
      });

      await api.post('/jobs', {
        title: form.title,
        description: form.description,
        category: form.category,
        budget: parseInt(form.budget),
        scheduledDate: form.scheduledDate,
        photos: uploadedPhotos,
        address: {
          neighbourhood: form.neighbourhood,
          city: form.city,
          province: form.city === 'Maputo' ? 'Maputo Cidade' : 'Tete',
          latitude: coords.lat,
          longitude: coords.lng,
        },
      });

      setStep(3); // success
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Erro ao publicar trabalho.');
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──
  if (step === 3) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="font-display text-3xl text-ink mb-3">Trabalho publicado!</h2>
        <p className="text-muted mb-8">
          Os prestadores próximos serão notificados e enviarão propostas em breve.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={() => router.push('/dashboard/jobs')} className="btn-primary w-full py-3">
            Ver os meus trabalhos
          </button>
          <button onClick={() => { setStep(1); setForm({ title:'',description:'',category:'',city:'Tete',neighbourhood:'',budget:'',scheduledDate:'',photos:[] }); }} className="btn-secondary w-full py-3">
            Publicar outro trabalho
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-earth-100 transition-colors">
          <ArrowLeft size={20} className="text-muted" />
        </button>
        <div>
          <h1 className="font-display text-2xl text-ink">Publicar trabalho</h1>
          <p className="text-muted text-sm">Passo {step} de 2</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-brand-500' : 'bg-earth-100'}`} />
        <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-brand-500' : 'bg-earth-100'}`} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Step 1: Details ── */}
        {step === 1 && (
          <>
            <div className="card p-6 space-y-5">
              <h2 className="font-semibold text-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">1</span>
                Detalhes do trabalho
              </h2>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Título *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Ex: Reparar torneira na cozinha"
                  required maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Categoria *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value} type="button"
                      onClick={() => set('category', cat.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] border text-sm transition-all ${
                        form.category === cat.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700 font-semibold'
                          : 'border-earth-100 text-ink hover:border-earth-200'
                      }`}
                    >
                      {cat.icon} {cat.labelPt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">Descrição *</label>
                <textarea
                  className="input min-h-[120px] resize-none"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Descreva o trabalho com o máximo de detalhe possível…"
                  required maxLength={1000}
                />
                <p className="text-xs text-muted mt-1 text-right">{form.description.length}/1000</p>
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  Fotos (opcional, máx. 5)
                </label>
                <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-earth-100
                                   rounded-[var(--radius-card)] cursor-pointer hover:border-brand-300 transition-colors">
                  <Upload size={24} className="text-muted" />
                  <span className="text-sm text-muted">Clique para seleccionar fotos</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotos} className="sr-only" />
                </label>
                {previews.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {previews.map((src, i) => (
                      <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-earth-100" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={!form.title || !form.category || !form.description}
              onClick={() => setStep(2)}
              className="btn-primary w-full py-3"
            >
              Continuar →
            </button>
          </>
        )}

        {/* ── Step 2: Location & Budget ── */}
        {step === 2 && (
          <>
            <div className="card p-6 space-y-5">
              <h2 className="font-semibold text-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">2</span>
                Local, data e orçamento
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">
                    <MapPin size={14} className="inline mr-1" />Cidade *
                  </label>
                  <select className="input" value={form.city} onChange={e => set('city', e.target.value)}>
                    {CITIES_MZ.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Bairro</label>
                  <input className="input" value={form.neighbourhood}
                    onChange={e => set('neighbourhood', e.target.value)}
                    placeholder="Ex: Bairro 3" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  <Calendar size={14} className="inline mr-1" />Data pretendida *
                </label>
                <input
                  type="datetime-local" className="input"
                  value={form.scheduledDate}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => set('scheduledDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  <DollarSign size={14} className="inline mr-1" />Orçamento máximo (MT) *
                </label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-earth-50 border border-r-0 border-earth-100
                                   rounded-l-[var(--radius-btn)] text-sm font-semibold text-muted">MT</span>
                  <input
                    type="number" className="input rounded-l-none flex-1"
                    value={form.budget} min={500}
                    onChange={e => set('budget', e.target.value)}
                    placeholder="5000" required
                  />
                </div>
                <p className="text-xs text-muted mt-1">Mínimo: MT 500</p>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">
                ← Voltar
              </button>
              <button
                type="submit"
                disabled={loading || !form.city || !form.budget || !form.scheduledDate}
                className="btn-primary flex-[2] py-3"
              >
                {loading ? 'A publicar…' : '🚀 Publicar trabalho'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
