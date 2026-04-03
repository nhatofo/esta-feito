'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import {
  formatCurrency, formatRelativeDate, translateCategory,
  UserRole,
} from '@esta-feito/shared';
import { SERVICE_CATEGORIES, CITIES_MZ } from '@esta-feito/shared';
import type { Job } from '@esta-feito/shared';
import { Plus, Search, Filter, MapPin, ArrowRight } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', quoted: 'Com proposta', booked: 'Reservado',
  in_progress: 'Em curso', completed: 'Concluído', cancelled: 'Cancelado',
};

const CATEGORY_ICONS: Record<string, string> = {
  plumbing:'🔧', cleaning:'🧹', electrical:'⚡', painting:'🖌️',
  moving:'📦', mining_equipment:'⛏️', carpentry:'🪚', security:'🔒',
  gardening:'🌿', other:'🛠️',
};

export default function JobsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isProvider = user?.role === UserRole.PROVIDER;

  const [jobs, setJobs]           = useState<Job[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState(searchParams.get('category') ?? '');
  const [city, setCity]           = useState('');
  const [status, setStatus]       = useState(isProvider ? 'open' : '');
  const [showFilters, setShowFilters] = useState(false);

  const loadJobs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const endpoint = isProvider ? '/jobs' : '/jobs/my/posted';
      const params: Record<string, string> = { page: String(p), limit: '20' };
      if (category) params.category = category;
      if (city)     params.city     = city;
      if (status)   params.status   = status;
      const res = await api.get(endpoint, { params });
      const data = res.data.data;
      const items = Array.isArray(data) ? data : data?.items ?? [];
      setJobs(p === 1 ? items : prev => [...prev, ...items]);
      setTotal(Array.isArray(data) ? items.length : data?.total ?? items.length);
      setPage(p);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isProvider, category, city, status]);

  useEffect(() => { loadJobs(1); }, [loadJobs]);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">
            {isProvider ? 'Trabalhos disponíveis' : 'Os meus trabalhos'}
          </h1>
          <p className="text-muted text-sm mt-1">{total} trabalho{total !== 1 ? 's' : ''}</p>
        </div>
        {!isProvider && (
          <Link href="/dashboard/jobs/new" className="btn-primary hidden md:flex">
            <Plus size={16} /> Publicar trabalho
          </Link>
        )}
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Pesquisar trabalhos…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary gap-2 ${showFilters ? 'border-brand-500 text-brand-600' : ''}`}
        >
          <Filter size={16} /> Filtros
          {(category || city || status) && (
            <span className="w-2 h-2 rounded-full bg-brand-500" />
          )}
        </button>
        {!isProvider && (
          <Link href="/dashboard/jobs/new" className="btn-primary md:hidden">
            <Plus size={16} />
          </Link>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Categoria
            </label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {SERVICE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.labelPt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Cidade
            </label>
            <select className="input" value={city} onChange={e => setCity(e.target.value)}>
              <option value="">Todas</option>
              {CITIES_MZ.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              Estado
            </label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button onClick={() => { setCategory(''); setCity(''); setStatus(isProvider ? 'open' : ''); }} className="btn-secondary text-sm">
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* Jobs list */}
      {loading && jobs.length === 0 ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-earth-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-earth-100 rounded w-2/3" />
                  <div className="h-3 bg-earth-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="font-display text-xl text-ink mb-2">Nenhum trabalho encontrado</h3>
          <p className="text-muted text-sm mb-6">
            {isProvider ? 'Tente alterar os filtros de pesquisa.' : 'Publique o seu primeiro trabalho.'}
          </p>
          {!isProvider && (
            <Link href="/dashboard/jobs/new" className="btn-primary">
              <Plus size={16} /> Publicar trabalho
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {jobs
              .filter(j => !search || j.title.toLowerCase().includes(search.toLowerCase()))
              .map(job => (
                <Link
                  key={job._id}
                  href={`/dashboard/jobs/${job._id}`}
                  className="card p-5 flex items-center gap-4 hover:shadow-[var(--shadow-float)]
                             hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center
                                  flex-shrink-0 text-2xl group-hover:bg-brand-100 transition-colors">
                    {CATEGORY_ICONS[job.category] ?? '🛠️'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-ink text-sm truncate group-hover:text-brand-700 transition-colors">
                        {job.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {job.address.city}
                      </span>
                      <span>{translateCategory(job.category)}</span>
                      <span>{formatRelativeDate(job.createdAt)}</span>
                      {job.quotes?.length > 0 && (
                        <span className="text-brand-600 font-semibold">
                          {job.quotes.length} proposta{job.quotes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold text-ink text-sm">
                        {formatCurrency(job.agreedPrice ?? job.budget)}
                      </p>
                      <span className={`badge badge-${job.status} text-xs`}>
                        {STATUS_LABELS[job.status]}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-muted group-hover:text-brand-500 transition-colors" />
                  </div>
                </Link>
              ))}
          </div>

          {/* Load more */}
          {jobs.length < total && (
            <div className="text-center">
              <button
                onClick={() => loadJobs(page + 1)}
                disabled={loading}
                className="btn-secondary px-8"
              >
                {loading ? 'A carregar…' : 'Ver mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
