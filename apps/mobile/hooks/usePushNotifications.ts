// ─────────────────────────────────────────────
//  Esta Feito — usePushNotifications hook
//  Call once in the root layout after auth hydration
// ─────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener     = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications();

    // Received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Nothing extra needed — system shows the alert automatically
      console.log('Notification received:', notification.request.content.title);
    });

    // User tapped a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.jobId) {
        router.push({ pathname: '/job/[id]', params: { id: data.jobId } });
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);
}

async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    // Push notifications don't work in simulator — skip silently
    return;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // User declined — silently continue without push
    return;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Esta Feito',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f59e0b',
    });
  }

  // Get token and send to backend
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'YOUR_EAS_PROJECT_ID', // Replace with your EAS project ID
    });
    await api.patch('/providers/me', { expoPushToken: tokenData.data });
  } catch (err) {
    console.warn('Could not register push token:', err);
  }
}
