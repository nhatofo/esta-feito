import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ArrowRight, Briefcase, TrendingUp, Star, Clock } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import {
  formatCurrency, formatRelativeDate, translateCategory,
  UserRole,
} from '@esta-feito/shared';
import type { Job } from '@esta-feito/shared';
import { SERVICE_CATEGORIES } from '@esta-feito/shared';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', quoted: 'Com proposta', booked: 'Reservado',
  in_progress: 'Em curso', completed: 'Concluído',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  quoted: 'bg-blue-100 text-blue-700',
  booked: 'bg-brand-100 text-brand-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-earth-100 text-earth-700',
};

export default function HomeScreen() {
  const router    = useRouter();
  const { user }  = useAuthStore();
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isProvider = user?.role === UserRole.PROVIDER;

  async function loadJobs() {
    try {
      const endpoint = isProvider ? '/jobs/my/assigned' : '/jobs/my/posted';
      const res = await api.get(endpoint);
      setJobs(res.data.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { loadJobs(); }, []);

  const stats = isProvider
    ? [
        { icon: Briefcase,   label: 'Concluídos',    value: String((user as any)?.jobsCompleted ?? 0) },
        { icon: Star,        label: 'Avaliação',     value: `${(user as any)?.rating?.toFixed(1) ?? '—'} ★` },
        { icon: TrendingUp,  label: 'Total ganho',   value: formatCurrency((user as any)?.totalEarnings ?? 0) },
        { icon: Clock,       label: 'Em aberto',     value: String(jobs.filter(j => j.status === 'booked').length) },
      ]
    : [
        { icon: Briefcase,   label: 'Publicados',    value: String((user as any)?.jobsPosted ?? 0) },
        { icon: Clock,       label: 'Em curso',      value: String(jobs.filter(j => ['booked','in_progress'].includes(j.status)).length) },
        { icon: Star,        label: 'Concluídos',    value: String(jobs.filter(j => j.status === 'completed').length) },
        { icon: TrendingUp,  label: 'Total gasto',   value: formatCurrency((user as any)?.totalSpent ?? 0) },
      ];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadJobs(); }} tintColor="#f59e0b" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="font-display text-2xl text-ink">
              Olá, {user?.fullName.split(' ')[0]} 👋
            </Text>
            <Text className="text-muted text-sm mt-0.5">
              {isProvider ? 'Veja os seus trabalhos' : 'O que precisa hoje?'}
            </Text>
          </View>
          {!isProvider && (
            <TouchableOpacity
              onPress={() => router.push('/job/new')}
              className="bg-brand-500 rounded-btn px-4 py-2.5 flex-row items-center gap-1.5"
            >
              <Plus size={16} color="white" />
              <Text className="text-white text-sm font-body-semi">Publicar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Stats grid ── */}
        <View className="px-5 mt-4">
          <View className="flex-row flex-wrap gap-3">
            {stats.map(({ icon: Icon, label, value }) => (
              <View key={label} className="flex-1 min-w-[44%] bg-white rounded-card p-4 shadow-sm border border-earth-100/60">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-muted text-xs uppercase tracking-wide">{label}</Text>
                  <Icon size={16} color="#f59e0b" />
                </View>
                <Text className="font-display text-xl text-ink">{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Categories (customers only) ── */}
        {!isProvider && (
          <View className="mt-6 px-5">
            <Text className="font-display text-lg text-ink mb-3">Serviços</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              {SERVICE_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => router.push({ pathname: '/job/new', params: { category: cat.value } })}
                  className="items-center bg-white rounded-card px-4 py-3 mx-1 shadow-sm border border-earth-100/60 min-w-[80px]"
                >
                  <Text className="text-2xl mb-1">{cat.icon}</Text>
                  <Text className="text-xs text-ink font-body-semi text-center">{cat.labelPt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Recent jobs ── */}
        <View className="px-5 mt-6 pb-32">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-display text-lg text-ink">
              {isProvider ? 'Trabalhos atribuídos' : 'Trabalhos recentes'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/tabs/jobs')} className="flex-row items-center gap-1">
              <Text className="text-brand-600 text-sm font-body-semi">Ver todos</Text>
              <ArrowRight size={14} color="#d97706" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#f59e0b" size="large" />
            </View>
          ) : jobs.length === 0 ? (
            <View className="bg-white rounded-card p-8 items-center border border-earth-100/60">
              <Text className="text-4xl mb-3">🛠️</Text>
              <Text className="font-body-semi text-ink mb-1">Nenhum trabalho ainda</Text>
              <Text className="text-muted text-sm text-center mb-4">
                {isProvider ? 'Aguarde propostas de clientes.' : 'Publique o seu primeiro trabalho.'}
              </Text>
              {!isProvider && (
                <TouchableOpacity
                  onPress={() => router.push('/job/new')}
                  className="bg-brand-500 rounded-btn px-5 py-2.5"
                >
                  <Text className="text-white font-body-semi text-sm">Publicar trabalho</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="gap-3">
              {jobs.slice(0, 5).map(job => (
                <TouchableOpacity
                  key={job._id}
                  onPress={() => router.push({ pathname: '/job/[id]', params: { id: job._id } })}
                  className="bg-white rounded-card p-4 border border-earth-100/60 shadow-sm flex-row items-center gap-3"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center flex-shrink-0">
                    <Text className="text-lg">🛠️</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-body-semi text-ink text-sm" numberOfLines={1}>{job.title}</Text>
                    <Text className="text-muted text-xs mt-0.5">
                      {translateCategory(job.category)} · {job.address.city} · {formatRelativeDate(job.createdAt)}
                    </Text>
                  </View>
                  <View className="items-end gap-1 flex-shrink-0">
                    <View className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] ?? 'bg-earth-100 text-muted'}`}>
                      <Text className="text-xs font-body-semi">{STATUS_LABELS[job.status] ?? job.status}</Text>
                    </View>
                    <Text className="text-xs font-body-semi text-ink">
                      {formatCurrency(job.agreedPrice ?? job.budget)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
