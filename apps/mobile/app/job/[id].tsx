import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Calendar, CheckCircle, Clock, ExternalLink, Send } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import {
  formatCurrency, formatRelativeDate, translateCategory,
  UserRole, JobStatus, PaymentMethod,
} from '@esta-feito/shared';
import type { Job, Payment } from '@esta-feito/shared';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', quoted: 'Com proposta', booked: 'Reservado',
  in_progress: 'Em curso', completed: 'Concluído',
};
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  quoted: 'bg-blue-100 text-blue-700',
  booked: 'bg-brand-100 text-brand-700',
  completed: 'bg-earth-100 text-earth-700',
};

export default function JobDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const { user }  = useAuthStore();

  const [job, setJob]             = useState<Job | null>(null);
  const [payment, setPayment]     = useState<Payment | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payPhone, setPayPhone]   = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.MPESA);
  const [payLoading, setPayLoading] = useState(false);
  const [deepLinks, setDeepLinks] = useState<{ mpesa?: string; emola?: string } | null>(null);
  const [quoteAmt, setQuoteAmt]   = useState('');
  const [quoteMsg, setQuoteMsg]   = useState('');

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

  async function openWhatsApp() {
    if (!job?.whatsappDeepLink) return;
    const supported = await Linking.canOpenURL(job.whatsappDeepLink);
    if (supported) { await Linking.openURL(job.whatsappDeepLink); }
    else { Alert.alert('WhatsApp não instalado', 'Instale o WhatsApp para usar esta funcionalidade.'); }
  }

  async function initiatePayment() {
    if (!payPhone) { Alert.alert('Campo obrigatório', 'Insira o número de telefone.'); return; }
    setPayLoading(true);
    try {
      const res = await api.post('/payments/initiate', {
        jobId: id, method: payMethod, phoneNumber: payPhone,
      });
      setPayment(res.data.data.payment);
      setDeepLinks(res.data.data.deepLinks);
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Erro ao iniciar pagamento.');
    } finally { setPayLoading(false); }
  }

  async function openPaymentLink(url: string) {
    const supported = await Linking.canOpenURL(url);
    if (supported) { await Linking.openURL(url); }
    else {
      Alert.alert(
        'App não instalada',
        'A aplicação de pagamento não está instalada. Transfira-a na sua loja de aplicações.'
      );
    }
  }

  async function acceptQuote(quoteId: string) {
    setSubmitting(true);
    try {
      const res = await api.post(`/jobs/${id}/accept-quote`, { quoteId });
      setJob(res.data.data);
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Erro ao aceitar proposta.');
    } finally { setSubmitting(false); }
  }

  async function submitQuote() {
    if (!quoteAmt || !quoteMsg) { Alert.alert('Campos obrigatórios', 'Preencha o valor e a mensagem.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/jobs/${id}/quote`, { amount: parseInt(quoteAmt), message: quoteMsg });
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data.data);
      setQuoteAmt(''); setQuoteMsg('');
      Alert.alert('✓ Proposta enviada', 'O cliente foi notificado da sua proposta.');
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Erro ao enviar proposta.');
    } finally { setSubmitting(false); }
  }

  async function markComplete() {
    Alert.alert('Confirmar conclusão', 'Marcar este trabalho como concluído?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        setSubmitting(true);
        try {
          await api.patch(`/jobs/${id}/complete`);
          const res = await api.get(`/jobs/${id}`);
          setJob(res.data.data);
        } finally { setSubmitting(false); }
      }},
    ]);
  }

  if (loading) return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center">
      <ActivityIndicator size="large" color="#f59e0b" />
    </SafeAreaView>
  );

  if (!job) return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center px-8">
      <Text className="text-3xl mb-3">😕</Text>
      <Text className="font-body-semi text-ink mb-1">Trabalho não encontrado</Text>
      <TouchableOpacity onPress={() => router.back()} className="mt-4">
        <Text className="text-brand-600 font-body-semi">← Voltar</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3 bg-white border-b border-earth-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-lg">
          <ArrowLeft size={20} color="#78716c" />
        </TouchableOpacity>
        <Text className="font-display text-lg text-ink flex-1" numberOfLines={1}>{job.title}</Text>
        <View className={`px-2.5 py-1 rounded-full ${STATUS_COLORS[job.status] ?? 'bg-earth-100'}`}>
          <Text className="text-xs font-body-semi">{STATUS_LABELS[job.status] ?? job.status}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4 gap-4 pb-32">

          {/* ── Job details card ── */}
          <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm">
            <View className="flex-row justify-between items-start mb-3">
              <Text className="font-display text-xl text-ink flex-1 mr-4">{job.title}</Text>
              <View className="items-end">
                <Text className="text-xs text-muted">Orçamento</Text>
                <Text className="font-display text-lg text-ink">{formatCurrency(job.agreedPrice ?? job.budget)}</Text>
              </View>
            </View>
            <Text className="text-muted text-sm leading-relaxed mb-4">{job.description}</Text>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <MapPin size={14} color="#f59e0b" />
                <Text className="text-muted text-sm">{job.address.neighbourhood ? `${job.address.neighbourhood}, ` : ''}{job.address.city}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Calendar size={14} color="#f59e0b" />
                <Text className="text-muted text-sm">
                  {new Date(job.scheduledDate).toLocaleDateString('pt-MZ', { day:'2-digit', month:'long', year:'numeric' })}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-base">🛠️</Text>
                <Text className="text-muted text-sm">{translateCategory(job.category)}</Text>
              </View>
            </View>
          </View>

          {/* ── WhatsApp CTA ── */}
          {job.whatsappDeepLink && (
            <TouchableOpacity onPress={openWhatsApp} className="bg-[#25D366] rounded-card p-4 flex-row items-center justify-center gap-3">
              <Text className="text-2xl">💬</Text>
              <View>
                <Text className="text-white font-body-semi text-sm">Contactar via WhatsApp</Text>
                <Text className="text-white/70 text-xs">Mensagem pré-preenchida com detalhes do trabalho</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Payment section (customer, after booking) ── */}
          {isOwner && job.status === JobStatus.BOOKED && !payment && (
            <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm gap-4">
              <Text className="font-display text-lg text-ink">💳 Efectuar pagamento</Text>
              <Text className="text-muted text-sm">
                Valor: <Text className="font-body-semi text-ink">{formatCurrency(job.agreedPrice!)}</Text>
              </Text>

              {/* Method selector */}
              <View className="flex-row gap-3">
                {[
                  { value: PaymentMethod.MPESA, label: 'M-Pesa', emoji: '📱' },
                  { value: PaymentMethod.EMOLA, label: 'eMola',  emoji: '📲' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setPayMethod(opt.value)}
                    className={`flex-1 py-3 rounded-btn border-2 items-center flex-row justify-center gap-2 ${
                      payMethod === opt.value ? 'border-brand-500 bg-brand-50' : 'border-earth-100'
                    }`}
                  >
                    <Text className="text-base">{opt.emoji}</Text>
                    <Text className={`text-sm font-body-semi ${payMethod === opt.value ? 'text-brand-700' : 'text-ink'}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View>
                <Text className="text-sm font-body-semi text-ink mb-2">
                  Número {payMethod === PaymentMethod.MPESA ? 'M-Pesa' : 'eMola'}
                </Text>
                <View className="flex-row">
                  <View className="px-3 justify-center bg-earth-50 border border-r-0 border-earth-100 rounded-l-btn">
                    <Text className="text-muted text-sm">+258</Text>
                  </View>
                  <TextInput
                    className="flex-1 border border-earth-100 rounded-r-btn px-4 py-3 text-ink text-sm"
                    value={payPhone}
                    onChangeText={setPayPhone}
                    placeholder="84 000 0000"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={initiatePayment}
                disabled={payLoading}
                className={`rounded-btn py-3.5 items-center ${
                  payMethod === PaymentMethod.MPESA ? 'bg-[#e40612]' : 'bg-[#0066cc]'
                }`}
              >
                {payLoading
                  ? <ActivityIndicator color="white" />
                  : <Text className="text-white font-body-semi text-sm">
                      Pagar com {payMethod === PaymentMethod.MPESA ? 'M-Pesa' : 'eMola'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── Deep links (after payment initiation) ── */}
          {deepLinks && (
            <View className="bg-white rounded-card p-5 border-2 border-brand-200 gap-4">
              <View className="flex-row items-center gap-2">
                <CheckCircle size={20} color="#16a34a" />
                <Text className="font-body-semi text-green-700">Pagamento iniciado!</Text>
              </View>
              <Text className="text-muted text-sm">
                Verifique o seu telemóvel ou use os botões para abrir a aplicação de pagamento.
              </Text>
              {deepLinks.mpesa && (
                <TouchableOpacity
                  onPress={() => openPaymentLink(deepLinks.mpesa!)}
                  className="bg-[#e40612] rounded-btn py-3 flex-row items-center justify-center gap-2"
                >
                  <ExternalLink size={16} color="white" />
                  <Text className="text-white font-body-semi text-sm">Abrir M-Pesa</Text>
                </TouchableOpacity>
              )}
              {deepLinks.emola && (
                <TouchableOpacity
                  onPress={() => openPaymentLink(deepLinks.emola!)}
                  className="bg-[#0066cc] rounded-btn py-3 flex-row items-center justify-center gap-2"
                >
                  <ExternalLink size={16} color="white" />
                  <Text className="text-white font-body-semi text-sm">Abrir eMola</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Payment status badge ── */}
          {payment && (
            <View className={`rounded-card p-4 flex-row items-center gap-3 ${
              payment.status === 'completed' ? 'bg-green-50' : 'bg-brand-50'
            }`}>
              {payment.status === 'completed'
                ? <CheckCircle size={20} color="#16a34a" />
                : <Clock size={20} color="#d97706" />
              }
              <View>
                <Text className="font-body-semi text-sm text-ink">
                  {payment.status === 'completed' ? 'Pagamento confirmado ✓' : 'Pagamento pendente'}
                </Text>
                <Text className="text-muted text-xs">{formatCurrency(payment.amount)} · {payment.method.toUpperCase()}</Text>
              </View>
            </View>
          )}

          {/* ── Quotes list (customer) ── */}
          {isOwner && job.quotes?.length > 0 && (
            <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm gap-4">
              <Text className="font-display text-lg text-ink">Propostas ({job.quotes.length})</Text>
              {(job.quotes as any[]).map(q => (
                <View key={q._id} className="border border-earth-100 rounded-btn p-4 gap-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-9 h-9 rounded-full bg-brand-100 items-center justify-center">
                        <Text className="font-body-semi text-brand-700 text-sm">
                          {q.provider?.fullName?.charAt(0) ?? '?'}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-body-semi text-ink text-sm">{q.provider?.fullName}</Text>
                        <Text className="text-muted text-xs">⭐ {q.provider?.rating?.toFixed(1) ?? 'Novo'}</Text>
                      </View>
                    </View>
                    <Text className="font-body-semi text-ink">{formatCurrency(q.amount)}</Text>
                  </View>
                  <Text className="text-muted text-sm">{q.message}</Text>
                  {(job.status === JobStatus.OPEN || job.status === JobStatus.QUOTED) && (
                    <TouchableOpacity
                      onPress={() => acceptQuote(q._id)}
                      disabled={submitting}
                      className="bg-brand-500 rounded-btn py-2.5 items-center"
                    >
                      <Text className="text-white font-body-semi text-sm">✓ Aceitar proposta</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── Submit quote (provider) ── */}
          {isProvider && !isAssigned && job.status === JobStatus.OPEN && (
            <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm gap-4">
              <Text className="font-display text-lg text-ink">Enviar proposta</Text>
              <View>
                <Text className="text-sm font-body-semi text-ink mb-2">Valor (MT)</Text>
                <View className="flex-row">
                  <View className="px-3 justify-center bg-earth-50 border border-r-0 border-earth-100 rounded-l-btn">
                    <Text className="text-muted text-sm font-body-semi">MT</Text>
                  </View>
                  <TextInput
                    className="flex-1 border border-earth-100 rounded-r-btn px-4 py-3 text-ink text-sm"
                    value={quoteAmt} onChangeText={setQuoteAmt}
                    keyboardType="number-pad" placeholder="5000"
                  />
                </View>
              </View>
              <View>
                <Text className="text-sm font-body-semi text-ink mb-2">Mensagem</Text>
                <TextInput
                  className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm min-h-[90px]"
                  value={quoteMsg} onChangeText={setQuoteMsg}
                  multiline placeholder="Descreva a sua abordagem…"
                  textAlignVertical="top"
                />
              </View>
              <TouchableOpacity
                onPress={submitQuote} disabled={submitting}
                className="bg-brand-500 rounded-btn py-3.5 flex-row items-center justify-center gap-2"
              >
                {submitting ? <ActivityIndicator color="white" size="small" /> : (
                  <>
                    <Send size={16} color="white" />
                    <Text className="text-white font-body-semi text-sm">Enviar proposta</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Mark complete (provider) ── */}
          {isAssigned && job.status === JobStatus.BOOKED && (
            <TouchableOpacity
              onPress={markComplete} disabled={submitting}
              className="bg-green-600 rounded-card py-4 flex-row items-center justify-center gap-2"
            >
              <CheckCircle size={20} color="white" />
              <Text className="text-white font-body-semi">Marcar como concluído</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
