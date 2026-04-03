import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Search, MapPin, Star, Briefcase } from 'lucide-react-native';
import api from '../../lib/api';
import { SERVICE_CATEGORIES, translateCategory } from '@esta-feito/shared';

interface Provider {
  _id: string;
  fullName: string;
  rating: number;
  reviewCount: number;
  categories: string[];
  bio?: string;
  jobsCompleted: number;
  address?: { city: string };
}

export default function ExploreScreen() {
  const router = useRouter();
  const [providers, setProviders]   = useState<Provider[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [nearMe, setNearMe]         = useState(false);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = { limit: '30' };
      if (category) params.category = category;

      if (nearMe) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          params.lat    = String(loc.coords.latitude);
          params.lng    = String(loc.coords.longitude);
          params.radius = '15';
        }
      }

      const res = await api.get('/providers', { params });
      const data = res.data.data;
      setProviders(data.items ?? data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [category, nearMe]);

  useEffect(() => { load(); }, [load]);

  const filtered = providers.filter(p =>
    !search || p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <Text className="font-display text-2xl text-ink mb-3">Explorar prestadores</Text>

        {/* Search */}
        <View className="flex-row items-center bg-white border border-earth-100 rounded-btn px-3 gap-2 mb-3">
          <Search size={16} color="#78716c" />
          <TextInput
            className="flex-1 py-2.5 text-ink text-sm"
            value={search} onChangeText={setSearch}
            placeholder="Nome ou serviço…" placeholderTextColor="#78716c"
          />
        </View>

        {/* Near me toggle */}
        <TouchableOpacity
          onPress={() => setNearMe(!nearMe)}
          className={`flex-row items-center gap-2 self-start px-3 py-1.5 rounded-full border ${
            nearMe ? 'border-brand-500 bg-brand-50' : 'border-earth-100 bg-white'
          }`}
        >
          <MapPin size={14} color={nearMe ? '#d97706' : '#78716c'} />
          <Text className={`text-xs font-body-semi ${nearMe ? 'text-brand-700' : 'text-muted'}`}>
            {nearMe ? 'Perto de mim ✓' : 'Perto de mim'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <View className="pb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5">
          <TouchableOpacity
            onPress={() => setCategory('')}
            className={`mr-2 px-3 py-1.5 rounded-full border ${!category ? 'border-brand-500 bg-brand-50' : 'border-earth-100 bg-white'}`}
          >
            <Text className={`text-xs font-body-semi ${!category ? 'text-brand-700' : 'text-muted'}`}>Todos</Text>
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

      <ScrollView
        className="flex-1 px-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#f59e0b" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="py-10 items-center"><ActivityIndicator color="#f59e0b" size="large" /></View>
        ) : filtered.length === 0 ? (
          <View className="py-16 items-center">
            <Text className="text-4xl mb-3">👷</Text>
            <Text className="font-body-semi text-ink mb-1">Nenhum prestador encontrado</Text>
            <Text className="text-muted text-sm">Tente mudar a categoria ou desactive "Perto de mim".</Text>
          </View>
        ) : (
          <View className="gap-3 pb-32">
            {filtered.map(provider => (
              <TouchableOpacity
                key={provider._id}
                onPress={() => router.push({ pathname: '/job/new', params: {} })}
                className="bg-white rounded-card p-4 border border-earth-100/60 shadow-sm"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3 mb-2">
                  <View className="w-12 h-12 rounded-full bg-brand-100 items-center justify-center flex-shrink-0">
                    <Text className="font-display text-xl text-brand-700">
                      {provider.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-body-semi text-ink" numberOfLines={1}>{provider.fullName}</Text>
                    {provider.address && (
                      <View className="flex-row items-center gap-1">
                        <MapPin size={10} color="#78716c" />
                        <Text className="text-muted text-xs">{provider.address.city}</Text>
                      </View>
                    )}
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center gap-1">
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      <Text className="text-sm font-body-semi text-ink">{provider.rating.toFixed(1)}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Briefcase size={10} color="#78716c" />
                      <Text className="text-muted text-xs">{provider.jobsCompleted}</Text>
                    </View>
                  </View>
                </View>

                {provider.bio && (
                  <Text className="text-muted text-xs mb-2 leading-relaxed" numberOfLines={2}>{provider.bio}</Text>
                )}

                <View className="flex-row flex-wrap gap-1.5">
                  {provider.categories.slice(0, 3).map(cat => (
                    <View key={cat} className="px-2 py-0.5 rounded-full bg-brand-50">
                      <Text className="text-brand-700 text-xs font-body-semi">{translateCategory(cat)}</Text>
                    </View>
                  ))}
                  {provider.categories.length > 3 && (
                    <View className="px-2 py-0.5 rounded-full bg-earth-50">
                      <Text className="text-muted text-xs">+{provider.categories.length - 3}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
