'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { useAuthStore } from '../../../../store/authStore';
import {
  formatCurrency, formatRelativeDate, translateCategory,
  UserRole, JobStatus, PaymentMethod,
} from '@esta-feito/shared';
import type { Job, Payment } from '@esta-feito/shared';
import {
  ArrowLeft, MessageCircle, Phone, Star, CheckCircle,
  Clock, MapPin, Calendar, ExternalLink, Send,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', quoted: 'Com proposta', booked: 'Reservado',
  in_progress: 'Em curso', completed: 'Concluído', cancelled: 'Cancelado',
};

export default function JobDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const { user }  = useAuthStore();
  const [job, setJob]         = useState<Job | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteMsg, setQuoteMsg]   = useState('');
  const [quoteAmt, setQuoteAmt]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payPhone, setPayPhone]   = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.MPESA);
  const [payLoading, setPayLoading] = useState(false);
  const [deepLinks, setDeepLinks] = useState<{ mpesa?: string; emola?: string } | null>(null);
  const [chatMsg, setChatMsg]   = useState('');

  const isCustomer  = user?.role === UserRole.CUSTOMER;
  const isProvider  = user?.role === UserRole.PROVIDER;
  const isOwner     = isCustomer && job?.customer && (job.customer as any)._id === user?._id;
  const isAssigned  = isProvider && job?.provider && (job.provider as any)._id === user?._id;

  useEffect(() => {
    async function load() {
      try {
        const [jobRes, payRes] = await Promise.allSettled([
          api.get(`/jobs/${id}`),
          api.get(`/payments/${id}`),
        ]);
        if (jobRes.status === 'fulfilled') setJob(jobRes.value.data.data);
        if (payRes.status === 'fulfilled') setPayment(payRes.value.data.data);
      } finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/jobs/${id}/quote`, { amount: parseInt(quoteAmt), message: quoteMsg });
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data.data);
      setQuoteMsg(''); setQuoteAmt('');
    } finally { setSubmitting(false); }
  }

  async function acceptQuote(quoteId: string) {
    setSubmitting(true);
    try {
      const res = await api.post(`/jobs/${id}/accept-quote`, { quoteId });
      setJob(res.data.data);
    } finally { setSubmitting(false); }
  }

  async function initiatePayment(e: React.FormEvent) {
    e.preventDefault();
    setPayLoading(true);
    try {
      const res = await api.post('/payments/initiate', {
        jobId: id, method: payMethod, phoneNumber: payPhone,
      });
      setPayment(res.data.data.payment);
      setDeepLinks(res.data.data.deepLinks);
    } finally { setPayLoading(false); }
  }

  async function markComplete() {
    setSubmitting(true);
    try {
      await api.patch(`/jobs/${id}/complete`);
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data.data);
    } finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
      {[1,2,3].map(i => <div key={i} className="card p-6 h-32 bg-earth-50" />)}
    </div>
  );

  if (!job) return (
    <div className="text-center py-20">
      <p className="text-muted">Trabalho não encontrado.</p>
      <button onClick={() => router.back()} className="btn-secondary mt-4">Voltar</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 md:pb-8">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-ink text-sm">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* ── Job header ── */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className={`badge badge-${job.status} mb-2`}>{STATUS_LABELS[job.status]}</span>
            <h1 className="font-display text-2xl text-ink">{job.title}</h1>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted">Orçamento</p>
            <p className="font-display text-xl font-bold text-ink">
              {formatCurrency(job.agreedPrice ?? job.budget)}
            </p>
          </div>
        </div>

        <p className="text-muted text-sm leading-relaxed mb-4">{job.description}</p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <MapPin size={14} className="text-brand-500" />
            {job.address.neighbourhood ? `${job.address.neighbourhood}, ` : ''}{job.address.city}
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Calendar size={14} className="text-brand-500" />
            {new Date(job.scheduledDate).toLocaleDateString('pt-MZ', { day:'2-digit', month:'long', year:'numeric' })}
          </div>
          <div className="flex items-center gap-2 text-muted">
            <span className="text-base">{SERVICE_CATEGORIES_ICONS[job.category] ?? '🛠️'}</span>
            {translateCategory(job.category)}
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Clock size={14} className="text-brand-500" />
            {formatRelativeDate(job.createdAt)}
          </div>
        </div>

        {/* Photos */}
        {job.photos?.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {job.photos.map((p, i) => (
              <img key={i} src={p.url} alt="" className="w-20 h-20 object-cover rounded-lg border border-earth-100" />
            ))}
          </div>
        )}
      </div>

      {/* ── WhatsApp CTA (after booking) ── */}
      {job.status !== JobStatus.OPEN && job.whatsappDeepLink && (
        <a href={job.whatsappDeepLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp w-full py-3 justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.561 4.14 1.535 5.874L0 24l6.316-1.511A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.032-1.384l-.36-.214-3.742.897.933-3.649-.235-.374A9.778 9.778 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
          Contactar via WhatsApp
        </a>
      )}

      {/* ── Payment section ── */}
      {isOwner && job.status === JobStatus.BOOKED && !payment && (
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-lg text-ink">💳 Efectuar pagamento</h2>
          <p className="text-muted text-sm">
            Valor a pagar: <strong className="text-ink">{formatCurrency(job.agreedPrice!)}</strong>
            {' '}(comissão 15%: {formatCurrency(job.agreedPrice! * 0.15)})
          </p>

          <form onSubmit={initiatePayment} className="space-y-4">
            {/* Method selector */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: PaymentMethod.MPESA, label: 'M-Pesa', color: 'bg-[#e40612]', emoji: '📱' },
                { value: PaymentMethod.EMOLA, label: 'eMola',  color: 'bg-[#0066cc]', emoji: '📲' },
              ].map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => setPayMethod(opt.value)}
                  className={`flex items-center gap-2 p-3 rounded-[var(--radius-btn)] border-2 text-sm font-semibold transition-all ${
                    payMethod === opt.value ? 'border-brand-500 bg-brand-50' : 'border-earth-100'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">
                Número {payMethod === PaymentMethod.MPESA ? 'M-Pesa' : 'eMola'}
              </label>
              <div className="flex">
                <span className="flex items-center px-3 bg-earth-50 border border-r-0 border-earth-100
                                 rounded-l-[var(--radius-btn)] text-sm text-muted">+258</span>
                <input
                  className="input rounded-l-none flex-1"
                  value={payPhone} onChange={e => setPayPhone(e.target.value)}
                  placeholder="84 000 0000" inputMode="numeric" required
                />
              </div>
            </div>

            <button
              type="submit" disabled={payLoading}
              className={payMethod === PaymentMethod.MPESA ? 'btn-mpesa w-full py-3' : 'btn-emola w-full py-3'}
            >
              {payLoading ? 'A processar…' : `Pagar com ${payMethod === PaymentMethod.MPESA ? 'M-Pesa' : 'eMola'}`}
            </button>
          </form>
        </div>
      )}

      {/* Payment deep links (after initiation) */}
      {deepLinks && (
        <div className="card p-6 border-2 border-brand-200 space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle size={20} />
            <h3 className="font-semibold">Pagamento iniciado!</h3>
          </div>
          <p className="text-sm text-muted">
            Verifique o seu telemóvel para aprovar o pagamento, ou use os links abaixo para abrir a aplicação.
          </p>
          <div className="flex flex-col gap-2">
            {deepLinks.mpesa && (
              <a href={deepLinks.mpesa} className="btn-mpesa justify-center">
                <ExternalLink size={16} /> Abrir M-Pesa
              </a>
            )}
            {deepLinks.emola && (
              <a href={deepLinks.emola} className="btn-emola justify-center">
                <ExternalLink size={16} /> Abrir eMola
              </a>
            )}
          </div>
        </div>
      )}

      {/* Payment status */}
      {payment && (
        <div className={`card p-4 flex items-center gap-3 ${
          payment.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-brand-50 border-brand-200'
        } border`}>
          {payment.status === 'completed'
            ? <CheckCircle size={20} className="text-green-600" />
            : <Clock size={20} className="text-brand-600" />
          }
          <div>
            <p className="font-semibold text-sm">
              {payment.status === 'completed' ? 'Pagamento confirmado ✓' : 'Pagamento pendente'}
            </p>
            <p className="text-xs text-muted">{formatCurrency(payment.amount)} · {payment.method.toUpperCase()}</p>
          </div>
        </div>
      )}

      {/* ── Quotes (customer view) ── */}
      {isOwner && job.status !== JobStatus.COMPLETED && job.quotes?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display text-lg text-ink mb-4">
            Propostas recebidas ({job.quotes.length})
          </h2>
          <div className="space-y-4">
            {job.quotes.map((q: any) => (
              <div key={q._id} className="border border-earth-100 rounded-[var(--radius-btn)] p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center
                                    font-bold text-brand-700 text-sm">
                      {q.provider?.fullName?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-ink">{q.provider?.fullName}</p>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <Star size={11} className="text-brand-500 fill-brand-500" />
                        {q.provider?.rating?.toFixed(1) ?? 'Novo'} · {q.provider?.reviewCount ?? 0} avaliações
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-ink">{formatCurrency(q.amount)}</p>
                    {q.estimatedDuration && <p className="text-xs text-muted">{q.estimatedDuration}</p>}
                  </div>
                </div>
                <p className="text-sm text-muted mb-3">{q.message}</p>
                {job.status === JobStatus.OPEN || job.status === JobStatus.QUOTED ? (
                  <button
                    onClick={() => acceptQuote(q._id)}
                    disabled={submitting}
                    className="btn-primary w-full py-2 text-sm"
                  >
                    {submitting ? 'A aceitar…' : '✓ Aceitar proposta'}
                  </button>
                ) : (
                  job.provider && (job.provider as any)._id === q.provider?._id && (
                    <span className="badge badge-booked">Proposta aceite</span>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Submit quote (provider view) ── */}
      {isProvider && !isAssigned && job.status === JobStatus.OPEN && (
        <div className="card p-6">
          <h2 className="font-display text-lg text-ink mb-4">Enviar proposta</h2>
          <form onSubmit={submitQuote} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Valor (MT) *</label>
              <div className="flex">
                <span className="flex items-center px-3 bg-earth-50 border border-r-0 border-earth-100
                                 rounded-l-[var(--radius-btn)] text-sm text-muted font-semibold">MT</span>
                <input type="number" className="input rounded-l-none" value={quoteAmt}
                  onChange={e => setQuoteAmt(e.target.value)} min={500} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Duração estimada</label>
              <input className="input" value={''} placeholder="Ex: 2 horas, 1 dia" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Mensagem *</label>
              <textarea className="input min-h-[90px] resize-none" value={quoteMsg}
                onChange={e => setQuoteMsg(e.target.value)}
                placeholder="Descreva a sua experiência e abordagem…" required />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
              <Send size={16} /> {submitting ? 'A enviar…' : 'Enviar proposta'}
            </button>
          </form>
        </div>
      )}

      {/* ── Mark complete (provider) ── */}
      {isAssigned && job.status === JobStatus.BOOKED && (
        <button onClick={markComplete} disabled={submitting} className="btn-primary w-full py-3">
          <CheckCircle size={16} /> {submitting ? 'A marcar…' : 'Marcar como concluído'}
        </button>
      )}
    </div>
  );
}

const SERVICE_CATEGORIES_ICONS: Record<string, string> = {
  plumbing:'🔧', cleaning:'🧹', electrical:'⚡', painting:'🖌️',
  moving:'📦', mining_equipment:'⛏️', carpentry:'🪚', security:'🔒',
  gardening:'🌿', other:'🛠️',
};
