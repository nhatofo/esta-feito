import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { normalizeMozPhone, isValidMozPhone, UserRole, APP_NAME } from '@esta-feito/shared';

type Step = 'phone' | 'otp' | 'register';

export default function LoginScreen() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep]       = useState<Step>('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole]       = useState<UserRole>(UserRole.CUSTOMER);
  const [loading, setLoading] = useState(false);
  const [isNew, setIsNew]     = useState(false);

  async function handlePhoneSubmit() {
    const normalized = normalizeMozPhone(phone);
    if (!isValidMozPhone(normalized)) {
      Alert.alert('Número inválido', 'Use o formato: 84XXXXXXX ou 86XXXXXXX');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/request-otp', { phone: normalized });
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Erro ao enviar OTP.');
    } finally { setLoading(false); }
  }

  async function handleOtpSubmit() {
    if (otp.length !== 6) { Alert.alert('Código incompleto', 'O OTP tem 6 dígitos.'); return; }
    setLoading(true);
    try {
      const normalized = normalizeMozPhone(phone);
      const res = await api.post('/auth/verify-otp', {
        phone: normalized, otp,
        ...(isNew ? { fullName, role } : {}),
      });
      await setAuth(res.data.data.user, res.data.data.tokens);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const msg = err.response?.data?.error ?? '';
      if (msg.includes('Nome completo')) { setStep('register'); }
      else Alert.alert('Erro', msg || 'OTP inválido.');
    } finally { setLoading(false); }
  }

  async function handleRegisterSubmit() {
    if (!fullName.trim()) { Alert.alert('Campo obrigatório', 'Insira o seu nome completo.'); return; }
    setLoading(true);
    try {
      const normalized = normalizeMozPhone(phone);
      const res = await api.post('/auth/verify-otp', { phone: normalized, otp, fullName, role });
      await setAuth(res.data.data.user, res.data.data.tokens);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Erro ao registar.');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-earth-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Glow */}
      <View className="absolute inset-0 opacity-20 bg-brand-500" style={{ borderRadius: 9999 }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="items-center mb-10">
          <Text className="font-display text-5xl text-brand-400 font-bold">{APP_NAME}</Text>
          <Text className="text-earth-100/60 text-sm mt-1">Serviços ao seu alcance</Text>
        </View>

        <View className="bg-white rounded-card p-6 shadow-xl">

          {/* ── Step: Phone ── */}
          {step === 'phone' && (
            <View className="space-y-5">
              <View>
                <Text className="font-display text-2xl text-ink mb-1">
                  {isNew ? 'Criar conta' : 'Entrar'}
                </Text>
                <Text className="text-muted text-sm">Enviaremos um código SMS</Text>
              </View>

              {/* Phone input */}
              <View>
                <Text className="text-sm font-body-semi text-ink mb-2">Número de telefone</Text>
                <View className="flex-row">
                  <View className="px-3 justify-center bg-earth-50 border border-r-0 border-earth-100 rounded-l-btn">
                    <Text className="text-sm text-muted font-mono">🇲🇿 +258</Text>
                  </View>
                  <TextInput
                    className="flex-1 border border-earth-100 rounded-r-btn px-4 py-3 text-ink text-sm"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="84 000 0000"
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handlePhoneSubmit}
                  />
                </View>
              </View>

              {/* Role selector (new users) */}
              {isNew && (
                <View>
                  <Text className="text-sm font-body-semi text-ink mb-2">Sou um</Text>
                  <View className="flex-row gap-3">
                    {[
                      { value: UserRole.CUSTOMER, label: '🏠 Cliente' },
                      { value: UserRole.PROVIDER, label: '🔧 Prestador' },
                    ].map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setRole(opt.value)}
                        className={`flex-1 py-3 rounded-btn border-2 items-center ${
                          role === opt.value ? 'border-brand-500 bg-brand-50' : 'border-earth-100'
                        }`}
                      >
                        <Text className={`text-sm font-body-semi ${role === opt.value ? 'text-brand-700' : 'text-ink'}`}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handlePhoneSubmit}
                disabled={loading}
                className="bg-brand-500 rounded-btn py-3.5 items-center flex-row justify-center gap-2"
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text className="text-white font-body-semi text-sm">Continuar →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsNew(!isNew)} className="items-center py-2">
                <Text className="text-muted text-sm">
                  {isNew ? 'Já tem conta? ' : 'Não tem conta? '}
                  <Text className="text-brand-600 font-body-semi">{isNew ? 'Entrar' : 'Registar'}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step: OTP ── */}
          {step === 'otp' && (
            <View className="space-y-5">
              <View>
                <Text className="font-display text-2xl text-ink mb-1">Verificar código</Text>
                <Text className="text-muted text-sm">
                  Código enviado para +258 {phone}
                </Text>
              </View>

              <View>
                <Text className="text-sm font-body-semi text-ink mb-2">Código OTP</Text>
                <TextInput
                  className="border border-earth-100 rounded-btn px-4 py-4 text-ink text-3xl
                             text-center tracking-widest font-mono"
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor="#78716c"
                />
              </View>

              <TouchableOpacity
                onPress={handleOtpSubmit}
                disabled={loading || otp.length < 6}
                className={`rounded-btn py-3.5 items-center ${otp.length === 6 ? 'bg-brand-500' : 'bg-earth-100'}`}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text className={`font-body-semi text-sm ${otp.length === 6 ? 'text-white' : 'text-muted'}`}>
                      Verificar
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); }} className="items-center py-2">
                <Text className="text-muted text-sm">← Alterar número</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step: Register ── */}
          {step === 'register' && (
            <View className="space-y-5">
              <View>
                <Text className="font-display text-2xl text-ink mb-1">Bem-vindo!</Text>
                <Text className="text-muted text-sm">Complete o seu registo</Text>
              </View>

              <View>
                <Text className="text-sm font-body-semi text-ink mb-2">Nome completo</Text>
                <TextInput
                  className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="João Machava"
                  autoCapitalize="words"
                />
              </View>

              <View>
                <Text className="text-sm font-body-semi text-ink mb-2">Função</Text>
                <View className="flex-row gap-3">
                  {[
                    { value: UserRole.CUSTOMER, label: '🏠 Cliente' },
                    { value: UserRole.PROVIDER, label: '🔧 Prestador' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value} onPress={() => setRole(opt.value)}
                      className={`flex-1 py-3 rounded-btn border-2 items-center ${
                        role === opt.value ? 'border-brand-500 bg-brand-50' : 'border-earth-100'
                      }`}
                    >
                      <Text className={`text-sm font-body-semi ${role === opt.value ? 'text-brand-700' : 'text-ink'}`}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRegisterSubmit}
                disabled={loading}
                className="bg-brand-500 rounded-btn py-3.5 items-center"
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text className="text-white font-body-semi text-sm">Criar conta</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
