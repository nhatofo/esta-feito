import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, MapPin, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import {
  formatCurrency, formatRelativeDate, translateCategory,
  UserRole,
} from '@esta-feito/shared';
import { SERVICE_CATEGORIES } from '@esta-feito/shared';
import type { Job } from '@esta-feito/shared';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  quoted: 'bg-blue-100 text-blue-700',
  booked: 'bg-brand-100 text-brand-700',
  completed: 'bg-earth-100 text-earth-700',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', quoted: 'Proposta', booked: 'Reservado', completed: 'Concluído',
};
const CATEGORY_ICONS: Record<string, string> = {
  plumbing:'🔧', cleaning:'🧹', electrical:'⚡', painting:'🖌️',
  moving:'📦', mining_equipment:'⛏️', carpentry:'🪚', security:'🔒',
  gardening:'🌿', other:'🛠️',
};

export default function JobsScreen() {
  const router     = useRouter();
  const { user }   = useAuthStore();
  const isProvider = user?.role === UserRole.PROVIDER;

  const [jobs, setJobs]             = useState<Job[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    try {
      const endpoint = isProvider ? '/jobs' : '/jobs/my/posted';
      const params: Record<string, string> = { limit: '30' };
      if (category) params.category = category;
      if (isProvider) params.status = 'open';
      const res = await api.get(endpoint, { params });
      const data = res.data.data;
      setJobs(Array.isArray(data) ? data : data?.items ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [isProvider, category]);

  useEffect(() => { load(); }, [load]);

  const filtered = jobs.filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Text className="font-display text-2xl text-ink">
          {isProvider ? 'Trabalhos' : 'Os meus trabalhos'}
        </Text>
        {!isProvider && (
          <TouchableOpacity
            onPress={() => router.push('/job/new')}
            className="bg-brand-500 rounded-btn px-4 py-2"
          >
            <Text className="text-white text-sm font-body-semi">+ Publicar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View className="px-5 pb-3 flex-row gap-2">
        <View className="flex-1 flex-row items-center bg-white border border-earth-100 rounded-btn px-3 gap-2">
          <Search size={16} color="#78716c" />
          <TextInput
            className="flex-1 py-2.5 text-ink text-sm"
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar…"
            placeholderTextColor="#78716c"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className={`w-11 h-11 rounded-btn border items-center justify-center ${
            showFilters || category ? 'border-brand-500 bg-brand-50' : 'border-earth-100 bg-white'
          }`}
        >
          <Filter size={18} color={showFilters || category ? '#d97706' : '#78716c'} />
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      {showFilters && (
        <View className="pb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5">
            <TouchableOpacity
              onPress={() => setCategory('')}
              className={`mr-2 px-3 py-1.5 rounded-full border ${
                !category ? 'border-brand-500 bg-brand-50' : 'border-earth-100 bg-white'
              }`}
            >
              <Text className={`text-xs font-body-semi ${!category ? 'text-brand-700' : 'text-muted'}`}>
                Todas
              </Text>
            </TouchableOpacity>
            {SERVICE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setCategory(category === cat.value ? '' : cat.value)}
                className={`mr-2 px-3 py-1.5 rounded-full border flex-row items-center gap-1 ${
                  category === cat.value ? 'border-brand-500 bg-brand-50' : 'border-earth-100 bg-white'
                }`}
              >
                <Text>{cat.icon}</Text>
                <Text className={`text-xs font-body-semi ${category === cat.value ? 'text-brand-700' : 'text-muted'}`}>
                  {cat.labelPt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* List */}
      <ScrollView
        className="flex-1 px-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#f59e0b" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="py-10 items-center">
            <ActivityIndicator color="#f59e0b" size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View className="py-16 items-center">
            <Text className="text-4xl mb-3">🔍</Text>
            <Text className="font-body-semi text-ink mb-1">Nenhum trabalho encontrado</Text>
            <Text className="text-muted text-sm text-center">
              {isProvider ? 'Tente mudar os filtros.' : 'Publique o seu primeiro trabalho.'}
            </Text>
          </View>
        ) : (
          <View className="gap-3 pb-32">
            {filtered.map(job => (
              <TouchableOpacity
                key={job._id}
                onPress={() => router.push({ pathname: '/job/[id]', params: { id: job._id } })}
                className="bg-white rounded-card p-4 border border-earth-100/60 shadow-sm flex-row items-center gap-3"
                activeOpacity={0.7}
              >
                <View className="w-12 h-12 rounded-xl bg-brand-50 items-center justify-center flex-shrink-0">
                  <Text className="text-2xl">{CATEGORY_ICONS[job.category] ?? '🛠️'}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="font-body-semi text-ink text-sm" numberOfLines={1}>{job.title}</Text>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <MapPin size={10} color="#78716c" />
                    <Text className="text-muted text-xs">
                      {job.address.city} · {translateCategory(job.category)} · {formatRelativeDate(job.createdAt)}
                    </Text>
                  </View>
                  {isProvider && job.quotes?.length > 0 && (
                    <Text className="text-brand-600 text-xs font-body-semi mt-0.5">
                      {job.quotes.length} proposta{job.quotes.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
                <View className="items-end gap-1.5 flex-shrink-0">
                  <View className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] ?? 'bg-earth-100'}`}>
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
      </ScrollView>
    </SafeAreaView>
  );
}
