'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'next/navigation';
import { UserRole, formatCurrency } from '@esta-feito/shared';
import { Users, Briefcase, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Stats {
  users: number;
  jobs: number;
  payments: Array<{ _id: string; total: number; count: number }>;
}

interface PendingProvider {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  createdAt: string;
  idDocumentUrl?: string;
}

export default function AdminPage() {
  const { user }  = useAuthStore();
  const router    = useRouter();
  const [stats, setStats]       = useState<Stats | null>(null);
  const [pending, setPending]   = useState<PendingProvider[]>([]);
  const [loading, setLoading]   = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== UserRole.ADMIN) { router.replace('/dashboard'); return; }
    async function load() {
      try {
        const [statsRes, pendingRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/providers/pending'),
        ]);
        setStats(statsRes.data.data);
        setPending(pendingRes.data.data ?? []);
      } finally { setLoading(false); }
    }
    load();
  }, [user, router]);

  async function approve(providerId: string) {
    setApproving(providerId);
    try {
      await api.patch(`/admin/providers/${providerId}/approve`);
      setPending(prev => prev.filter(p => p._id !== providerId));
    } finally { setApproving(null); }
  }

  if (user?.role !== UserRole.ADMIN) return null;

  const completedPayments = stats?.payments.find(p => p._id === 'completed');
  const pendingPayments   = stats?.payments.find(p => p._id === 'pending');

  const statCards = [
    { icon: Users,       label: 'Total utilizadores',  value: stats?.users ?? '—',       color: 'text-blue-600',  bg: 'bg-blue-50' },
    { icon: Briefcase,   label: 'Total trabalhos',      value: stats?.jobs ?? '—',        color: 'text-brand-600', bg: 'bg-brand-50' },
    { icon: DollarSign,  label: 'Volume processado',    value: completedPayments ? formatCurrency(completedPayments.total) : 'MT 0', color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Clock,       label: 'Pagamentos pendentes', value: pendingPayments?.count ?? 0, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-display text-3xl text-ink">Painel de Administração</h1>
        <p className="text-muted text-sm mt-1">Visão geral da plataforma Esta Feito</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
            <p className="font-display text-2xl text-ink mt-1">{loading ? '…' : value}</p>
          </div>
        ))}
      </div>

      {/* Pending provider approvals */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display text-xl text-ink">Prestadores pendentes</h2>
          {pending.length > 0 && (
            <span className="badge bg-orange-100 text-orange-700">{pending.length}</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="card p-5 h-20 animate-pulse bg-earth-50" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="card p-10 text-center">
            <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-ink">Nenhum prestador pendente</p>
            <p className="text-muted text-sm mt-1">Todos os prestadores foram aprovados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(provider => (
              <div key={provider._id} className="card p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center
                                  font-bold text-brand-700 flex-shrink-0">
                    {provider.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{provider.fullName}</p>
                    <p className="text-xs text-muted">{provider.phone}</p>
                    {provider.email && <p className="text-xs text-muted">{provider.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {provider.idDocumentUrl && (
                    <a
                      href={provider.idDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Ver BI
                    </a>
                  )}
                  <button
                    onClick={() => approve(provider._id)}
                    disabled={approving === provider._id}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {approving === provider._id ? 'A aprovar…' : '✓ Aprovar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment breakdown */}
      {stats?.payments && stats.payments.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-ink mb-4">Pagamentos por estado</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-earth-100 bg-earth-50">
                  <th className="text-left px-5 py-3 font-semibold text-muted">Estado</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted">Quantidade</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted">Volume Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-earth-100">
                {stats.payments.map(p => (
                  <tr key={p._id} className="hover:bg-earth-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-ink capitalize">{p._id}</td>
                    <td className="px-5 py-3 text-right text-muted">{p.count}</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink">{formatCurrency(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
