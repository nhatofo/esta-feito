import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useAuthStore } from '../store/authStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import '../global.css';

function AppContent() {
  const { isAuthenticated, hydrated } = useAuthStore();
  const router   = useRouter();
  const segments = useSegments();

  usePushNotifications();

  useEffect(() => {
    if (!hydrated) return;
    const inAuthGroup = segments[0] === 'tabs' && segments[1] === 'login';
    if (!isAuthenticated && !inAuthGroup) router.replace('/tabs/login');
    else if (isAuthenticated && inAuthGroup) router.replace('/tabs/home');
  }, [isAuthenticated, hydrated, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="tabs/login" />
      <Stack.Screen name="tabs/home" />
      <Stack.Screen name="tabs/jobs" />
      <Stack.Screen name="tabs/explore" />
      <Stack.Screen name="tabs/reviews" />
      <Stack.Screen name="tabs/profile" />
      <Stack.Screen name="job/[id]" options={{ headerShown: true, title: 'Trabalho', headerBackTitle: 'Voltar', headerTintColor: '#d97706', headerStyle: { backgroundColor: '#ffffff' }, headerTitleStyle: { fontFamily: 'PlusJakartaSans_600SemiBold' } }} />
      <Stack.Screen name="job/new" />
      <Stack.Screen name="chat/[jobId]" />
    </Stack>
  );
}

export default function RootLayout() {
  const { hydrate } = useAuthStore();
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold, PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  useEffect(() => { hydrate(); }, []);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
