'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { SERVICE_CATEGORIES, CITIES_MZ, SEARCH_RADIUS_OPTIONS } from '@esta-feito/shared';
import { translateCategory } from '@esta-feito/shared';
import { Search, Star, MapPin, Briefcase, Filter, SlidersHorizontal } from 'lucide-react';

interface Provider {
  _id: string;
  fullName: string;
  avatarUrl?: string;
  rating: number;
  reviewCount: number;
  categories: string[];
  bio?: string;
  yearsExperience?: number;
  jobsCompleted: number;
  address?: { city: string; neighbourhood?: string };
}

export default function ProvidersPage() {
  const [providers, setProviders]   = useState<Provider[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [city, setCity]             = useState('');
  const [radius, setRadius]         = useState(10);
  const [useGeo, setUseGeo]         = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Request geolocation
  function requestGeo() {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseGeo(true);
      },
      () => alert('Não foi possível obter a sua localização.')
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '30' };
      if (category) params.category = category;
      if (city)     params.city     = city;
      if (useGeo && userCoords) {
        params.lat    = String(userCoords.lat);
        params.lng    = String(userCoords.lng);
        params.radius = String(radius);
      }
      const res = await api.get('/providers', { params });
      const data = res.data.data;
      setProviders(data.items ?? data ?? []);
      setTotal(data.total ?? (data.items ?? data).length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [category, city, useGeo, userCoords, radius]);

  useEffect(() => { load(); }, [load]);

  const filtered = providers.filter(p =>
    !search || p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.categories.some(c => translateCategory(c).toLowerCase().includes(search.toLowerCase()))
  );

  function StarRating({ rating }: { rating: number }) {
    return (
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => (
          <Star
            key={i}
            size={12}
            className={i <= Math.round(rating) ? 'text-brand-500 fill-brand-500' : 'text-earth-100'}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Prestadores</h1>
        <p className="text-muted text-sm mt-1">{total} prestador{total !== 1 ? 'es' : ''} disponível{total !== 1 ? 'is' : ''}</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Nome ou serviço…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary gap-2 ${showFilters ? 'border-brand-500 text-brand-600' : ''}`}
        >
          <SlidersHorizontal size={16} /> Filtros
        </button>
        <button
          onClick={useGeo ? () => setUseGeo(false) : requestGeo}
          className={`btn-secondary gap-2 ${useGeo ? 'border-brand-500 text-brand-600 bg-brand-50' : ''}`}
        >
          <MapPin size={16} /> {useGeo ? `${radius}km` : 'Perto de mim'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Categoria</label>
            <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {SERVICE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.labelPt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Cidade</label>
            <select className="input" value={city} onChange={e => setCity(e.target.value)}>
              <option value="">Todas</option>
              {CITIES_MZ.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {useGeo && (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Raio</label>
              <select className="input" value={radius} onChange={e => setRadius(Number(e.target.value))}>
                {SEARCH_RADIUS_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
              </select>
            </div>
          )}
          <button onClick={() => { setCategory(''); setCity(''); setUseGeo(false); }} className="btn-secondary text-sm">
            Limpar filtros
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-full bg-earth-100" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-earth-100 rounded w-3/4" />
                  <div className="h-3 bg-earth-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-12 bg-earth-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-6xl mb-4">👷</div>
          <h3 className="font-display text-xl text-ink mb-2">Nenhum prestador encontrado</h3>
          <p className="text-muted text-sm">Tente alterar a categoria ou a cidade.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(provider => (
            <Link
              key={provider._id}
              href={`/dashboard/providers/${provider._id}`}
              className="card p-5 hover:shadow-[var(--shadow-float)] hover:-translate-y-1 transition-all duration-200 group"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden bg-brand-100
                                flex items-center justify-center text-xl font-bold text-brand-700 shadow-sm">
                  {provider.avatarUrl
                    ? <img src={provider.avatarUrl} alt={provider.fullName} className="w-full h-full object-cover" />
                    : provider.fullName.charAt(0).toUpperCase()
                  }
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink group-hover:text-brand-700 transition-colors truncate">
                    {provider.fullName}
                  </p>
                  {provider.address && (
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {provider.address.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <StarRating rating={provider.rating} />
                <span className="text-xs font-semibold text-ink">{provider.rating.toFixed(1)}</span>
                <span className="text-xs text-muted">({provider.reviewCount})</span>
                <span className="ml-auto text-xs text-muted flex items-center gap-1">
                  <Briefcase size={10} /> {provider.jobsCompleted} trabalhos
                </span>
              </div>

              {/* Bio */}
              {provider.bio && (
                <p className="text-xs text-muted mb-3 line-clamp-2 leading-relaxed">{provider.bio}</p>
              )}

              {/* Categories */}
              <div className="flex flex-wrap gap-1.5">
                {provider.categories.slice(0, 3).map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                             bg-brand-50 text-brand-700 text-xs font-semibold">
                    {translateCategory(cat)}
                  </span>
                ))}
                {provider.categories.length > 3 && (
                  <span className="px-2 py-0.5 rounded-full bg-earth-50 text-muted text-xs">
                    +{provider.categories.length - 3}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
