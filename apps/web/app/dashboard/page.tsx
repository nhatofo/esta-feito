'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import {
  formatCurrency, formatRelativeDate, translateCategory,
  UserRole,
} from '@esta-feito/shared';
import type { Job } from '@esta-feito/shared';
import { Briefcase, Star, TrendingUp, Clock, Plus, ArrowRight } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', quoted: 'Com proposta', booked: 'Reservado',
  in_progress: 'Em curso', completed: 'Concluído', cancelled: 'Cancelado',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const isProvider = user?.role === UserRole.PROVIDER;

  useEffect(() => {
    async function load() {
      try {
        const endpoint = isProvider ? '/jobs/my/assigned' : '/jobs/my/posted';
        const res = await api.get(endpoint);
        setJobs(res.data.data ?? []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, [isProvider]);

  const stats = isProvider
    ? [
        { icon: Briefcase,  label: 'Trabalhos feitos',  value: (user as any)?.jobsCompleted ?? 0 },
        { icon: Star,       label: 'Avaliação média',   value: `${(user as any)?.rating?.toFixed(1) ?? '—'} ★` },
        { icon: TrendingUp, label: 'Total ganho',       value: formatCurrency((user as any)?.totalEarnings ?? 0) },
        { icon: Clock,      label: 'Em aberto',         value: jobs.filter(j => j.status === 'booked').length },
      ]
    : [
        { icon: Briefcase,  label: 'Trabalhos publicados', value: (user as any)?.jobsPosted ?? 0 },
        { icon: Clock,      label: 'Em curso',             value: jobs.filter(j => ['booked','in_progress'].includes(j.status)).length },
        { icon: Star,       label: 'Concluídos',           value: jobs.filter(j => j.status === 'completed').length },
        { icon: TrendingUp, label: 'Total gasto',          value: formatCurrency((user as any)?.totalSpent ?? 0) },
      ];

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">
            Olá, {user?.fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-muted mt-1">
            {isProvider ? 'Veja os seus trabalhos e ganhos' : 'O que precisa hoje?'}
          </p>
        </div>
        {!isProvider && (
          <Link href="/dashboard/jobs/new" className="btn-primary hidden md:flex">
            <Plus size={16} /> Publicar trabalho
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">{label}</span>
              <Icon size={18} className="text-brand-500" />
            </div>
            <p className="font-display text-2xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-ink">
            {isProvider ? 'Trabalhos atribuídos' : 'Trabalhos recentes'}
          </h2>
          <Link href="/dashboard/jobs" className="text-sm text-brand-600 font-semibold flex items-center gap-1 hover:underline">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-earth-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-earth-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-3">🛠️</div>
            <p className="font-semibold text-ink mb-1">Nenhum trabalho ainda</p>
            <p className="text-muted text-sm mb-4">
              {isProvider ? 'Aguarde propostas ou navegue trabalhos disponíveis.' : 'Publique o seu primeiro trabalho agora.'}
            </p>
            {!isProvider && (
              <Link href="/dashboard/jobs/new" className="btn-primary">
                <Plus size={16} /> Publicar trabalho
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job) => (
              <Link
                key={job._id}
                href={`/dashboard/jobs/${job._id}`}
                className="card p-5 flex items-center justify-between hover:shadow-[var(--shadow-float)]
                           transition-all duration-200 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 text-xl">
                    {translateCategory(job.category) === 'Canalização' ? '🔧' :
                     translateCategory(job.category) === 'Limpeza' ? '🧹' :
                     translateCategory(job.category) === 'Electricidade' ? '⚡' : '🛠️'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-sm truncate group-hover:text-brand-700 transition-colors">
                      {job.title}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {translateCategory(job.category)} · {job.address.city} · {formatRelativeDate(job.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`badge badge-${job.status}`}>
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {formatCurrency(job.agreedPrice ?? job.budget)}
                  </span>
                  <ArrowRight size={16} className="text-muted group-hover:text-brand-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
