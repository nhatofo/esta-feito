import { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ArrowLeft, Camera, CheckCircle, MapPin } from 'lucide-react-native';
import api from '../../lib/api';
import { SERVICE_CATEGORIES, CITIES_MZ } from '@esta-feito/shared';

export default function NewJobScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams<{ category?: string }>();

  const [step, setStep]           = useState<1 | 2 | 3>(1);
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [category, setCategory]   = useState(params.category ?? '');
  const [city, setCity]           = useState('Tete');
  const [neighbourhood, setNeigh] = useState('');
  const [budget, setBudget]       = useState('');
  const [scheduledDate, setDate]  = useState('');
  const [photos, setPhotos]       = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);

  async function pickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5,
    });
    if (!result.canceled) setPhotos(result.assets.map(a => a.uri));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      let coords = { latitude: -16.1564, longitude: 33.5867 }; // Tete default
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }

      // Upload photos
      let uploadedPhotos: Array<{ url: string; publicId: string }> = [];
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((uri, i) => {
          formData.append('files', { uri, name: `photo_${i}.jpg`, type: 'image/jpeg' } as any);
        });
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPhotos = uploadRes.data.data;
      }

      await api.post('/jobs', {
        title, description, category,
        budget: parseInt(budget),
        scheduledDate: new Date(scheduledDate).toISOString(),
        photos: uploadedPhotos,
        address: {
          neighbourhood,
          city,
          province: city === 'Maputo' ? 'Maputo Cidade' : 'Tete',
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      });

      setStep(3);
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Não foi possível publicar o trabalho.');
    } finally { setLoading(false); }
  }

  // Success screen
  if (step === 3) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
          <CheckCircle size={40} color="#16a34a" />
        </View>
        <Text className="font-display text-3xl text-ink text-center mb-3">Trabalho publicado!</Text>
        <Text className="text-muted text-sm text-center mb-8 leading-relaxed">
          Os prestadores próximos serão notificados e enviarão propostas em breve.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/tabs/jobs')}
          className="bg-brand-500 rounded-card px-8 py-4 w-full items-center mb-3"
        >
          <Text className="text-white font-body-semi">Ver os meus trabalhos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setStep(1); setTitle(''); setDesc(''); setCategory(''); setBudget(''); setDate(''); setPhotos([]); }}
          className="bg-white rounded-card px-8 py-4 w-full items-center border border-earth-100"
        >
          <Text className="text-ink font-body-semi">Publicar outro trabalho</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 py-3 bg-white border-b border-earth-100">
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)} className="p-2 rounded-lg">
          <ArrowLeft size={20} color="#78716c" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-body-semi text-ink">Publicar trabalho</Text>
          <Text className="text-muted text-xs">Passo {step} de 2</Text>
        </View>
      </View>

      {/* Progress */}
      <View className="flex-row gap-2 px-5 py-3">
        <View className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-brand-500' : 'bg-earth-100'}`} />
        <View className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-brand-500' : 'bg-earth-100'}`} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="gap-5 py-4 pb-32">

            {/* ── Step 1 ── */}
            {step === 1 && (
              <>
                <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm gap-4">
                  <Text className="font-body-semi text-ink">Detalhes do trabalho</Text>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">Título *</Text>
                    <TextInput
                      className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm"
                      value={title} onChangeText={setTitle}
                      placeholder="Ex: Reparar torneira na cozinha"
                      maxLength={100}
                    />
                  </View>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">Categoria *</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {SERVICE_CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat.value}
                          onPress={() => setCategory(cat.value)}
                          className={`flex-row items-center gap-1.5 px-3 py-2 rounded-btn border ${
                            category === cat.value
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-earth-100 bg-white'
                          }`}
                        >
                          <Text>{cat.icon}</Text>
                          <Text className={`text-xs font-body-semi ${
                            category === cat.value ? 'text-brand-700' : 'text-muted'
                          }`}>{cat.labelPt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">Descrição *</Text>
                    <TextInput
                      className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm min-h-[100px]"
                      value={description} onChangeText={setDesc}
                      multiline textAlignVertical="top"
                      placeholder="Descreva o trabalho com o máximo de detalhe…"
                      maxLength={1000}
                    />
                    <Text className="text-xs text-muted text-right mt-1">{description.length}/1000</Text>
                  </View>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">
                      Fotos (opcional)
                    </Text>
                    <TouchableOpacity
                      onPress={pickPhotos}
                      className="border-2 border-dashed border-earth-100 rounded-card p-5 items-center gap-2"
                    >
                      <Camera size={24} color="#78716c" />
                      <Text className="text-muted text-sm">Seleccionar fotos (máx. 5)</Text>
                    </TouchableOpacity>
                    {photos.length > 0 && (
                      <Text className="text-brand-600 text-xs mt-2 font-body-semi">
                        {photos.length} foto{photos.length !== 1 ? 's' : ''} seleccionada{photos.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setStep(2)}
                  disabled={!title || !category || !description}
                  className={`rounded-card py-4 items-center ${
                    title && category && description ? 'bg-brand-500' : 'bg-earth-100'
                  }`}
                >
                  <Text className={`font-body-semi ${title && category && description ? 'text-white' : 'text-muted'}`}>
                    Continuar →
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <>
                <View className="bg-white rounded-card p-5 border border-earth-100/60 shadow-sm gap-4">
                  <Text className="font-body-semi text-ink">Local, data e orçamento</Text>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">
                      <MapPin size={10} /> Cidade *
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {CITIES_MZ.slice(0, 6).map(c => (
                        <TouchableOpacity
                          key={c} onPress={() => setCity(c)}
                          className={`px-3 py-2 rounded-btn border ${
                            city === c ? 'border-brand-500 bg-brand-50' : 'border-earth-100'
                          }`}
                        >
                          <Text className={`text-xs font-body-semi ${city === c ? 'text-brand-700' : 'text-muted'}`}>
                            {c}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">Bairro</Text>
                    <TextInput
                      className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm"
                      value={neighbourhood} onChangeText={setNeigh}
                      placeholder="Ex: Bairro 3"
                    />
                  </View>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">
                      Data pretendida * (AAAA-MM-DD HH:MM)
                    </Text>
                    <TextInput
                      className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm"
                      value={scheduledDate} onChangeText={setDate}
                      placeholder="2026-04-15 09:00"
                    />
                  </View>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">
                      Orçamento máximo (MT) *
                    </Text>
                    <View className="flex-row">
                      <View className="px-3 justify-center bg-earth-50 border border-r-0 border-earth-100 rounded-l-btn">
                        <Text className="text-muted text-sm font-body-semi">MT</Text>
                      </View>
                      <TextInput
                        className="flex-1 border border-earth-100 rounded-r-btn px-4 py-3 text-ink text-sm"
                        value={budget} onChangeText={setBudget}
                        keyboardType="number-pad" placeholder="5000"
                      />
                    </View>
                    <Text className="text-xs text-muted mt-1">Mínimo: MT 500</Text>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    className="flex-1 bg-white rounded-card py-4 items-center border border-earth-100"
                  >
                    <Text className="text-ink font-body-semi">← Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading || !city || !budget || !scheduledDate}
                    className={`flex-[2] rounded-card py-4 items-center ${
                      !loading && city && budget && scheduledDate ? 'bg-brand-500' : 'bg-earth-100'
                    }`}
                  >
                    {loading
                      ? <ActivityIndicator color="white" size="small" />
                      : <Text className={`font-body-semi ${city && budget && scheduledDate ? 'text-white' : 'text-muted'}`}>
                          🚀 Publicar trabalho
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
