import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { SERVICE_CATEGORIES, UserRole } from '@esta-feito/shared';
import { LogOut, Save, ChevronRight, Phone, MessageCircle, Star } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, clearAuth } = useAuthStore();
  const isProvider = user?.role === UserRole.PROVIDER;

  const [fullName, setFullName]   = useState(user?.fullName ?? '');
  const [whatsapp, setWhatsapp]   = useState(user?.whatsappNumber ?? '');
  const [bio, setBio]             = useState((user as any)?.bio ?? '');
  const [mpesa, setMpesa]         = useState((user as any)?.bankDetails?.mpesaNumber ?? '');
  const [emola, setEmola]         = useState((user as any)?.bankDetails?.emolaNumber ?? '');
  const [categories, setCategories] = useState<string[]>((user as any)?.categories ?? []);
  const [saving, setSaving]       = useState(false);

  function toggleCategory(cat: string) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { fullName, whatsappNumber: whatsapp };
      if (isProvider) {
        payload.bio = bio;
        payload.categories = categories;
        payload.bankDetails = { mpesaNumber: mpesa, emolaNumber: emola };
      }
      const res = await api.patch('/providers/me', payload);
      updateUser(res.data.data);
      Alert.alert('✓ Guardado', 'O seu perfil foi actualizado.');
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Não foi possível guardar.');
    } finally { setSaving(false); }
  }

  function handleLogout() {
    Alert.alert('Terminar sessão', 'Tem a certeza que quer sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => {
        await clearAuth();
        router.replace('/tabs/login');
      }},
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-32 gap-5">
          <Text className="font-display text-2xl text-ink">Perfil</Text>

          {/* Avatar card */}
          <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm items-center gap-3">
            <View className="w-20 h-20 rounded-full bg-brand-100 items-center justify-center">
              <Text className="font-display text-3xl text-brand-700">
                {user?.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="items-center">
              <Text className="font-body-semi text-ink text-lg">{user?.fullName}</Text>
              <Text className="text-muted text-sm capitalize">
                {user?.role === UserRole.PROVIDER ? 'Prestador' : 'Cliente'}
              </Text>
              {isProvider && (user as any)?.rating > 0 && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Star size={14} color="#f59e0b" fill="#f59e0b" />
                  <Text className="text-sm font-body-semi text-ink">{(user as any).rating.toFixed(1)}</Text>
                  <Text className="text-muted text-xs">({(user as any).reviewCount} avaliações)</Text>
                </View>
              )}
            </View>
          </View>

          {/* Basic info */}
          <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm gap-4">
            <Text className="font-body-semi text-ink">Informações básicas</Text>
            <View>
              <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">Nome completo</Text>
              <TextInput
                className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm"
                value={fullName} onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
            <View>
              <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">
                WhatsApp (pode diferir do telefone)
              </Text>
              <View className="flex-row">
                <View className="px-3 justify-center bg-earth-50 border border-r-0 border-earth-100 rounded-l-btn">
                  <Text className="text-muted text-sm">+258</Text>
                </View>
                <TextInput
                  className="flex-1 border border-earth-100 rounded-r-btn px-4 py-3 text-ink text-sm"
                  value={whatsapp} onChangeText={setWhatsapp}
                  placeholder="84 000 0000" keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Provider-specific */}
          {isProvider && (
            <>
              <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm gap-4">
                <Text className="font-body-semi text-ink">Perfil de prestador</Text>
                <View>
                  <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">Apresentação</Text>
                  <TextInput
                    className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm min-h-[90px]"
                    value={bio} onChangeText={setBio}
                    multiline textAlignVertical="top"
                    placeholder="Descreva a sua experiência…"
                    maxLength={500}
                  />
                </View>
                <View>
                  <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">Categorias</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {SERVICE_CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.value}
                        onPress={() => toggleCategory(cat.value)}
                        className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                          categories.includes(cat.value)
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-earth-100 bg-white'
                        }`}
                      >
                        <Text>{cat.icon}</Text>
                        <Text className={`text-xs font-body-semi ${
                          categories.includes(cat.value) ? 'text-brand-700' : 'text-muted'
                        }`}>{cat.labelPt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm gap-4">
                <Text className="font-body-semi text-ink">Dados de pagamento</Text>
                <View>
                  <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">📱 M-Pesa</Text>
                  <View className="flex-row">
                    <View className="px-3 justify-center bg-earth-50 border border-r-0 border-earth-100 rounded-l-btn">
                      <Text className="text-muted text-sm">+258</Text>
                    </View>
                    <TextInput
                      className="flex-1 border border-earth-100 rounded-r-btn px-4 py-3 text-ink text-sm"
                      value={mpesa} onChangeText={setMpesa}
                      placeholder="84/85 XXXXXXX" keyboardType="phone-pad"
                    />
                  </View>
                </View>
                <View>
                  <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">📲 eMola</Text>
                  <View className="flex-row">
                    <View className="px-3 justify-center bg-earth-50 border border-r-0 border-earth-100 rounded-l-btn">
                      <Text className="text-muted text-sm">+258</Text>
                    </View>
                    <TextInput
                      className="flex-1 border border-earth-100 rounded-r-btn px-4 py-3 text-ink text-sm"
                      value={emola} onChangeText={setEmola}
                      placeholder="86 XXXXXXX" keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-brand-500 rounded-card py-4 flex-row items-center justify-center gap-2"
          >
            {saving
              ? <ActivityIndicator color="white" size="small" />
              : <Text className="text-white font-body-semi">Guardar alterações</Text>
            }
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white rounded-card py-4 flex-row items-center justify-center gap-2
                       border border-red-100"
          >
            <LogOut size={18} color="#dc2626" />
            <Text className="text-red-600 font-body-semi">Terminar sessão</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
